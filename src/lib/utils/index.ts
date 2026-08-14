export const getArrayBuffer = async (res: Response): Promise<ArrayBuffer> => {
  return res.arrayBuffer()
}

export const getWav = async (url: string): Promise<ArrayBuffer | null> => {
  // expects an audio (wav) file at the location
  try {
    const res = await fetch(url)
    // fetch only rejects on network failure - a 404 body is a perfectly valid
    // ArrayBuffer of error-page bytes, which decodes to nothing
    if (!res.ok) {
      console.warn('Bad response', res.status, 'for =>', url)
      return null
    }
    return await res.arrayBuffer()
  } catch (err) {
    console.warn("Can't find audio buffers for =>", url)
    return null
  }
}

/** Fetches every url, dropping (and warning about) the ones that fail. */
export const getWavs = async (urls: string[]): Promise<ArrayBuffer[]> => {
  const arrayBuffers = await Promise.all(urls.map(getWav))

  return arrayBuffers.filter((buff): buff is ArrayBuffer => !!buff)
}

export const getFileList = async (url: string): Promise<string[]> => {
  // garbage
  try {
    const res = await fetch(url) // Expects {files: string[]}
    const data = (await res.json()) as { files?: string[] }
    if (!data.files) throw new Error('Wrong data type')
    return data.files
  } catch (err) {
    console.error(url, 'not found', err)
    throw new Error(`${url} NOT FOUND`)
  }
}

export const clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max)
}
