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

along with the basic usage you see above, both players takes the following params in the constructor

```ts
type PlayerParams = {
  volume?: number // set the volume of the player 0..1
  reverse?: boolean // play audio in reverse
  loop?: boolean // play audio in a loop!
  drift?: number // detunes the audio this random amount each play
}
```

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
  // @ts-ignore
  worldPosition: state.sourceWorldPosition,
  // @ts-ignore
  audibleDistance: 100, // distance in units until audio is not heard
})

// if audio emitter position has changed
ttib.setWorldPosition(
  sourcePosition, // [x, y, z] (y is up)
)

// upon changing of listener position
const [angle, distance] = ttib.get3dValues(
  listenerWorldPosition,
  listenerWorldOrientation,
)

ttib.setSpatialValues(angle, distance)
```

# Todo

- RekkidPlaya
  https://archive.org/details/78_i-get-a-kick-out-of-you_ruby-newman-and-his-orchestra-ray-morton-jerome-kern-otto-h_gbia0013907/02+-+I+Get+a+Kick+Out+of+You+-+Ruby+Newman+And+His+Orchestra-restored.flac
