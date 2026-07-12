import type { ColorBits } from './bits';
import * as core from './bits'

const { getRed, getGreen, getBlue, getAlpha } = core

// Return buffer, avoid allocations
const buffer = [0, 0, 0]

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
  rgbToHSL(
    getRed(color),
    getGreen(color),
    getBlue(color),
  )
  const h = buffer[0]
  const s = buffer[1]
  const l = buffer[2]
  const a = getAlpha(color) / 255

  return `hsla(${h} ${s}% ${l}% / ${a})`
}

export function toHSLA(color: ColorBits) {
  rgbToHSL(
    getRed(color),
    getGreen(color),
    getBlue(color),
  )
  const h = buffer[0]
  const s = buffer[1]
  const l = buffer[2]
  const a = getAlpha(color) / 255

  return { h, s, l, a }
}

export function formatHWBA(color: ColorBits) {
  rgbToHWB(
    getRed(color),
    getGreen(color),
    getBlue(color),
  )
  const h = buffer[0]
  const w = buffer[1]
  const b = buffer[2]
  const a = getAlpha(color) / 255

  return `hsla(${h} ${w}% ${b}% / ${a})`
}

export function toHWBA(color: ColorBits) {
  rgbToHWB(
    getRed(color),
    getGreen(color),
    getBlue(color),
  )
  const h = buffer[0]
  const w = buffer[1]
  const b = buffer[2]
  const a = getAlpha(color) / 255

  return { h, w, b, a }
}

// Conversion functions

// https://www.30secondsofcode.org/js/s/rgb-hex-hsl-hsb-color-format-conversion/
function rgbToHSL(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const s = max - Math.min(r, g, b);
  const h = s
    ? max === r
      ? (g - b) / s
      : max === g
      ? 2 + (b - r) / s
      : 4 + (r - g) / s
    : 0;

  // Saturation branches on lightness (= (2*max - s) / 2), not on max.
  buffer[0] = 60 * h < 0 ? 60 * h + 360 : 60 * h
  buffer[1] = 100 * (s ? (2 * max - s <= 1 ? s / (2 * max - s) : s / (2 - (2 * max - s))) : 0)
  buffer[2] = (100 * (2 * max - s)) / 2
}

// https://stackoverflow.com/a/29463581/3112706
function rgbToHWB(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  
  const w = Math.min(r, g, b)
  const v = Math.max(r, g, b)
  const black = 1 - v
  
  if (v === w) {
    buffer[0] = 0
    buffer[1] = w
    buffer[2] = black
    return
  }

  let f = r === w ? g - b : (g === w ? b - r : r - g);
  let i = r === w ? 3 : (g === w ? 5 : 1);

  buffer[0] = (i - f / (v - w)) / 6
  buffer[1] = w
  buffer[2] = black
}
