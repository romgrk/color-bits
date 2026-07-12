// Color-function resolution for the forms the fast regex path cannot handle:
// relative colors, e.g. `oklch(from green calc(l * 0.8) c h / 0.5)`, and
// absolute functions whose channels use calc(), e.g. `rgb(calc(255 / 2) 0 0)`.
//
// For relative colors the origin is parsed (recursively, via the injected
// `parseColor`), then expressed in the destination color model's channels as
// keyword bindings. Each output channel is a keyword, a number/percentage/
// angle, `none`, or a calc() expression over those keywords. Results route
// through the same conversion math as the absolute parser, so absolute and
// relative agree.

import { ColorBits, newColor, getRed, getGreen, getBlue, getAlpha } from '../core/bits'
import { clampByte } from '../core/bytes'
import type { Tokens } from './tokenizer'
import { evaluateCalc } from './calc'
import { isFromKeyword, parseAngle, parseNumberOrPercentage } from './values'
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
} from '../conversion/channels'

type RGB = [number, number, number]

interface Model {
  keys: [string, string, string]
  /** percentage reference per channel (e.g. 255 for rgb, 1 for oklab L) */
  ranges: [number, number, number]
  /** whether each channel is a hue angle */
  hues: [boolean, boolean, boolean]
  /** sRGB in [0, 1] -> the model's keyword-unit channels */
  fromSrgb: (r: number, g: number, b: number) => RGB
  /** keyword-unit channels + alpha byte -> ColorBits */
  toColor: (c1: number, c2: number, c3: number, alpha: number) => ColorBits
}

function rgbFromSrgb(r: number, g: number, b: number): RGB {
  return [r * 255, g * 255, b * 255]
}

function rgbToColor(r: number, g: number, b: number, alpha: number): ColorBits {
  return newColor(clampByte(r), clampByte(g), clampByte(b), alpha)
}

const F = false
const T = true

const MODELS: Record<string, Model> = {
  rgb:   { keys: ['r', 'g', 'b'], ranges: [255, 255, 255], hues: [F, F, F], fromSrgb: rgbFromSrgb, toColor: rgbToColor },
  hsl:   { keys: ['h', 's', 'l'], ranges: [360, 100, 100], hues: [T, F, F], fromSrgb: srgbToHsl,   toColor: hslToColor },
  hwb:   { keys: ['h', 'w', 'b'], ranges: [360, 100, 100], hues: [T, F, F], fromSrgb: srgbToHwb,   toColor: hwbToColor },
  lab:   { keys: ['l', 'a', 'b'], ranges: [100, 125, 125], hues: [F, F, F], fromSrgb: srgbToLab,   toColor: labToColor },
  lch:   { keys: ['l', 'c', 'h'], ranges: [100, 150, 360], hues: [F, F, T], fromSrgb: srgbToLch,   toColor: lchToColor },
  oklab: { keys: ['l', 'a', 'b'], ranges: [1, 0.4, 0.4],   hues: [F, F, F], fromSrgb: srgbToOklab, toColor: oklabToColor },
  oklch: { keys: ['l', 'c', 'h'], ranges: [1, 0.4, 360],   hues: [F, F, T], fromSrgb: srgbToOklch, toColor: oklchToColor },
}
// Legacy aliases
MODELS.rgba = MODELS.rgb
MODELS.hsla = MODELS.hsl

function colorSpaceModel(space: string): Model | null {
  const keys = colorSpaceChannels(space)
  if (keys === null) {
    return null
  }
  return {
    keys: keys as [string, string, string],
    ranges: [1, 1, 1],
    hues: [F, F, F],
    fromSrgb: (r, g, b) => srgbToColorSpace(space, r, g, b)!,
    toColor: (c1, c2, c3, alpha) => colorSpaceToColor(space, c1, c2, c3, alpha)!,
  }
}

/** Channel scope for absolute functions: no keyword resolves. */
const EMPTY_SCOPE = new Map<string, number>()

function fail(message: string): never {
  throw new Error('parseCSS(): ' + message)
}

