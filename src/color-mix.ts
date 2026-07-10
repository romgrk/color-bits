// CSS Color 5 color-mix(). Interpolates two colors in a chosen color space with
// premultiplied alpha and the four hue-interpolation methods.
// https://drafts.csswg.org/css-color-5/#color-mix

import { Color, getRed, getGreen, getBlue, getAlpha } from './core'
import type { Tokens } from './tokenize'
import {
  colorSpaceChannels,
  colorSpaceToColor,
  srgbToColorSpace,
  hslToColor, srgbToHsl,
  hwbToColor, srgbToHwb,
  labToColor, srgbToLab,
  lchToColor, srgbToLch,
  oklabToColor, srgbToOklab,
  oklchToColor, srgbToOklch,
} from './channels'

const PERCENT = 37 // '%'

export type HueMethod = 'shorter' | 'longer' | 'increasing' | 'decreasing'

export interface ColorMixOptions {
  /** interpolation color space, e.g. "oklab", "srgb", "hsl", "oklch" */
  space: string
  /** hue interpolation method for polar spaces (default "shorter") */
  hue?: HueMethod
  /** percentage (0..100) of color1; defaults derived from p2 or 50 */
  p1?: number
  /** percentage (0..100) of color2; defaults derived from p1 or 50 */
  p2?: number
}

type RGB = [number, number, number]

interface MixSpace {
  fromSrgb: (r: number, g: number, b: number) => RGB
  toColor: (c1: number, c2: number, c3: number, alpha: number) => Color
  /** index of the hue channel, or -1 for rectangular spaces */
  hueIndex: number
}

function clampByte(value: number): number {
  const n = Math.round(value)
  return n < 0 ? 0 : n > 255 ? 255 : n
}

function mixSpace(space: string): MixSpace | null {
  switch (space) {
    case 'hsl':   return { fromSrgb: srgbToHsl,   toColor: hslToColor,   hueIndex: 0 }
    case 'hwb':   return { fromSrgb: srgbToHwb,   toColor: hwbToColor,   hueIndex: 0 }
    case 'lab':   return { fromSrgb: srgbToLab,   toColor: labToColor,   hueIndex: -1 }
    case 'lch':   return { fromSrgb: srgbToLch,   toColor: lchToColor,   hueIndex: 2 }
    case 'oklab': return { fromSrgb: srgbToOklab, toColor: oklabToColor, hueIndex: -1 }
    case 'oklch': return { fromSrgb: srgbToOklch, toColor: oklchToColor, hueIndex: 2 }
    default:
      if (colorSpaceChannels(space) === null) {
        return null
      }
      return {
        fromSrgb: (r, g, b) => srgbToColorSpace(space, r, g, b)!,
        toColor: (c1, c2, c3, alpha) => colorSpaceToColor(space, c1, c2, c3, alpha)!,
        hueIndex: -1,
      }
  }
}

function adjustHue(h1: number, h2: number, method: HueMethod): [number, number] {
  h1 = ((h1 % 360) + 360) % 360
  h2 = ((h2 % 360) + 360) % 360
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
export function colorMix(color1: Color, color2: Color, options: ColorMixOptions): Color {
  const model = mixSpace(options.space.toLowerCase())
  if (model === null) {
    throw new Error(`color-mix(): unsupported color space: "${options.space}"`)
  }
  const method: HueMethod = options.hue ?? 'shorter'

  // Resolve percentages and the (sub-100%) alpha multiplier.
  const o1 = options.p1
  const o2 = options.p2
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
      throw new Error('color-mix(): percentages must not sum to zero')
    }
    if (sum < 100) {
      alphaMultiplier = sum / 100
    }
    p1 = (o1 / sum) * 100
    p2 = (o2 / sum) * 100
  }
  const w1 = p1 / 100
  const w2 = p2 / 100

  const a1 = getAlpha(color1) / 255
  const a2 = getAlpha(color2) / 255
  const c1 = model.fromSrgb(getRed(color1) / 255, getGreen(color1) / 255, getBlue(color1) / 255)
  const c2 = model.fromSrgb(getRed(color2) / 255, getGreen(color2) / 255, getBlue(color2) / 255)

  const hi = model.hueIndex
  if (hi >= 0) {
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
  const out: RGB = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    let v = c1[i] * w1 + c2[i] * w2
    if (i === hi) {
      v = ((v % 360) + 360) % 360
    } else if (mixedAlpha !== 0) {
      v /= mixedAlpha // un-premultiply
    }
    out[i] = v
  }

  const alphaByte = clampByte(mixedAlpha * alphaMultiplier * 255)
  return model.toColor(out[0], out[1], out[2], alphaByte)
}

/** Parse one `<color> [<percentage>]` (order-independent) color-mix argument. */
function parseColorArg(group: string[], parseColor: (input: string) => Color): { color: Color, p?: number } {
  let colorToken: string | undefined
  let p: number | undefined
  for (const token of group) {
    if (token.charCodeAt(token.length - 1) === PERCENT) {
      p = parseFloat(token)
    } else {
      colorToken = token
    }
  }
  if (colorToken === undefined) {
    throw new Error('color-mix(): missing color')
  }
  return { color: parseColor(colorToken), p }
}

/**
 * Resolve a color-mix() from its tokenized form.
 * @param tokens tokenized `color-mix(...)`
 * @param parseColor parser for the two color arguments (recursive)
 */
export function resolveColorMix(tokens: Tokens, parseColor: (input: string) => Color): Color {
  // Split the tokens into comma-separated groups: <in-clause>, <color1>, <color2>
  const groups: string[][] = [[]]
  for (const token of tokens.tokens) {
    if (token === ',') {
      groups.push([])
    } else {
      groups[groups.length - 1].push(token)
    }
  }
  if (groups.length !== 3) {
    throw new Error('color-mix(): expected "in <space>, <color1>, <color2>"')
  }

  const inClause = groups[0]
  if (inClause[0] !== 'in' || inClause[1] === undefined) {
    throw new Error('color-mix(): expected "in <space>"')
  }
  const space = inClause[1].toLowerCase()

  let hue: HueMethod | undefined
  const hueKw = inClause.indexOf('hue')
  if (hueKw > 2) {
    hue = inClause[hueKw - 1].toLowerCase() as HueMethod
  }

  const arg1 = parseColorArg(groups[1], parseColor)
  const arg2 = parseColorArg(groups[2], parseColor)

  return colorMix(arg1.color, arg2.color, { space, hue, p1: arg1.p, p2: arg2.p })
}
