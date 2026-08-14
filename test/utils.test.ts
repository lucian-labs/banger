import { afterEach, describe, expect, it, vi } from 'vitest'
import { clamp, getWav, getWavs } from '../src/lib/utils'

const respond = (ok: boolean, status = ok ? 200 : 404) =>
  ({ ok, status, arrayBuffer: async () => new ArrayBuffer(8) }) as Response

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getWav', () => {
  it('returns the buffer on a good response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respond(true)),
    )
    expect(await getWav('good.wav')).toBeInstanceOf(ArrayBuffer)
  })

  it('returns null on a 404 instead of the error page bytes', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respond(false)),
    )
    expect(await getWav('typo.wav')).toBeNull()
  })

  it('returns null when the fetch rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await getWav('nope.wav')).toBeNull()
  })
})

describe('getWavs', () => {
  it('drops the urls that failed', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respond(call++ !== 0)),
    )

    const buffers = await getWavs(['bad.wav', 'good.wav'])
    expect(buffers.length).toBe(1)
  })
})

describe('clamp', () => {
  it('bounds both ends', () => {
    expect(clamp(-2, 0, 1)).toBe(0)
    expect(clamp(2, 0, 1)).toBe(1)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
})
