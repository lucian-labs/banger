import { IBanger } from '..'
import { Player, PlayerParams } from './Player'

export type BangerParams<T = Record<string, any>> = PlayerParams & {
  arrayBuffer: ArrayBuffer | null
  name: string
  /**
   * one shot for the life of the player - the spent source is never replaced,
   * so every play() after the first sound has gone out is a no-op
   */
  single?: boolean
  metadata?: T
}

export class Banger<T = Record<string, any>> extends Player implements IBanger {
  audioBuffer?: AudioBuffer | null
  name: string
  single?: boolean
  loading = true
  metadata?: T

  /**
   * Used for single-shot monophonic sounds (shorter sounds)
   * cannot play mmore than one sound at a time
   * For songs, recommend the 'Looper'
   *
   * Looper and MultiBanger inherit from here.
   */
  constructor(params: BangerParams<T>) {
    super(params)
    this.name = params.name
    this.single = params.single
    this.metadata = params.metadata

    if (!params.arrayBuffer) {
      this.loading = false
      this.onFail(`Banger ${this.name}: no array buffer found!`, {
        player: this,
      })
      return
    }

    // decodeAudioData detaches what it is handed, so copy - the caller's buffer
    // stays usable and can be given to another player
    this.ctx
      .decodeAudioData(params.arrayBuffer.slice(0))
      .then((audioBuffer) => {
        this.audioBuffer = audioBuffer
        if (this.reverse) this.reverseBuffer()
        this.loadSource()
        this.onLoaded?.()
      })
      .catch((error) => {
        this.loading = false
        this.onFail(`Banger ${this.name}: could not decode audio data`, {
          player: this,
          error,
        })
      })
  }

  /**
   * Reverse playback is a buffer operation - a negative playbackRate renders
   * silence rather than walking the samples backwards.
   * (not `private` - the spatial mixin's declaration emit cannot name it)
   */
  reverseBuffer = () => {
    if (!this.audioBuffer) return

    for (let c = 0; c < this.audioBuffer.numberOfChannels; c++) {
      this.audioBuffer.getChannelData(c).reverse()
    }
  }

  handleReverse = (reverse = !this.reverse) => {
    if (reverse === this.reverse) return

    this.reverse = reverse
    this.reverseBuffer()
    this.handleStop() // a running voice still holds the old sample order
    this.loadSource()
  }

  loadSource = () => {
    // the single guard lives here so every rebuild path (play, stop, pause,
    // reverse) honours it - a spent one-shot stays spent
    if (this.single && this.started) return

    if (!this.audioBuffer) {
      this.onFail(`Banger ${this.name}: no audio buffer found!`, {
        player: this,
      })
      return
    }

    this.loading = true
    const source = this.ctx.createBufferSource()
    source.buffer = this.audioBuffer
    source.loop = this.loop

    source.addEventListener('ended', () => {
      // stop() / pause() replace the source before this fires; the old node's
      // event is not an ending, it is the tail of a rebuild
      if (this.source !== source) return

      this.playing = false
      this.onEnded?.(`onEnded -> ${this.name}`, this.manualStop)
    })

    source.connect(this.gainNode)

    this.source = source
    this.started = false
    this.loading = false
  }

  stop = () => {
    this.manualStop = true
    this.handleStop()
  }

  play = () => {
    if (this.playing) return
    // silent rather than onFail - a spent one-shot is the asked-for state
    if (this.single && this.started) return

    this.manualStop = false
    if (this.started) this.loadSource() // the spent node cannot be restarted
    this.handlePlay()
  }
}
