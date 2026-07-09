// Canonical per-colorspace channel math, in CSS Color 4 "keyword" units:
//
//   hsl:    h in degrees, s/l in 0..100
//   hwb:    h in degrees, w/b in 0..100
//   lab:    l in 0..100,  a/b raw (~ ±125)
//   lch:    l in 0..100,  c raw (~0..150),  h in degrees
//   oklab:  l in 0..1,    a/b raw (~ ±0.4)
//   oklch:  l in 0..1,    c raw (~0..0.4),  h in degrees
//   color(): channels in 0..1
//
// The forward direction (`*ToColor`) takes these units plus an alpha byte and
// returns a Color directly — no intermediate array, so the hot HSL/HWB paths
// allocate nothing. The reverse direction (`srgbTo*`) takes sRGB in [0, 1] and
// returns the channel values, for binding relative-color keywords and for
// color-mix(). Both the absolute parser (parse.ts) and the relative parser
// route through here, guaranteeing identical results for the same nominal color.

import { Color, newColor } from './core'
import * as convert from './convert'

type RGB = [number, number, number]

/** sRGB component in [0, 1] -> clamped byte in [0, 255]. */
function to255(v: number): number {
  const n = Math.round(v * 255)
  return n < 0 ? 0 : n > 255 ? 255 : n
}

/** Build a Color from sRGB components in [0, 1] and an alpha byte (0..255). */
export function srgbToColor(r: number, g: number, b: number, a: number): Color {
  return newColor(to255(r), to255(g), to255(b), a)
}

// HSL

function hueToRGB(p: number, q: number, t: number) {
  if (t < 0) { t += 1 }
  if (t > 1) { t -= 1 }
  if (t < 1 / 6) { return p + (q - p) * 6 * t }
  if (t < 1 / 2) { return q }
  if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6 }
  return p
}

