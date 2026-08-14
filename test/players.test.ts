import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeAudioContext, installAudioGlobals, tick } from './audio-mock'
import { Banger } from '../src/lib/classes/Banger'
import { Looper } from '../src/lib/classes/Looper'
import { MultiBanger } from '../src/lib/classes/MultiBanger'
import { SpatialBanger } from '../src/lib/classes/SpatialPlayer'

installAudioGlobals()

const ctxOf = (player: { ctx: AudioContext }) =>
  player.ctx as unknown as FakeAudioContext

const buffer = () => new ArrayBuffer(8)

const makeBanger = async (params: Record<string, unknown> = {}) => {
  const ctx = new FakeAudioContext()
  const banger = new Banger({
    name: 'kick',
    arrayBuffer: buffer(),
    ctx: ctx as unknown as AudioContext,
    ...params,
  })
  await tick()
  return banger
}

const makeLooper = async (params: Record<string, unknown> = {}) => {
  const ctx = new FakeAudioContext()
  const looper = new Looper({
    name: 'song',
    arrayBuffer: buffer(),
    ctx: ctx as unknown as AudioContext,
    ...params,
  })
  await tick()
  return looper
}

describe('Player', () => {
  it('shares one AudioContext across players that are not given one', () => {
    const a = new Banger({ name: 'a', arrayBuffer: buffer() })
    const b = new Banger({ name: 'b', arrayBuffer: buffer() })
    expect(a.ctx).toBe(b.ctx)
  })

  it('keeps a playbackRate of 0 instead of coercing it to 1', async () => {
    const banger = await makeBanger({ playbackRate: 0 })
    expect(banger.playbackRate).toBe(0)
  })

  it('resumes a suspended context on play', async () => {
    const banger = await makeBanger()
    const ctx = ctxOf(banger)
    ctx.state = 'suspended'
    banger.play()
    expect(ctx.resumeCount).toBe(1)
  })

  it('defaults onFail to console.error rather than requiring it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const banger = new Banger({ name: 'nope', arrayBuffer: null })
    expect(banger.loading).toBe(false)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('Banger', () => {
  it('can play again after the sound has ended', async () => {
    const banger = await makeBanger()
    banger.play()
    ctxOf(banger).lastSource.end()
    await tick()

    expect(banger.playing).toBe(false)
    expect(() => banger.play()).not.toThrow()
    expect(banger.playing).toBe(true)
  })

  it('spends a single banger for good, quietly', async () => {
    const onFail = vi.fn()
    const banger = await makeBanger({ single: true, onFail })
    const ctx = ctxOf(banger)
    banger.play()
    const built = ctx.sources.length
    ctx.lastSource.end()
    await tick()

    banger.play()
    expect(banger.playing).toBe(false)
    expect(ctx.sources.length).toBe(built) // no replacement node
    expect(onFail).not.toHaveBeenCalled()
  })

  it('reports decode failures through onFail and stops loading', async () => {
    const ctx = new FakeAudioContext()
    ctx.decodeShouldFail = true
    const onFail = vi.fn()
    const banger = new Banger({
      name: 'broken',
      arrayBuffer: buffer(),
      ctx: ctx as unknown as AudioContext,
      onFail,
    })
    await tick()

    expect(banger.loading).toBe(false)
    expect(onFail).toHaveBeenCalledOnce()
  })

  it('copies the caller buffer so it can be handed to a second player', async () => {
    const ctx = new FakeAudioContext()
    const arrayBuffer = buffer()
    new Banger({
      name: 'a',
      arrayBuffer,
      ctx: ctx as unknown as AudioContext,
    })
    await tick()

    expect(ctx.decodedInputs[0]).not.toBe(arrayBuffer)
  })

  it('routes through the filter node', async () => {
    const banger = await makeBanger()
    expect(banger.gainNode.connections).toContain(banger.panNode)
    expect(banger.panNode.connections).toContain(banger.filterNode)
  })

  it('reports a natural end as manualStop false, a stop as true', async () => {
    const onEnded = vi.fn()
    const banger = await makeBanger({ onEnded })
    banger.play()
    ctxOf(banger).lastSource.end()
    await tick()
    expect(onEnded).toHaveBeenLastCalledWith(expect.any(String), false)

    banger.play()
    banger.stop()
    await tick()
    expect(onEnded).toHaveBeenLastCalledWith(expect.any(String), true)
  })

  it('plays a reversed buffer by flipping the samples, not the rate', async () => {
    const banger = await makeBanger({ reverse: true })
    banger.play()
    const source = ctxOf(banger).lastSource
    expect(source.playbackRate.value).toBe(1)
    expect(Array.from(banger.audioBuffer!.getChannelData(0))).toEqual([
      4, 3, 2, 1,
    ])
  })
})

describe('Looper', () => {
  it('does not compound the offset across pause cycles', async () => {
    const looper = await makeLooper()
    const ctx = ctxOf(looper)

    looper.play()
    ctx.currentTime = 5
    looper.pause()
    expect(looper.pausedAt).toBe(5)

    ctx.currentTime = 100
    looper.play()
    ctx.currentTime = 103
    looper.pause()
    expect(looper.pausedAt).toBe(8) // 5 played, then 3 more - not 13
  })

  it('resumes from where it paused', async () => {
    const looper = await makeLooper()
    const ctx = ctxOf(looper)

    looper.play()
    ctx.currentTime = 4
    looper.pause()
    await tick()
    looper.play()

    expect(ctx.lastSource.startOffset).toBe(4)
  })

  it('rewinds on stop', async () => {
    const looper = await makeLooper()
    const ctx = ctxOf(looper)

    looper.play()
    ctx.currentTime = 30
    looper.pause()
    looper.stop()
    expect(looper.pausedAt).toBe(0)

    looper.play()
    expect(ctx.lastSource.startOffset).toBe(0)
  })

  it('honours loop: false', async () => {
    const looper = await makeLooper({ loop: false })
    expect(looper.loop).toBe(false)
    expect(ctxOf(looper).lastSource.loop).toBe(false)
  })

  it('loops by default', async () => {
    const looper = await makeLooper()
    expect(looper.loop).toBe(true)
  })

  it('reports a bounded progress value', async () => {
    const looper = await makeLooper()
    const ctx = ctxOf(looper)
    ctx.currentTime = 30

    expect(looper.state.u).toBe(0) // idle, not 3 context-seconds in

    looper.play()
    ctx.currentTime = 35
    expect(looper.state.u).toBeCloseTo(0.5) // 5s into a 10s buffer
    expect(looper.state.timeLength).toBe(10)
  })

  it('fires onPlay like every other player', async () => {
    const onPlay = vi.fn()
    const looper = await makeLooper({ onPlay })
    looper.play()
    expect(onPlay).toHaveBeenCalledOnce()
  })

  it('will not resume a single looper after it has been paused', async () => {
    const looper = await makeLooper({ single: true })
    const ctx = ctxOf(looper)

    looper.play()
    ctx.currentTime = 4
    looper.pause()
    await tick()
    looper.play()

    expect(looper.playing).toBe(false)
    expect(ctx.lastSource.startCount).toBe(1)
  })

  it('flags pause and stop as manual stops', async () => {
    const onEnded = vi.fn()
    const looper = await makeLooper({ onEnded })
    looper.play()
    looper.pause()
    expect(onEnded).toHaveBeenLastCalledWith(expect.any(String), true)
    await tick()
    expect(onEnded).toHaveBeenCalledOnce() // the stale node's event is ignored
  })
})

describe('MultiBanger', () => {
  it('fails loudly when no buffer decoded', async () => {
    const onFail = vi.fn()
    const bank = new MultiBanger({
      name: 'drums',
      arrayBuffers: [],
      ctx: new FakeAudioContext() as unknown as AudioContext,
      onFail,
    })
    await tick()

    expect(bank.loading).toBe(false)
    expect(onFail).toHaveBeenCalledOnce()
  })

  it('keeps the buffers that decode when one is bad', async () => {
    const ctx = new FakeAudioContext()
    let call = 0
    const decode = ctx.decodeAudioData.bind(ctx)
    ctx.decodeAudioData = async (buf: ArrayBuffer) => {
      if (call++ === 0) throw new Error('EncodingError')
      return decode(buf)
    }

    const bank = new MultiBanger({
      name: 'drums',
      arrayBuffers: [buffer(), buffer()],
      ctx: ctx as unknown as AudioContext,
      onFail: () => {},
    })
    await tick()

    expect(bank.audioBuffers.length).toBe(1)
  })

  it('stops every live voice', async () => {
    const ctx = new FakeAudioContext()
    const bank = new MultiBanger({
      name: 'drums',
      arrayBuffers: [buffer()],
      ctx: ctx as unknown as AudioContext,
    })
    await tick()

    bank.play()
    bank.play()
    const live = ctx.sources.filter((s) => s.startCount > 0)
    expect(live.length).toBe(2)

    bank.stop()
    expect(live.every((s) => s.stopped)).toBe(true)
    expect(bank.playing).toBe(false)
  })
})

describe('SpatialBanger', () => {
  let player: InstanceType<typeof SpatialBanger>

  beforeEach(async () => {
    player = new SpatialBanger({
      name: 'src',
      arrayBuffer: buffer(),
      ctx: new FakeAudioContext() as unknown as AudioContext,
      audibleDistance: 100,
      worldPosition: [10, 0, 0],
    })
    await tick()
  })

  it('reads its own options without a type escape hatch', () => {
    expect(player.audibleDistance).toBe(100)
    expect(player.worldPosition).toEqual([10, 0, 0])
  })

  it('measures distance on the xz plane', () => {
    const [, distance] = player.get3DValues([7, 0, 4], [0, 0, 1])
    expect(distance).toBeCloseTo(5)
  })

  it('applies the behind-you filter to a node that is in the chain', () => {
    player.setSpatialValues(Math.PI, 10)
    expect(player.filterNode.frequency.value).toBe(5000)
    expect(player.panNode.connections).toContain(player.filterNode)
  })
})
