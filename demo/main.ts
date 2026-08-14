/* banger demo — https://banger.lucianlabs.ca
 *
 * Two things about the published library shape this page:
 *
 *  - Every Player subclass constructs its OWN `new AudioContext()`. Browsers
 *    start those suspended until a gesture and cap how many can exist, so this
 *    demo resumes each instance's ctx on first interaction and builds at most
 *    three instances.
 *  - Only Looper wires filterNode into the graph; Banger and MultiBanger
 *    connect source → gain → pan → destination, so handleCutoff is inert on
 *    them. The cutoff control is therefore offered on the looper only.
 *
 * Both are recorded in the review.
 */

import { Banger, MultiBanger, Looper, getWav, getWavs } from '@dank-inc/banger'

declare const waveloop: { ready: (...tags: string[]) => Promise<unknown> }

const app = document.getElementById('app') as HTMLElement
const demoEl = document.querySelector('wl-demo') as HTMLElement & { level: number }

const h = (tag: string, cls?: string, text?: string) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = text
  return n
}

const section = (title: string) => {
  const s = document.createElement('wl-section')
  s.setAttribute('title', title)
  app.append(s)
  return s
}

const fader = (label: string, min: number, max: number, step: number, value: number, bipolar = false) => {
  const f = document.createElement('wl-fader')
  f.setAttribute('label', label)
  f.setAttribute('min', String(min))
  f.setAttribute('max', String(max))
  f.setAttribute('step', String(step))
  f.setAttribute('value', String(value))
  if (bipolar) f.setAttribute('bipolar', '')
  return f as HTMLElement & { value: number }
}

const SFX = {
  teleport: 'audio/teleport.wav',
  'place-node': 'audio/place-node.wav',
  'remove-node': 'audio/remove-node.wav',
  drawing: 'audio/drawing.wav',
}
const TRACK = 'audio/eli7vh-tezos-till-i-bezos-final.wav'

const noop = () => {}
const fail = (msg: string) => console.warn('[banger]', msg)

/** Every Player builds its own AudioContext in the constructor, before any
 *  gesture has happened, so it is born suspended. Resume it on interaction. */
const wake = (p: { ctx: AudioContext }) => {
  if (p.ctx.state === 'suspended') p.ctx.resume()
}

waveloop.ready().then(boot)

function boot() {
  installSection()
  oneShotSection()
  bankSection()
  looperSection()
  apiSection()
}

function installSection() {
  const s = section('install')
  const install = document.createElement('wl-install')
  install.setAttribute('pkg', '@dank-inc/banger')
  const c = document.createElement('wl-code')
  c.textContent = `import { Banger, getWav } from '@dank-inc/banger'

const banger = new Banger({
  name: 'teleport',
  arrayBuffer: await getWav('audio/teleport.wav'),
  volume: 0.8,
  pan: 0,
  drift: 0,           // cents of random detune per hit
  onFail: console.warn,
})

banger.play()
banger.stop()`
  s.append(install, c)
}

/* ── Banger — one-shots ─────────────────────────────────────────────────── */

function oneShotSection() {
  const s = section('Banger')
  s.append(
    h(
      'p',
      'wl-muted',
      'One buffer, one voice. Retriggering while it sounds is ignored — that is ' +
        'what makes it a Banger rather than a bank. Drift adds random detune in ' +
        'cents on every hit, so repeats do not phase-lock.'
    )
  )

  const hud = document.createElement('wl-hud')
  hud.style.height = '150px'
  hud.setAttribute('tl', 'BANGER')
  hud.setAttribute('bl', 'ONE VOICE · RETRIGGER IGNORED')
  const pads = h('div')
  pads.style.position = 'absolute'
  pads.style.inset = '2.4rem 0.7rem 1.6rem'
  pads.style.display = 'grid'
  pads.style.gridTemplateColumns = 'repeat(4, 1fr)'
  pads.style.gap = '0.5rem'
  hud.append(pads)
  s.append(hud)

  const controls = h('div', 'wl-grid')
  controls.style.marginTop = '0.75rem'
  const vol = fader('volume', 0, 1, 0.01, 0.8)
  const pan = fader('pan', -1, 1, 0.01, 0, true)
  const drift = fader('drift (cents)', 0, 400, 1, 0)
  const rate = fader('rate', 0.25, 2, 0.01, 1)
  controls.append(vol, pan, drift, rate)
  s.append(controls)

  const bangers: Record<string, Banger> = {}

  const apply = (b: Banger) => {
    b.handleVolume(vol.value)
    b.handlePan(pan.value)
    b.drift = drift.value
    b.playbackRate = rate.value
  }

  for (const [name, url] of Object.entries(SFX)) {
    const pad = h('button', 'wl-btn', name)
    pad.style.height = '100%'
    pad.style.fontSize = '1rem'
    pad.disabled = true

    getWav(url).then((buf) => {
      if (!buf) return
      const b = new Banger({
        name,
        arrayBuffer: buf,
        volume: vol.value,
        onLoaded: () => {
          pad.disabled = false
        },
        onFail: fail,
        onEnded: () => {
          hud.setAttribute('tr', 'IDLE')
        },
        onPlay: () => {
          hud.setAttribute('tr', name.toUpperCase())
        },
      })
      bangers[name] = b
    })

    pad.addEventListener('click', () => {
      const b = bangers[name]
      if (!b) return
      wake(b)
      apply(b)
      b.play()
    })

    pads.append(pad)
  }

  for (const f of [vol, pan, drift, rate]) {
    f.addEventListener('wl-input', () => {
      for (const b of Object.values(bangers)) apply(b)
      hud.setAttribute('br', `VOL ${vol.value.toFixed(2)} · PAN ${pan.value.toFixed(2)} · ${rate.value.toFixed(2)}×`)
    })
  }
  hud.setAttribute('br', 'VOL 0.80 · PAN 0.00 · 1.00×')
}

