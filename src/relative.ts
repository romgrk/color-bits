// Relative color resolution, e.g. `oklch(from green calc(l * 0.8) c h / 0.5)`.
//
// The origin color is parsed (recursively, via the injected `parseColor`), then
// expressed in the destination color model's channels as keyword bindings. Each
// output channel is a keyword, a number/percentage/angle, `none`, or a calc()
// expression over those keywords. Results route through the same channels.ts
// math as the absolute parser, so absolute and relative agree.

import { Color, newColor, getRed, getGreen, getBlue, getAlpha } from './core'
import type { Tokens } from './tokenize'
import { evaluateCalc } from './calc'
import { parseAngle, parseNumberOrPercentage } from './units'
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

type RGB = [number, number, number]

interface Model {
  keys: [string, string, string]
  /** percentage reference per channel (e.g. 255 for rgb, 1 for oklab L) */
  ranges: [number, number, number]
  /** whether each channel is a hue angle */
  hues: [boolean, boolean, boolean]
  /** sRGB in [0, 1] -> the model's keyword-unit channels */
  fromSrgb: (r: number, g: number, b: number) => RGB
  /** keyword-unit channels + alpha byte -> Color */
  toColor: (c1: number, c2: number, c3: number, alpha: number) => Color
}

function clampByte(value: number): number {
  const n = Math.round(value)
  return n < 0 ? 0 : n > 255 ? 255 : n
}

function rgbFromSrgb(r: number, g: number, b: number): RGB {
  return [r * 255, g * 255, b * 255]
}

function rgbToColor(r: number, g: number, b: number, alpha: number): Color {
  return newColor(clampByte(r), clampByte(g), clampByte(b), alpha)
}

const F = false
const T = true

const MODELS: Record<string, Model> = {
  rgb:   { keys: ['r', 'g', 'b'], ranges: [255, 255, 255], hues: [F, F, F], fromSrgb: rgbFromSrgb, toColor: rgbToColor },
  rgba:  { keys: ['r', 'g', 'b'], ranges: [255, 255, 255], hues: [F, F, F], fromSrgb: rgbFromSrgb, toColor: rgbToColor },
  hsl:   { keys: ['h', 's', 'l'], ranges: [360, 100, 100], hues: [T, F, F], fromSrgb: srgbToHsl,   toColor: hslToColor },
  hsla:  { keys: ['h', 's', 'l'], ranges: [360, 100, 100], hues: [T, F, F], fromSrgb: srgbToHsl,   toColor: hslToColor },
  hwb:   { keys: ['h', 'w', 'b'], ranges: [360, 100, 100], hues: [T, F, F], fromSrgb: srgbToHwb,   toColor: hwbToColor },
  lab:   { keys: ['l', 'a', 'b'], ranges: [100, 125, 125], hues: [F, F, F], fromSrgb: srgbToLab,   toColor: labToColor },
  lch:   { keys: ['l', 'c', 'h'], ranges: [100, 150, 360], hues: [F, F, T], fromSrgb: srgbToLch,   toColor: lchToColor },
  oklab: { keys: ['l', 'a', 'b'], ranges: [1, 0.4, 0.4],   hues: [F, F, F], fromSrgb: srgbToOklab, toColor: oklabToColor },
  oklch: { keys: ['l', 'c', 'h'], ranges: [1, 0.4, 360],   hues: [F, F, T], fromSrgb: srgbToOklch, toColor: oklchToColor },
}

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

/** Evaluate one channel token into its keyword-unit numeric value. */
function evalChannel(token: string, scope: Map<string, number>, range: number, isHue: boolean): number {
  const lower = token.toLowerCase()
  const bound = scope.get(lower)
  if (bound !== undefined) {
    return bound
  }
  if (lower.startsWith('calc(') || lower.startsWith('(')) {
    return evaluateCalc(token, scope, range)
  }
  if (isHue) {
    return parseAngle(token)
  }
  return parseNumberOrPercentage(token, range)
}

/**
 * Resolve a relative color from its tokenized form.
 * @param tokens tokenized function (must start with a `from` argument)
 * @param parseColor parser for the origin color (recursive; handles nested colors)
 */
export function resolveRelative(tokens: Tokens, parseColor: (input: string) => Color): Color {
  const { name, tokens: args } = tokens

  const origin = parseColor(args[1])
  const r = getRed(origin) / 255
  const g = getGreen(origin) / 255
  const b = getBlue(origin) / 255
  const originAlpha = getAlpha(origin) / 255

  let model: Model | null
  let channelStart: number
  if (name === 'color') {
    model = colorSpaceModel(args[2] ? args[2].toLowerCase() : '')
    channelStart = 3
  } else {
    model = MODELS[name] ?? null
    channelStart = 2
  }
  if (model === null) {
    throw new Error(`parseCSS(): unsupported relative color function: "${name}"`)
  }

  const t1 = args[channelStart]
  const t2 = args[channelStart + 1]
  const t3 = args[channelStart + 2]
  if (t1 === undefined || t2 === undefined || t3 === undefined) {
    throw new Error(`parseCSS(): relative "${name}" needs three channels`)
  }

  const [k1, k2, k3] = model.keys
  const [v1, v2, v3] = model.fromSrgb(r, g, b)
  const scope = new Map<string, number>()
  scope.set(k1, v1)
  scope.set(k2, v2)
  scope.set(k3, v3)
  scope.set('alpha', originAlpha)

  const c1 = evalChannel(t1, scope, model.ranges[0], model.hues[0])
  const c2 = evalChannel(t2, scope, model.ranges[1], model.hues[1])
  const c3 = evalChannel(t3, scope, model.ranges[2], model.hues[2])

  // Optional alpha: `… / <alpha>`. Omitted alpha inherits the origin's.
  let alphaByte = getAlpha(origin)
  if (args[channelStart + 3] === '/') {
    const alphaToken = args[channelStart + 4]
    if (alphaToken !== undefined) {
      alphaByte = clampByte(evalChannel(alphaToken, scope, 1, false) * 255)
    }
  }

  return model.toColor(c1, c2, c3, alphaByte)
}
