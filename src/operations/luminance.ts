import type { ColorBits } from '../core/bits'
import { getBlue, getGreen, getRed } from '../core/bits'

/**
 * The relative brightness of any point in a color space, normalized to 0 for
 * darkest black and 1 for lightest white.
 * @returns The relative brightness of the color in the range 0 - 1, with 3 digits precision
 */
export function getLuminance(color: ColorBits) {
  const r = getRed(color) / 255
  const g = getGreen(color) / 255
  const b = getBlue(color) / 255

  const apply = (v: number) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4

  const r1 = apply(r)
  const g1 = apply(g)
  const b1 = apply(b)

  return Math.round((0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1) * 1000) / 1000
}
