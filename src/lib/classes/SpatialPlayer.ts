// typescript mixin for Banger and Looper that adds spatialization

import { SpatialVec3 } from '../types/interfaces'
import { clamp } from '../utils'
import { Banger, BangerParams } from './Banger'
import { Looper, LooperParams } from './Looper'

export type SpatialAudioParams = (BangerParams | LooperParams) & {
  worldPosition?: SpatialVec3
  audibleDistance?: number
  orientation?: SpatialVec3
}

/** What the mixin adds on top of the player it wraps. */
export interface SpatialFeatures {
  worldPosition: SpatialVec3
  audibleDistance: number
  orientation?: SpatialVec3
  setWorldPosition: (position: SpatialVec3) => void
  setOrientation: (orientation: SpatialVec3) => void
  setSpatialValues: (
    listenerAngle: number,
    distance?: number,
    obstacles?: boolean,
  ) => void
  get3DValues: (
    listenerPosition: SpatialVec3,
    listenerOrientation: SpatialVec3,
  ) => [listenerAngle: number, distance: number, degrees: number]
}

type Constructor<T> = new (...params: any[]) => T

export function SpatialPlayer<T extends Constructor<Banger>>(Base: T) {
  // TS requires a mixin constructor to be `...args: any[]`; the exported
  // SpatialBanger/SpatialLooper below give consumers the real signature back
  return class extends Base {
    worldPosition: SpatialVec3
    audibleDistance: number
    orientation?: SpatialVec3

    constructor(...props: any[]) {
      super(...props)
      const [p] = props as [SpatialAudioParams]
      this.worldPosition = p.worldPosition || [0, 0, 0]
      this.audibleDistance = p.audibleDistance || 10
      this.orientation = p.orientation
    }

    setWorldPosition = ([x, y, z]: SpatialVec3) =>
      (this.worldPosition = [x, y, z])

    setOrientation = ([x, y, z]: SpatialVec3) => (this.orientation = [x, y, z])

    setSpatialValues = (
      listenerAngle: number, // from listener's pov (radians)
      distance = 0, // meters
      _obstacles = false,
    ) => {
      // use angle to determine cutoff
      // if angle is 0, cutoff is 20000
      // if angle is 180, cutoff is 5000
      const pan = Math.sin(listenerAngle)

      this.handlePan(pan)

      const volume =
        clamp(1 - distance / this.audibleDistance, 0, 1) * this.volumeScale

      const normalizedAngle = Math.sin(listenerAngle + Math.PI / 2)

      if (normalizedAngle < 0) {
        this.handleCutoff(5000)
        this.handleVolume(volume * 0.8)
      } else {
        this.handleCutoff(20000)
        this.handleVolume(volume)
      }
    }

    get3DValues = (
      [lpx, _lpy, lpz]: SpatialVec3,
      [lox, _loy, loz]: SpatialVec3,
    ): [listenerAngle: number, distance: number, degrees: number] => {
      const [wpx, _wpy, wpz] = this.worldPosition

      const listenerAngle =
        Math.atan2(lox, loz) - Math.atan2(wpx - lpx, wpz - lpz)
      const distance = Math.sqrt((wpx - lpx) ** 2 + (wpz - lpz) ** 2)
      const degrees = (listenerAngle * 180) / Math.PI

      return [listenerAngle, distance, degrees]
    }
  }
}

export const SpatialLooper: new (
  params: SpatialAudioParams,
) => Looper & SpatialFeatures = SpatialPlayer(Looper)

export const SpatialBanger: new (
  params: SpatialAudioParams,
) => Banger & SpatialFeatures = SpatialPlayer(Banger)

// export class Banger3D extends SpatialPlayer(Banger)