/* ── MultiBanger — the sample bank ──────────────────────────────────────── */

function bankSection() {
  const s = section('MultiBanger')
  s.append(
    h(
      'p',
      'wl-muted',
      'One instance, many buffers, a random pick per hit — and unlike Banger it ' +
        'overlaps, so you can machine-gun it. There is no stop control by design.'
    )
  )

  const hud = document.createElement('wl-hud')
  hud.style.height = '170px'
  hud.setAttribute('tl', 'MULTIBANGER')
  hud.setAttribute('bl', 'POLYPHONIC · RANDOM PICK')
  const inner = h('div')
  inner.style.position = 'absolute'
  inner.style.inset = '2.4rem 0.7rem 1.6rem'
  inner.style.display = 'flex'
  inner.style.alignItems = 'center'
  inner.style.justifyContent = 'center'
  inner.style.gap = '0.75rem'
  hud.append(inner)
  s.append(hud)

  const hit = h('button', 'wl-btn', 'hit')
  hit.style.fontSize = '1.8rem'
  hit.style.padding = '1rem 3rem'
  hit.disabled = true

  const roll = h('button', 'wl-btn wl-btn--ghost', 'roll ×12')
  roll.style.fontSize = '1.2rem'
  roll.disabled = true

  inner.append(hit, roll)

  const controls = h('div', 'wl-grid')
  controls.style.marginTop = '0.75rem'
  const vol = fader('volume', 0, 1, 0.01, 0.7)
  const pan = fader('pan', -1, 1, 0.01, 0, true)
  const drift = fader('drift (cents)', 0, 600, 1, 180)
  controls.append(vol, pan, drift)
  s.append(controls)

  let bank: MultiBanger | null = null
  let hits = 0

  getWavs(Object.values(SFX)).then((buffers) => {
    bank = new MultiBanger({
      name: 'sfx',
      arrayBuffers: buffers,
      volume: vol.value,
      drift: drift.value,
      onFail: fail,
      onLoaded: () => {
        hit.disabled = false
        roll.disabled = false
        hud.setAttribute('tr', `${buffers.length} BUFFERS`)
      },
      onEnded: noop,
    })
  })

  const strike = () => {
    if (!bank) return
    wake(bank)
    bank.setVolume(vol.value)
    bank.setPan(pan.value)
    bank.drift = drift.value
    bank.play()
    hits++
    hud.setAttribute('br', `${hits} HITS`)
  }

  hit.addEventListener('click', strike)
  roll.addEventListener('click', () => {
    for (let i = 0; i < 12; i++) setTimeout(strike, i * 70)
  })
}

/* ── Looper — the track ─────────────────────────────────────────────────── */

