import { IBanger } from '..'
import { Player, PlayerParams } from './Player'

export type MultiBangerProps = PlayerParams & {
  name: string
  arrayBuffers: ArrayBuffer[]
  debug?: boolean
}

export class MultiBanger extends Player implements IBanger {
  name: string
  audioBuffers: AudioBuffer[]
  loading = true
  debug: boolean

  /** every voice this bank has started and not yet heard end */
  private voices: AudioBufferSourceNode[] = []

  /**
   * Used for playing libraries of similar SHORT sounds
   * For single sounds, use Banger
   * For long sounds / music, use Looper
   *
   */
  constructor(params: MultiBangerProps) {
    super(params)
    this.name = params.name
    this.audioBuffers = []
    this.debug = params.debug ?? false

    this.init(params.arrayBuffers)
  }

  init = async (arrayBuffers: ArrayBuffer[]) => {
    const decoded = await Promise.all(
      arrayBuffers.map(async (buff) => {
        try {
          // copy: decodeAudioData detaches its input, and the caller may still
          // want the buffer
          return await this.ctx.decodeAudioData(buff.slice(0))
        } catch (error) {
          // one bad buffer must not poison the whole bank
          this.onFail(`MultiBanger ${this.name}: could not decode a buffer`, {
            player: this,
            error,
          })
          return null
        }
      }),
    )

    this.audioBuffers = decoded.filter((buff): buff is AudioBuffer => !!buff)

    if (!this.audioBuffers.length) {
      this.loading = false
      this.onFail(`MultiBanger ${this.name}: no buffers decoded`, {
        player: this,
      })
      return
    }

    this.loadSource()
    this.onLoaded?.(`Soundbank: ${this.name} loaded!`)
  }

  private loadSource = () => {
    if (!this.audioBuffers.length) return

    const source = this.ctx.createBufferSource()
    const i = Math.floor(Math.random() * this.audioBuffers.length)

    if (this.debug) {
      console.log('this.source', i, this.audioBuffers.length)
    }

    source.buffer = this.audioBuffers[i]
    source.addEventListener('ended', () => {
      this.voices = this.voices.filter((voice) => voice !== source)
      this.playing = this.voices.length > 0
      this.onEnded?.(`onEnded -> ${this.name}`, this.manualStop)
    })
    source.connect(this.gainNode)

    this.source = source
    this.started = false
    this.loading = false
  }

  handleStop = () => {
    for (const voice of this.voices) voice.stop()
    this.voices = []
    this.playing = false
  }

  stop = () => {
    this.manualStop = true
    this.handleStop()
  }

  play = () => {
    this.manualStop = false

    const voice = this.source
    this.handlePlay()
    // handlePlay only flips `started` if the voice actually went out
    if (voice && this.started) this.voices.push(voice)

    this.loadSource()
  }
}
