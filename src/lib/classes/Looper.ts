import { Banger, BangerParams } from './Banger'

export type LooperParams = BangerParams & {
  loop?: boolean
}

export class Looper extends Banger {
  paused: boolean
  startedAt: number
  pausedAt: number

  /**
   * Wrapper fro Banger
   *
   * Used for longer sounds and songs
   * For short sounds, use Banger
   */
  constructor(params: LooperParams) {
    // loops by default, but `loop: false` is honoured
    super({ ...params, loop: params.loop ?? true })
    this.paused = false
    this.pausedAt = this.startTime
    this.startedAt = 0
  }

  get state() {
    const duration = this.source?.buffer?.duration ?? 0
    // ctx.currentTime is the context clock, not the playhead - startedAt is the
    // track's virtual zero
    const position = this.playing
      ? this.ctx.currentTime - this.startedAt
      : this.pausedAt

    return {
      playing: this.playing,
      startedAt: this.startedAt,
      gain: this.gainNode,
      pan: this.panNode,
      pausedAt: this.pausedAt,
      length: duration,
      state: this.ctx.state,
      bufferLength: this.source?.buffer?.length,
      timeLength: duration,
      currentTime: this.ctx.currentTime,
      position,
      u: duration ? (position % duration) / duration : 0,
    }
  }

  pause = () => {
    if (!this.playing) return

    this.manualStop = true
    this.pausedAt = this.ctx.currentTime - this.startedAt
    this.handlePause()
    this.playing = false
    this.paused = true
    this.loadSource() // the stopped node cannot be started again
    this.onEnded?.(`paused -> ${this.name}`, true)
  }

  stop = () => {
    const wasActive = this.playing || this.paused

    this.manualStop = true
    this.handleStop()
    this.paused = false
    this.pausedAt = this.startTime
    this.startedAt = 0
    this.loadSource()
    if (wasActive) this.onEnded?.(`stopped -> ${this.name}`, true)
  }

  play = () => {
    // a single looper gets one run - it never restarts a live voice and never
    // replaces a spent one, so pause() ends up as final as stop()
    if (this.single && this.started) return

    if (this.playing || this.started) {
      // a voice is running (restart) or the last one is spent - either way the
      // node has to be replaced, and neither case is a resume
      this.handleStop()
      this.pausedAt = this.startTime
      this.loadSource()
    }

    this.manualStop = false
    this.handlePlay(this.pausedAt)
    this.paused = false
    this.startedAt = this.ctx.currentTime - this.pausedAt
  }
}
