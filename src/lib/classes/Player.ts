export type PlayerFailure = {
  source?: AudioBufferSourceNode
  player?: Player
  error?: unknown
}

export type PlayerParams = {
  ctx?: AudioContext
  volume?: number
  volumeScale?: number
  pan?: number
  reverse?: boolean
  loop?: boolean
  drift?: number
  playbackRate?: number
  startTime?: number
  onLoaded?: (msg?: string) => void
  onPlay?: () => void
  onEnded?: (msg?: string, manualStop?: boolean) => void
  onFail?: (msg: string, data?: PlayerFailure) => void
}

let sharedContext: AudioContext | null = null

/**
 * Every player shares one context unless it is handed its own.
 * Browsers cap contexts per document (6 in Chrome) and nothing in here can know
 * when the last player has gone away, so a lazily created singleton is the only
 * shape that survives a page that builds players over its lifetime.
 */
const getSharedContext = (): AudioContext => {
  if (typeof AudioContext === 'undefined') {
    throw new Error(
      'banger: no AudioContext in this environment (SSR?) - construct players in the browser, or pass `ctx`',
    )
  }
  if (!sharedContext) sharedContext = new AudioContext()
  return sharedContext
}

export class Player {
  ctx: AudioContext
  source: AudioBufferSourceNode | null

  gainNode: GainNode
  panNode: StereoPannerNode
  filterNode: BiquadFilterNode

  volumeScale: number
  reverse: boolean
  loop: boolean
  drift: number
  loading?: boolean
  playing: boolean
  /** an AudioBufferSourceNode can only be started once - true once this one has */
  started: boolean
  manualStop: boolean
  playbackRate: number
  startTime: number
  onLoaded?: (msg?: string) => void
  onEnded?: (msg?: string, manualStop?: boolean) => void
  onPlay?: () => void
  onFail: (msg: string, data?: PlayerFailure) => void

  /**
   * To be used as a subclasss for wrapper classes
   * the `handleX` are to be used by the parent classes as per the requirements
   */
  constructor(params: PlayerParams) {
    this.reverse = params.reverse ?? false
    this.loop = params.loop ?? false
    this.drift = params.drift ?? 0 // cents
    this.ctx = params.ctx ?? getSharedContext()
    this.source = null
    this.playing = false
    this.started = false
    this.manualStop = false
    this.playbackRate = params.playbackRate ?? 1
    this.startTime = params.startTime ?? 0
    this.volumeScale = params.volumeScale ?? 1

    this.onLoaded = params.onLoaded
    this.onFail = params.onFail ?? ((msg, data) => console.error(msg, data))
    this.onPlay = params.onPlay
    this.onEnded = params.onEnded

    this.gainNode = this.ctx.createGain()
    this.gainNode.gain.value = params.volume ?? 1

    this.panNode = new StereoPannerNode(this.ctx, { pan: params.pan ?? 0 })
    this.filterNode = new BiquadFilterNode(this.ctx, {
      type: 'lowpass',
      frequency: 20000, // open by default - the filter is always in the chain
      Q: 1,
    })

    // built once, so every subclass shares one topology and loadSource only
    // has to hang the new source off the head of it
    this.gainNode
      .connect(this.panNode)
      .connect(this.filterNode)
      .connect(this.ctx.destination)
  }

  handleCutoff = (hz: number, q?: number) => {
    this.filterNode.frequency.value = hz
    if (q) this.filterNode.Q.value = q
  }

  handlePause = () => {
    if (!this.playing) return

    this.source?.stop()
  }

  handleVolume = (value: number) => {
    this.gainNode.gain.value = Math.max(value, 0)
  }

  handlePan = (value: number) => {
    this.panNode.pan.value = value
  }

  handleStop = () => {
    if (!this.playing) return

    this.source?.stop()
    this.playing = false
  }

  handlePlay = (at = this.startTime) => {
    if (!this.source) {
      this.onFail('Audio not loaded', { player: this })
      return
    }

    if (this.loading) {
      this.onFail('Source is loading!', { source: this.source })
      return
    }

    if (this.started) {
      this.onFail('Source already played - call loadSource() first', {
        source: this.source,
      })
      return
    }

    // a context built outside a user gesture is born suspended; start() still
    // schedules correctly and the sound lands when the resume does
    if (this.ctx.state === 'suspended') void this.ctx.resume()

    this.source.detune.value = 2 * (Math.random() - 0.5) * this.drift
    this.source.playbackRate.value = this.playbackRate
    this.source.start(0, at)
    this.started = true
    this.playing = true
    this.onPlay?.()
  }

  setVolume = (value: number) => this.handleVolume(value)
  setPan = (value: number) => this.handlePan(value)
  setCutoff = (hz: number, q?: number) => this.handleCutoff(hz, q)
  setPlaybackRate = (value: number) => {
    this.playbackRate = value
    if (this.playing && this.source) this.source.playbackRate.value = value
  }

  /**
   * Release the audio graph. The shared context is left open on purpose -
   * other players are on it. A context passed in as `ctx` is the caller's to close.
   */
  dispose = () => {
    this.handleStop()
    this.source?.disconnect()
    this.source = null
    this.gainNode.disconnect()
    this.panNode.disconnect()
    this.filterNode.disconnect()
  }
}