function looperSection() {
  const s = section('Looper')
  s.append(
    h(
      'p',
      'wl-muted',
      'A Banger that loops and remembers where it was. This is the one player ' +
        'whose graph includes the filter node, so the cutoff below is live. The ' +
        'scope is an analyser tapped off the looper’s own pan node, and it ' +
        'drives the wordmark at the top of the page.'
    )
  )

  const hud = document.createElement('wl-hud')
  hud.style.height = '240px'
  hud.setAttribute('tl', 'LOOPER')
  hud.setAttribute('bl', 'NOT LOADED')
  const scope = document.createElement('wl-scope')
  scope.setAttribute('history', '160')
  hud.append(scope)
  s.append(hud)

  const transport = h('div', 'wl-row')
  transport.style.marginTop = '0.75rem'
  const loadBtn = h('button', 'wl-btn', 'load track (5 MB)')
  const playBtn = h('button', 'wl-btn', 'play')
  const pauseBtn = h('button', 'wl-btn wl-btn--ghost', 'pause')
  const stopBtn = h('button', 'wl-btn wl-btn--ghost', 'stop')
  playBtn.disabled = pauseBtn.disabled = stopBtn.disabled = true
  transport.append(loadBtn, playBtn, pauseBtn, stopBtn)
  s.append(transport)

  const controls = h('div', 'wl-grid')
  controls.style.marginTop = '0.75rem'
  const vol = fader('volume', 0, 1, 0.01, 0.7)
  const pan = fader('pan', -1, 1, 0.01, 0, true)
  const cutoff = fader('cutoff (hz)', 120, 18000, 10, 18000)
  const q = fader('resonance', 0.1, 12, 0.1, 1)
  controls.append(vol, pan, cutoff, q)
  s.append(controls)

  let looper: Looper | null = null
  let analyser: AnalyserNode | null = null
  let buf: Uint8Array | null = null

  const applyAll = () => {
    if (!looper) return
    looper.setVolume(vol.value)
    looper.setPan(pan.value)
    looper.handleCutoff(cutoff.value, q.value)
    hud.setAttribute('br', `${Math.round(cutoff.value)} HZ · Q ${q.value.toFixed(1)}`)
  }
  for (const f of [vol, pan, cutoff, q]) f.addEventListener('wl-input', applyAll)

  loadBtn.addEventListener('click', async () => {
    loadBtn.disabled = true
    loadBtn.textContent = 'loading…'
    hud.setAttribute('bl', 'FETCHING')

    const arrayBuffer = await getWav(TRACK)
    if (!arrayBuffer) {
      loadBtn.textContent = 'load failed'
      hud.setAttribute('bl', 'FETCH FAILED')
      return
    }

    looper = new Looper({
      name: 'tezos till i bezos',
      arrayBuffer,
      loop: true,
      volume: vol.value,
      onFail: fail,
      onLoaded: () => {
        loadBtn.textContent = 'loaded'
        playBtn.disabled = pauseBtn.disabled = stopBtn.disabled = false
        hud.setAttribute('bl', 'READY')
        hud.setAttribute('tr', `${looper?.state.length?.toFixed(1) ?? '?'} S`)

        // Tap the analyser off the library's own pan node. Every node on a
        // Player is public, so metering needs no support from the library.
        analyser = looper!.ctx.createAnalyser()
        analyser.fftSize = 1024
        buf = new Uint8Array(analyser.frequencyBinCount)
        looper!.panNode.connect(analyser)
        meter()
      },
      onEnded: noop,
    })
    applyAll()
  })

  playBtn.addEventListener('click', () => {
    if (!looper) return
    wake(looper)
    looper.play()
    hud.setAttribute('bl', 'PLAYING')
  })
  pauseBtn.addEventListener('click', () => {
    looper?.pause()
    hud.setAttribute('bl', 'PAUSED')
  })
  stopBtn.addEventListener('click', () => {
    looper?.stop()
    hud.setAttribute('bl', 'STOPPED')
  })

  const meter = () => {
    if (!analyser || !buf) return
    analyser.getByteTimeDomainData(buf)
    let peak = 0
    for (let i = 0; i < buf.length; i++) {
      const v = Math.abs(buf[i] - 128) / 128
      if (v > peak) peak = v
    }
    ;(scope as HTMLElement & { push: (v: number) => void }).push(peak)
    // "the wordmark can be alive" — brighten the metal with the signal
    if (demoEl) demoEl.level = Math.min(1, peak * 1.6)
    requestAnimationFrame(meter)
  }
}

function apiSection() {
  const s = section('api')
  const api = document.createElement('wl-api')
  s.append(api)
  ;(api as HTMLElement & { rows: unknown }).rows = [
    { name: 'Banger', kind: 'class', signature: '(params: BangerParams) => Banger', about: 'Single-voice one-shot. play() is ignored while it is already sounding.' },
    { name: 'MultiBanger', kind: 'class', signature: '(params: MultiBangerProps) => MultiBanger', about: 'Sample bank; each play() picks a random buffer and overlaps. No stop control.' },
    { name: 'Looper', kind: 'class', signature: '(params: LooperParams) => Looper', about: 'Looping player with pause/resume position. The only player whose graph includes filterNode.' },
    { name: 'SpatialBanger / SpatialLooper', kind: 'class', signature: 'SpatialPlayer(Base)', about: 'Mixin adding PannerNode positioning to a player.' },
    { name: '.play / .stop / .pause', kind: 'method', signature: '() => void', about: 'Transport. pause() is Looper only.' },
    { name: '.handleVolume / .setVolume', kind: 'method', signature: '(value: number) => void', about: 'Sets gainNode.gain, clamped at zero.' },
    { name: '.handlePan / .setPan', kind: 'method', signature: '(value: number) => void', about: 'Sets panNode.pan, -1 to 1.' },
    { name: '.handleCutoff', kind: 'method', signature: '(hz: number, q?: number) => void', about: 'Sets the biquad lowpass. Audible on Looper only.' },
    { name: '.drift', kind: 'property', signature: 'number', about: 'Cents of random detune applied per play().' },
    { name: '.playbackRate', kind: 'property', signature: 'number', about: 'Rate multiplier applied per play().' },
    { name: '.ctx / .gainNode / .panNode / .filterNode', kind: 'property', signature: 'Web Audio nodes', about: 'Public, so you can tap or extend the graph yourself.' },
    { name: 'Looper.state', kind: 'getter', signature: '=> { playing, length, currentTime, u, … }', about: 'Transport snapshot for meters and progress bars.' },
    { name: 'getWav / getWavs', kind: 'function', signature: '(url | url[]) => Promise<ArrayBuffer…>', about: 'Fetch helpers producing the arrayBuffer the constructors want.' },
  ]
}
