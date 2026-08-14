/* Minimal Web Audio stand-in - enough of the graph for the players to run in
 * node. `ended` is dispatched asynchronously, like a real browser, because the
 * pause/stop paths depend on that ordering. */

export class FakeParam {
  constructor(public value = 0) {}
}

export class FakeNode {
  connections: FakeNode[] = []
  connect(next: any) {
    this.connections.push(next)
    return next
  }
  disconnect() {
    this.connections = []
  }
}

export class FakeSource extends FakeNode {
  buffer: any = null
  loop = false
  detune = new FakeParam(0)
  playbackRate = new FakeParam(1)
  startCount = 0
  startOffset: number | null = null
  stopped = false
  private listeners: (() => void)[] = []

  start(_when = 0, offset = 0) {
    if (this.startCount > 0) {
      throw new Error(
        "InvalidStateError: cannot call start more than once on 'AudioBufferSourceNode'",
      )
    }
    this.startCount++
    this.startOffset = offset
  }

  stop() {
    if (this.startCount === 0) throw new Error('InvalidStateError: not started')
    this.stopped = true
    this.end()
  }

  /** fire the ended event the way the browser does - on a later turn */
  end() {
    queueMicrotask(() => this.listeners.forEach((fn) => fn()))
  }

  addEventListener(type: string, fn: () => void) {
    if (type === 'ended') this.listeners.push(fn)
  }
}

export class FakeGain extends FakeNode {
  gain = new FakeParam(1)
}

export class FakeStereoPanner extends FakeNode {
  pan = new FakeParam(0)
  constructor(_ctx: unknown, opts?: { pan?: number }) {
    super()
    this.pan.value = opts?.pan ?? 0
  }
}

export class FakeBiquadFilter extends FakeNode {
  type = 'lowpass'
  frequency = new FakeParam(350)
  Q = new FakeParam(1)
  constructor(
    _ctx: unknown,
    opts?: { type?: string; frequency?: number; Q?: number },
  ) {
    super()
    if (opts?.type) this.type = opts.type
    this.frequency.value = opts?.frequency ?? 350
    this.Q.value = opts?.Q ?? 1
  }
}

export class FakeAudioBuffer {
  numberOfChannels = 1
  length = 4
  private channels: Float32Array[]
  constructor(
    public duration = 10,
    samples = [1, 2, 3, 4],
  ) {
    this.channels = [Float32Array.from(samples)]
    this.length = samples.length
  }
  getChannelData(i: number) {
    return this.channels[i]
  }
}

export class FakeAudioContext {
  currentTime = 0
  state: 'suspended' | 'running' | 'closed' = 'running'
  destination = new FakeNode()
  sources: FakeSource[] = []
  decodedInputs: ArrayBuffer[] = []
  resumeCount = 0
  decodeShouldFail = false
  bufferDuration = 10

  createGain() {
    return new FakeGain()
  }

  createBufferSource() {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }

  async decodeAudioData(buffer: ArrayBuffer) {
    this.decodedInputs.push(buffer)
    if (this.decodeShouldFail) throw new Error('EncodingError')
    return new FakeAudioBuffer(this.bufferDuration) as unknown as AudioBuffer
  }

  async resume() {
    this.resumeCount++
    this.state = 'running'
  }

  async close() {
    this.state = 'closed'
  }

  get lastSource() {
    return this.sources[this.sources.length - 1]
  }
}

export const installAudioGlobals = () => {
  const g = globalThis as any
  g.StereoPannerNode = FakeStereoPanner
  g.BiquadFilterNode = FakeBiquadFilter
  g.AudioContext = FakeAudioContext
}

/** let queued microtasks (the `ended` events) run */
export const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

export const fakeCtx = () => new FakeAudioContext() as unknown as AudioContext