/** @param h degrees @param s 0..100 @param l 0..100 @param a alpha byte */
export function hslToColor(h: number, s: number, l: number, a: number): Color {
  h /= 360
  s /= 100
  l /= 100

  if (s === 0) {
    const v = to255(l) // achromatic
    return newColor(v, v, v, a)
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return newColor(
    to255(hueToRGB(p, q, h + 1 / 3)),
    to255(hueToRGB(p, q, h)),
    to255(hueToRGB(p, q, h - 1 / 3)),
    a,
  )
}

// https://www.30secondsofcode.org/js/s/rgb-hex-hsl-hsb-color-format-conversion/
/** @param sRGB in [0, 1] @returns [h degrees, s 0..100, l 0..100] */
export function srgbToHsl(r: number, g: number, b: number): RGB {
  const max = Math.max(r, g, b)
  const s = max - Math.min(r, g, b)
  const h = s
    ? max === r
      ? (g - b) / s
      : max === g
      ? 2 + (b - r) / s
      : 4 + (r - g) / s
    : 0

  return [
    60 * h < 0 ? 60 * h + 360 : 60 * h,
    100 * (s ? (max <= 0.5 ? s / (2 * max - s) : s / (2 - (2 * max - s))) : 0),
    (100 * (2 * max - s)) / 2,
  ]
}

// HWB

/** @param h degrees @param w 0..100 @param b 0..100 @param a alpha byte */
export function hwbToColor(h: number, w: number, b: number, a: number): Color {
  w /= 100
  b /= 100
  h /= 360

  // Pure hue (HSL with s = 1, l = 0.5 reduces to p = 0, q = 1), then apply
  // whiteness/blackness: channel * (1 - w - b) + w
  const scale = 1 - w - b
  return newColor(
    to255(hueToRGB(0, 1, h + 1 / 3) * scale + w),
    to255(hueToRGB(0, 1, h) * scale + w),
    to255(hueToRGB(0, 1, h - 1 / 3) * scale + w),
    a,
  )
}

// https://stackoverflow.com/a/29463581/3112706
/** @param sRGB in [0, 1] @returns [h degrees, w 0..100, b 0..100] */
export function srgbToHwb(r: number, g: number, b: number): RGB {
  const [h] = srgbToHsl(r, g, b)
  const w = Math.min(r, g, b)
  const black = 1 - Math.max(r, g, b)
  return [h, w * 100, black * 100]
}

// Lab / LCH

/** @param l 0..100 @param a raw @param b raw @param alpha alpha byte */
export function labToColor(l: number, a: number, b: number, alpha: number): Color {
  const rgb = convert.xyzd50ToSrgb(...convert.labToXyzd50(l, a, b))
  return srgbToColor(rgb[0], rgb[1], rgb[2], alpha)
}

/** @param sRGB in [0, 1] @returns [l 0..100, a raw, b raw] */
export function srgbToLab(r: number, g: number, b: number): RGB {
  return convert.xyzd50ToLab(...convert.srgbToXyzd50(r, g, b))
}

/** @param l 0..100 @param c raw @param h degrees @param alpha alpha byte */
export function lchToColor(l: number, c: number, h: number, alpha: number): Color {
  const rgb = convert.xyzd50ToSrgb(...convert.labToXyzd50(...convert.lchToLab(l, c, h)))
  return srgbToColor(rgb[0], rgb[1], rgb[2], alpha)
}

/** @param sRGB in [0, 1] @returns [l 0..100, c raw, h degrees] */
export function srgbToLch(r: number, g: number, b: number): RGB {
  return convert.labToLch(...convert.xyzd50ToLab(...convert.srgbToXyzd50(r, g, b)))
}

// OKLab / OKLCH

/** @param l 0..1 @param a raw @param b raw @param alpha alpha byte */
export function oklabToColor(l: number, a: number, b: number, alpha: number): Color {
  const rgb = convert.xyzd50ToSrgb(...convert.xyzd65ToD50(...convert.oklabToXyzd65(l, a, b)))
  return srgbToColor(rgb[0], rgb[1], rgb[2], alpha)
}

/** @param sRGB in [0, 1] @returns [l 0..1, a raw, b raw] */
export function srgbToOklab(r: number, g: number, b: number): RGB {
  return convert.xyzd65ToOklab(...convert.xyzd50ToD65(...convert.srgbToXyzd50(r, g, b)))
}

/** @param l 0..1 @param c raw @param h degrees @param alpha alpha byte */
export function oklchToColor(l: number, c: number, h: number, alpha: number): Color {
  const rgb = convert.xyzd50ToSrgb(...convert.oklchToXyzd50(l, c, h))
  return srgbToColor(rgb[0], rgb[1], rgb[2], alpha)
}

/** @param sRGB in [0, 1] @returns [l 0..1, c raw, h degrees] */
export function srgbToOklch(r: number, g: number, b: number): RGB {
  return convert.xyzd50ToOklch(...convert.srgbToXyzd50(r, g, b))
}

// color() predefined color spaces
// https://drafts.csswg.org/css-color-4/#predefined

export type ColorSpace =
  | 'srgb' | 'srgb-linear' | 'display-p3' | 'a98-rgb' | 'prophoto-rgb' | 'rec2020'
  | 'xyz' | 'xyz-d65' | 'xyz-d50'

/** Channel keywords exposed by color(from <origin> <space> …) per color space. */
export function colorSpaceChannels(space: string): string[] | null {
  switch (space) {
    case 'srgb':
    case 'srgb-linear':
    case 'display-p3':
    case 'a98-rgb':
    case 'prophoto-rgb':
    case 'rec2020':
      return ['r', 'g', 'b']
    case 'xyz':
    case 'xyz-d65':
    case 'xyz-d50':
      return ['x', 'y', 'z']
    default:
      return null
  }
}

/** @param channels in 0..1 @returns sRGB in [0, 1], or null for an unknown space */
export function colorSpaceToSrgb(space: string, c1: number, c2: number, c3: number): RGB | null {
  switch (space) {
    case 'srgb':         return [c1, c2, c3]
    case 'srgb-linear':  return convert.xyzd50ToSrgb(...convert.srgbLinearToXyzd50(c1, c2, c3))
    case 'display-p3':   return convert.xyzd50ToSrgb(...convert.displayP3ToXyzd50(c1, c2, c3))
    case 'a98-rgb':      return convert.xyzd50ToSrgb(...convert.adobeRGBToXyzd50(c1, c2, c3))
    case 'prophoto-rgb': return convert.xyzd50ToSrgb(...convert.proPhotoToXyzd50(c1, c2, c3))
    case 'rec2020':      return convert.xyzd50ToSrgb(...convert.rec2020ToXyzd50(c1, c2, c3))
    case 'xyz':
    case 'xyz-d65':      return convert.xyzd50ToSrgb(...convert.xyzd65ToD50(c1, c2, c3))
    case 'xyz-d50':      return convert.xyzd50ToSrgb(c1, c2, c3)
    default:             return null
  }
}

/** @param channels in 0..1 @returns a Color, or null for an unknown space */
export function colorSpaceToColor(space: string, c1: number, c2: number, c3: number, alpha: number): Color | null {
  const rgb = colorSpaceToSrgb(space, c1, c2, c3)
  if (rgb === null) {
    return null
  }
  return srgbToColor(rgb[0], rgb[1], rgb[2], alpha)
}

/** @param sRGB in [0, 1] @returns the space's channels in 0..1, or null for an unknown space */
export function srgbToColorSpace(space: string, r: number, g: number, b: number): RGB | null {
  switch (space) {
    case 'srgb':         return [r, g, b]
    case 'srgb-linear':  return convert.xyzd50TosRGBLinear(...convert.srgbToXyzd50(r, g, b))
    case 'display-p3':   return convert.xyzd50ToDisplayP3(...convert.srgbToXyzd50(r, g, b))
    case 'a98-rgb':      return convert.xyzd50ToAdobeRGB(...convert.srgbToXyzd50(r, g, b))
    case 'prophoto-rgb': return convert.xyzd50ToProPhoto(...convert.srgbToXyzd50(r, g, b))
    case 'rec2020':      return convert.xyzd50ToRec2020(...convert.srgbToXyzd50(r, g, b))
    case 'xyz':
    case 'xyz-d65':      return convert.xyzd50ToD65(...convert.srgbToXyzd50(r, g, b))
    case 'xyz-d50':      return convert.srgbToXyzd50(r, g, b)
    default:             return null
  }
}
