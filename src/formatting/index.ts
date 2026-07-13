import type { ColorBits } from '../core/bits';
import * as core from '../core/bits'
import { srgbToHsl, srgbToHwb } from '../conversion/channels'

const { getRed, getGreen, getBlue, getAlpha } = core

// Scratch for srgbToHsl/srgbToHwb results; read out before the next call.
const SCRATCH = new Float64Array(3)

/**
 * Map 8-bits value to its hexadecimal representation
 * ['00', '01', '02', ..., 'fe', 'ff']
 */
const FORMAT_HEX =
  Array.from({ length: 256 })
    .map((_, byte) => byte.toString(16).padStart(2, '0'))

/** Format to a #RRGGBBAA string */
export const format = formatHEXA;

/** Format to a #RRGGBBAA string */
export function formatHEXA(color: ColorBits): string {
  return (
    '#' +
    FORMAT_HEX[getRed(color)] +
    FORMAT_HEX[getGreen(color)] +
    FORMAT_HEX[getBlue(color)] +
    FORMAT_HEX[getAlpha(color)]
  )
}

export function formatHEX(color: ColorBits): string {
  return (
    '#' +
    FORMAT_HEX[getRed(color)] +
    FORMAT_HEX[getGreen(color)] +
    FORMAT_HEX[getBlue(color)]
  )
}

export function formatRGBA(color: ColorBits) {
  return `rgba(${getRed(color)} ${getGreen(color)} ${getBlue(color)} / ${getAlpha(color) / 255})`
}

export function toRGBA(color: ColorBits) {
  return {
    r: getRed(color),
    g: getGreen(color),
    b: getBlue(color),
    a: getAlpha(color),
  }
}

export function formatHSLA(color: ColorBits) {
  srgbToHsl(getRed(color) / 255, getGreen(color) / 255, getBlue(color) / 255, SCRATCH)
  return `hsla(${SCRATCH[0]} ${SCRATCH[1]}% ${SCRATCH[2]}% / ${getAlpha(color) / 255})`
}

export function toHSLA(color: ColorBits) {
  srgbToHsl(getRed(color) / 255, getGreen(color) / 255, getBlue(color) / 255, SCRATCH)
  return { h: SCRATCH[0], s: SCRATCH[1], l: SCRATCH[2], a: getAlpha(color) / 255 }
}

export function formatHWBA(color: ColorBits) {
  srgbToHwb(getRed(color) / 255, getGreen(color) / 255, getBlue(color) / 255, SCRATCH)
  return `hwb(${SCRATCH[0]} ${SCRATCH[1]}% ${SCRATCH[2]}% / ${getAlpha(color) / 255})`
}

export function toHWBA(color: ColorBits) {
  srgbToHwb(getRed(color) / 255, getGreen(color) / 255, getBlue(color) / 255, SCRATCH)
  return { h: SCRATCH[0], w: SCRATCH[1], b: SCRATCH[2], a: getAlpha(color) / 255 }
}