/** Evaluate one channel token into its keyword-unit numeric value. */
function evalChannel(token: string, scope: Map<string, number>, range: number, isHue: boolean): number {
  const lower = token.toLowerCase()
  const bound = scope.get(lower)
  if (bound !== undefined) {
    return bound
  }
  let value: number
  if (lower.startsWith('calc(') || lower.startsWith('(')) {
    value = evaluateCalc(token, scope, range)
  } else if (isHue) {
    value = parseAngle(token)
  } else {
    value = parseNumberOrPercentage(token, range)
  }
  // Unknown keywords and unsupported functions (min(), …) parse as NaN; a
  // silent NaN would pack as channel 0, so reject it here.
  if (Number.isNaN(value)) {
    fail(`invalid channel value: "${token}"`)
  }
  return value
}

/**
 * Resolve a color function from its tokenized form: either a relative color
 * (`rgb(from …)`) or an absolute function with calc() channels.
 * @param tokens tokenized function
 * @param parseColor parser for the origin color (recursive; handles nested colors)
 */
export function resolveColorFunction(tokens: Tokens, parseColor: (input: string) => ColorBits): ColorBits {
  const { name } = tokens
  let args = tokens.tokens

  const isRelative = args.length > 0 && isFromKeyword(args[0])

  // Commas are invalid in relative colors; in absolute legacy forms they are
  // plain separators.
  let hadCommas = false
  if (args.indexOf(',') !== -1) {
    if (isRelative) {
      fail(`unexpected comma in relative "${name}()"`)
    }
    hadCommas = true
    args = args.filter((token) => token !== ',')
  }

  if (isRelative && args[1] === undefined) {
    fail(`missing origin color in "${name}()"`)
  }

  let model: Model | null
  let channelStart: number
  const spaceIndex = isRelative ? 2 : 0
  if (name === 'color') {
    const space = args[spaceIndex]
    model = space === undefined ? null : colorSpaceModel(space.toLowerCase())
    channelStart = spaceIndex + 1
  } else {
    model = MODELS[name] ?? null
    channelStart = spaceIndex
  }
  if (model === null) {
    fail(`unsupported color function: "${name}"`)
  }

  let origin = 0
  let scope = EMPTY_SCOPE
  if (isRelative) {
    origin = parseColor(args[1])
    const [k1, k2, k3] = model.keys
    const [v1, v2, v3] = model.fromSrgb(getRed(origin) / 255, getGreen(origin) / 255, getBlue(origin) / 255)
    scope = new Map<string, number>()
    scope.set(k1, v1)
    scope.set(k2, v2)
    scope.set(k3, v3)
    scope.set('alpha', getAlpha(origin) / 255)
  }

  const t1 = args[channelStart]
  const t2 = args[channelStart + 1]
  const t3 = args[channelStart + 2]
  if (t1 === undefined || t2 === undefined || t3 === undefined) {
    fail(`"${name}()" needs three channels`)
  }

  const c1 = evalChannel(t1, scope, model.ranges[0], model.hues[0])
  const c2 = evalChannel(t2, scope, model.ranges[1], model.hues[1])
  const c3 = evalChannel(t3, scope, model.ranges[2], model.hues[2])

  // Optional alpha: `… / <alpha>`, or a bare fourth value in legacy comma
  // syntax. Omitted alpha inherits the origin's (relative) or is opaque.
  let alphaByte = isRelative ? getAlpha(origin) : 255
  const rest = channelStart + 3
  const next = args[rest]
  if (next !== undefined) {
    if (next === '/') {
      const alphaToken = args[rest + 1]
      if (alphaToken === undefined || args[rest + 2] !== undefined) {
        fail(`invalid alpha in "${name}()"`)
      }
      alphaByte = clampByte(evalChannel(alphaToken, scope, 1, false) * 255)
    } else if (hadCommas && args[rest + 1] === undefined) {
      alphaByte = clampByte(evalChannel(next, scope, 1, false) * 255)
    } else {
      fail(`unexpected "${next}" in "${name}()"`)
    }
  }

  return model.toColor(c1, c2, c3, alphaByte)
}
