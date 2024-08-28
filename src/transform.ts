import {
  Color,
  getRed,
  getGreen,
  getBlue,
  getAlpha,
  setAlpha,
  newColor,
} from './core';

/**
 * Modifies color alpha channel.
 * @param color - Color
 * @param value - Value in the range [0, 1]
 */
export function alpha(color: Color, value: number): Color {
  return setAlpha(color, Math.round(value * 255))
}

/**
 * Darkens a color.
 * @param color - Color
 * @param coefficient - Multiplier in the range [0, 1]
 */
export function darken(color: Color, coefficient: number): Color {
  const r = getRed(color);
  const g = getGreen(color);
  const b = getBlue(color);
  const a = getAlpha(color);

  const factor = 1 - coefficient;

  return newColor(
    r * factor,
    g * factor,
    b * factor,
    a,
  )
}

/**
 * Lighten a color.
 * @param color - Color
 * @param coefficient - Multiplier in the range [0, 1]
 */
export function lighten(color: Color, coefficient: number): Color {
  const r = getRed(color);
  const g = getGreen(color);
  const b = getBlue(color);
  const a = getAlpha(color);

  return newColor(
    r + (255 - r) * coefficient,
    g + (255 - g) * coefficient,
    b + (255 - b) * coefficient,
    a,
  )
}
