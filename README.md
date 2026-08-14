# Is it a banger?

**[Live demo →](https://banger.lucianlabs.ca)** · [npm](https://www.npmjs.com/package/@dank-inc/banger) · [all packages](https://lucianlabs.ca/packages/)

answer. yes.

This is a WebAudio API library written with Typescript

infinite polyphony!
randomized sounds!

# Usage

[![npm version](https://badge.fury.io/js/@dank-inc%2Fbanger.svg)](https://badge.fury.io/js/@dank-inc%2Fbanger)

```
npm install @dank-inc/banger
```

## Banger

- single soundfile player
- pitch variation
- polyphonic!

## Example

```ts
import { Banger, getWav } from '@dank-inc/banger'

const banger = new Banger({
  name: 'Kick',
  arrayBuffer: await getWav(
    'https://cwilso.github.io/MIDIDrums/sounds/drum-samples/CR78/kick.wav',
  ),
})

banger.loading // state while sources is loading (can be used for ui loading screens)

banger.play() // plays the sound!
```

## MultiBanger

- takes a folder of sounds
- randomizes playing of said sounds
- does the things the Banger does
- is dank
- probably needs some kind of optimization

## Example

```ts
import { MultiBanger, getWavs } from '@dank-inc/banger'

const files = [
  'https://cwilso.github.io/MIDIDrums/sounds/drum-samples/CR78/kick.wav',
  'https://cwilso.github.io/MIDIDrums/sounds/drum-samples/CR78/snare.wav',
  'https://cwilso.github.io/MIDIDrums/sounds/drum-samples/CR78/hihat.wav',
  'https://cwilso.github.io/MIDIDrums/sounds/drum-samples/CR78/tom1.wav',
  'https://cwilso.github.io/MIDIDrums/sounds/drum-samples/CR78/tom2.wav',
  'https://cwilso.github.io/MIDIDrums/sounds/drum-samples/CR78/tom3.wav',
]

const multiBanger = new MultiBanger({
  name: 'drumz',
  arrayBuffers: await getWavs(files),
})

multiBanger.loading // while sources are loading.

multiBanger.play() // plays a random sound!
```

# Additional Parameters

along with the basic usage you see above, every player takes the following params in the constructor

```ts
type PlayerParams = {
  ctx?: AudioContext // bring your own; otherwise all players share one
  volume?: number // set the volume of the player 0..1
  volumeScale?: number // ceiling applied by the spatial mixin's attenuation
  pan?: number // -1..1
  reverse?: boolean // play the buffer backwards
  loop?: boolean // play audio in a loop!
  drift?: number // detunes the audio this random amount each play (cents)
  playbackRate?: number // rate multiplier, applied per play()
  startTime?: number // seconds into the buffer that play() starts from
  onLoaded?: (msg?: string) => void
  onPlay?: () => void
  onEnded?: (msg?: string, manualStop?: boolean) => void // manualStop is true for stop()/pause()
  onFail?: (msg: string, data?: PlayerFailure) => void // defaults to console.error
}
```

`Banger` and `Looper` (and their spatial versions) take one more:

```ts
single?: boolean // one shot for the life of the player
```

A `single` player never replaces its source node, so once the sound has gone out
— ended, stopped, or paused — every later `play()` is a silent no-op instead of
a retrigger. Leave it off for anything you want to fire more than once.

Players share a single `AudioContext` (browsers cap them per document), and
resume it on the first `play()` — so a player built at module load still sounds
on Safari/iOS once the user clicks something. Pass `ctx` to opt out, and call
`dispose()` to release a player's nodes.

Buffers are copied before decoding, so the same `ArrayBuffer` can be handed to
as many players as you like.

# Spatial Audio (wip)

currently only 2d panning, attenuation, and head simulation, but it's still fun to use.

```ts
const ttib = new SpatialLooper({
  name: 'Looper: Tezos Till I Bezos',
  loop: true,
  arrayBuffer: await getWav(map['tezos'].src),
  onLoaded: () => console.log('>> ttib loaded'),
  onEnded: () => console.log('>> ttib sound ended'),
  onFail: console.error,
  worldPosition: state.sourceWorldPosition,
  audibleDistance: 100, // distance in units until audio is not heard
})

// if audio emitter position has changed
ttib.setWorldPosition(
  sourcePosition, // [x, y, z] (y is up)
)

// upon changing of listener position
const [angle, distance, degrees] = ttib.get3DValues(
  listenerWorldPosition,
  listenerWorldOrientation,
)

ttib.setSpatialValues(angle, distance)
```

# Todo

- RekkidPlaya
  https://archive.org/details/78_i-get-a-kick-out-of-you_ruby-newman-and-his-orchestra-ray-morton-jerome-kern-otto-h_gbia0013907/02+-+I+Get+a+Kick+Out+of+You+-+Ruby+Newman+And+His+Orchestra-restored.flac
