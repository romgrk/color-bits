import type { ColorBits } from '../core/bits'
import { getAlpha, getBlue, getGreen, getRed, newColor, setAlpha } from '../core/bits'

/**
 * Modifies color alpha channel.
 * @param color - ColorBits
 * @param value - Value in the range [0, 1]
 */
export function alpha(color: ColorBits, value: number): ColorBits {
  return setAlpha(color, Math.round(value * 255))
}

/**
 * Darkens a color.
 * @param color - ColorBits
 * @param coefficient - Multiplier in the range [0, 1]
 */
export function darken(color: ColorBits, coefficient: number): ColorBits {
  const r = getRed(color)
  const g = getGreen(color)
  const b = getBlue(color)
  const a = getAlpha(color)

  const factor = 1 - coefficient

  return newColor(
    r * factor,
    g * factor,
    b * factor,
    a,
  )
}

/**
 * Lighten a color.
 * @param color - ColorBits
 * @param coefficient - Multiplier in the range [0, 1]
 */
export function lighten(color: ColorBits, coefficient: number): ColorBits {
  const r = getRed(color)
  const g = getGreen(color)
  const b = getBlue(color)
  const a = getAlpha(color)

  return newColor(
    r + (255 - r) * coefficient,
    g + (255 - g) * coefficient,
    b + (255 - b) * coefficient,
    a,
  )
}
