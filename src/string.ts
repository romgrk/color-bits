import * as Color from './'

const {
  format,
  parse,
  alpha: alphaBase,
  blend: blendBase,
  darken: darkenBase,
  lighten: lightenBase,
  getLuminance: getLuminanceBase,
} = Color

export function alpha(color: string, value: number) { return format(alphaBase(parse(color), value)) }
export function blend(background: string, overlay: string, opacity: number, gamma: number) { return format(blendBase(parse(background), parse(overlay), opacity, gamma)) }
export function darken(color: string, value: number) { return format(darkenBase(parse(color), value)) }
export function lighten(color: string, value: number) { return format(lightenBase(parse(color), value)) }
export function getLuminance(color: string) { return getLuminanceBase(parse(color)) }
