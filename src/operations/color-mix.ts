// CSS Color 5 color-mix(). Interpolates two colors in a chosen color space with
// premultiplied alpha and the four hue-interpolation methods.
// https://drafts.csswg.org/css-color-5/#color-mix

import { ColorBits, getRed, getGreen, getBlue, getAlpha } from '../core/bits'
import { clampByte } from '../core/bytes'
import type { ColorModel } from '../conversion/channels'
import { colorModel } from '../conversion/channels'

export type HueMethod = 'shorter' | 'longer' | 'increasing' | 'decreasing'

export interface ColorMixOptions {
  /** interpolation space: a model name ("oklab", "hsl", …) or a ColorModel, e.g. colorSpaceModel('srgb') */
  space: string | ColorModel
  /** hue interpolation method for polar spaces (default "shorter") */
  hue?: HueMethod
  /** percentage (0..100) of color1; defaults derived from p2 or 50 */
  p1?: number
  /** percentage (0..100) of color2; defaults derived from p1 or 50 */
  p2?: number
}

// Both interpolation endpoints are alive at once, so each gets its own buffer.
const CHANNELS_1 = new Float64Array(3)
const CHANNELS_2 = new Float64Array(3)

function fail(message: string): never {
  throw new Error('color-mix(): ' + message)
}

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360
}

function adjustHue(h1: number, h2: number, method: HueMethod): [number, number] {
  h1 = normalizeHue(h1)
  h2 = normalizeHue(h2)
  const d = h2 - h1
  switch (method) {
    case 'shorter':
      if (d > 180) h1 += 360
      else if (d < -180) h2 += 360
      break
    case 'longer':
      if (d > 0 && d < 180) h1 += 360
      else if (d > -180 && d <= 0) h2 += 360
      break
    case 'increasing':
      if (h2 < h1) h2 += 360
      break
    case 'decreasing':
      if (h1 < h2) h1 += 360
      break
  }
  return [h1, h2]
}

/**
 * Mix two colors in the given color space.
 * @param color1 first color
 * @param color2 second color
 * @param options interpolation space, hue method and percentages
 */
export function colorMix(color1: ColorBits, color2: ColorBits, options: ColorMixOptions): ColorBits {
  const { space } = options
  const model = typeof space === 'string' ? colorModel(space.toLowerCase()) : space
  if (model === null) {
    fail(`unsupported color space: "${space}"`)
  }
  const hueIndex = model.hues.indexOf(true)
  if (options.hue !== undefined && hueIndex === -1) {
    fail('hue method requires a polar space')
  }
  const method: HueMethod = options.hue ?? 'shorter'

  // Resolve percentages and the (sub-100%) alpha multiplier.
  // https://drafts.csswg.org/css-color-5/#color-mix-percent-norm
  const o1 = options.p1
  const o2 = options.p2
  if ((o1 !== undefined && !(o1 >= 0 && o1 <= 100)) || (o2 !== undefined && !(o2 >= 0 && o2 <= 100))) {
    fail('percentages must be within [0%, 100%]')
  }
  let p1: number
  let p2: number
  let alphaMultiplier = 1
  if (o1 === undefined && o2 === undefined) {
    p1 = 50
    p2 = 50
  } else if (o1 === undefined) {
    p2 = o2 as number
    p1 = 100 - p2
  } else if (o2 === undefined) {
    p1 = o1
    p2 = 100 - p1
  } else {
    const sum = o1 + o2
    if (sum === 0) {
      fail('percentages must not sum to zero')
    }
    if (sum < 100) {
      alphaMultiplier = sum / 100
    }
    p1 = (o1 / sum) * 100
    p2 = (o2 / sum) * 100
  }
  const w1 = p1 / 100
  const w2 = p2 / 100

  const r1 = getRed(color1), g1 = getGreen(color1), b1 = getBlue(color1)
  const r2 = getRed(color2), g2 = getGreen(color2), b2 = getBlue(color2)
  const a1 = getAlpha(color1) / 255
  const a2 = getAlpha(color2) / 255
  const c1 = model.fromSrgb(r1 / 255, g1 / 255, b1 / 255, CHANNELS_1)
  const c2 = model.fromSrgb(r2 / 255, g2 / 255, b2 / 255, CHANNELS_2)

  const hi = hueIndex
  if (hi >= 0) {
    // A powerless hue (achromatic color) is treated as missing and takes the
    // other color's hue. https://drafts.csswg.org/css-color-4/#interpolation-missing
    // Achromaticity is detected on the sRGB bytes (exact); the converted
    // channels carry conversion noise (e.g. white -> lch chroma ~0.02).
    const missing1 = r1 === g1 && g1 === b1
    const missing2 = r2 === g2 && g2 === b2
    if (missing1 && !missing2) {
      c1[hi] = c2[hi]
    } else if (missing2 && !missing1) {
      c2[hi] = c1[hi]
    }
    const [h1, h2] = adjustHue(c1[hi], c2[hi], method)
    c1[hi] = h1
    c2[hi] = h2
  }

  // Premultiply every non-hue coordinate by its alpha.
  for (let i = 0; i < 3; i++) {
    if (i !== hi) {
      c1[i] *= a1
      c2[i] *= a2
    }
  }

  const mixedAlpha = a1 * w1 + a2 * w2
  for (let i = 0; i < 3; i++) {
    let v = c1[i] * w1 + c2[i] * w2
    if (i === hi) {
      v = normalizeHue(v)
    } else if (mixedAlpha !== 0) {
      v /= mixedAlpha // un-premultiply
    }
    c1[i] = v
  }

  const alphaByte = clampByte(mixedAlpha * alphaMultiplier * 255)
  return model.toColor(c1[0], c1[1], c1[2], alphaByte)
}
