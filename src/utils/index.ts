import { IBanger } from '../lib'

export const makeButton = (
  el: HTMLElement,
  player: IBanger,
  handler?: (e: MouseEvent) => void,
  name?: string,
) => {
  const playerButton = document.createElement('button')

  const eventHandler = (e: MouseEvent) => {
    e.stopPropagation()
    player.play()
  }

  playerButton.addEventListener('click', handler || eventHandler)
  playerButton.innerHTML = name || player.name
  el.appendChild(playerButton)
}

export const getEl = (id: string) => document.getElementById(id) as HTMLElement
export const getTarget = (e: MouseEvent) => e.target as HTMLElement
export const qsi = (selector: string) =>
  document.querySelector(selector) as HTMLInputElement

export const getAudio = (id: string) => {
  const audioContainer = getEl(id)
  const audio = audioContainer.querySelectorAll('audio')
  const map: Record<string, HTMLAudioElement> = {}

  Array.from(audio).forEach((el) => {
    map[el.id] = el as HTMLAudioElement
  })
  return map
}

export const getDebugRow = (name: string) => {
  const parent = getEl('debug')
  const existing = getEl(`debug-${name}`)

  if (existing) return existing

  const template = getEl('debug-template')
  const clone = template.cloneNode(true) as HTMLElement
  clone.id = `debug-${name}`

  parent.appendChild(clone)

  return clone
}

export const fix = (n: number, digits = 0) => n.toFixed(digits)

export const debug = (name: string, ...messages: string[]) => {
  const debugElement = getDebugRow(name)

  const nameEl = debugElement.querySelector('.debug-name') as HTMLElement
  const valueEl = debugElement.querySelector('.debug-value') as HTMLElement

  nameEl.innerHTML = name
  valueEl.innerHTML = messages?.join(' ') || 'error'
}
