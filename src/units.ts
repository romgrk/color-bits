// Primitive CSS value parsers shared by the absolute parser (parse.ts) and the
// relative parser (relative.ts). Kept in their own module so both paths use the
// exact same unit conventions and neither can drift from the other.
//
// Keyword and unit matching is ASCII case-insensitive, as CSS is: comparisons
// use `charCode | 0x20`, which lowercases A-Z and leaves digits, '.', '-', '+'
// and '%' unchanged.

const PERCENT = 37; // '%'
const G = 103;      // 'g'
const N = 110;      // 'n'
const D = 100;      // 'd'
const E = 101;      // 'e'

/**
 * Round and clamp a channel value to a [0, 255] byte. NaN passes through (it
 * packs as 0 in newColor), matching the lenient fast path; strict entry points
 * (parseCSS channels) reject NaN before getting here.
 */
export function clampByte(value: number): number {
  const n = Math.round(value);
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

/** ASCII case-insensitive check for the `from` keyword of relative colors. */
export function isFromKeyword(token: string): boolean {
  return token.length === 4
    && (token.charCodeAt(0) | 0x20) === 102  // 'f'
    && (token.charCodeAt(1) | 0x20) === 114  // 'r'
    && (token.charCodeAt(2) | 0x20) === 111  // 'o'
    && (token.charCodeAt(3) | 0x20) === 109; // 'm'
}

/**
 * Accepts: "50%", "128", "none"
 * https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb#values
 * @returns a value clamped to the 0 to 255 range
 */
export function parseColorChannel(channel: string): number {
  // No explicit 'none' check: parseFloat('none') is NaN, which clampByte
  // passes through and newColor packs as 0 — exactly CSS none = 0.
  if (channel.charCodeAt(channel.length - 1) === PERCENT) {
    return clampByte((parseFloat(channel) / 100) * 255);
  }
  return clampByte(parseFloat(channel));
}

/**
 * Accepts: "50%", ".5", "0.5", "none"
 * https://developer.mozilla.org/en-US/docs/Web/CSS/alpha-value
 * @returns a value clamped to the [0, 255] range
 */
export function parseAlphaChannel(channel: string): number {
  return clampByte(parseAlphaValue(channel) * 255);
}

/**
 * Accepts: "50%", ".5", "0.5", "none"
 * https://developer.mozilla.org/en-US/docs/Web/CSS/alpha-value
 * @returns a value in the [0, 1] range
 */
export function parseAlphaValue(channel: string): number {
  if ((channel.charCodeAt(0) | 0x20) === N) {
    return 0;
  }
  if (channel.charCodeAt(channel.length - 1) === PERCENT) {
    return parseFloat(channel) / 100;
  }
  return parseFloat(channel);
}

/**
 * Accepts: "360", "360deg", "400grad", "6.28rad", "1turn", "none"
 * https://developer.mozilla.org/en-US/docs/Web/CSS/angle
 * @returns a value in degrees
 */
export function parseAngle(angle: string): number {
  let factor = 1;
  switch (angle.charCodeAt(angle.length - 1) | 0x20) {
    case E: {
      // 'none'
      return 0;
    }
    case D: {
      // 'rad', 'grad'
      if ((angle.charCodeAt(Math.max(0, angle.length - 4)) | 0x20) === G) {
        // 'grad': 400grad = 360deg
        factor = 360 / 400;
      } else {
        // 'rad': 2π rad = 360deg
        factor = 360 / (2 * Math.PI); // 360 / TAU
      }
      break;
    }
    case N: {
      // 'turn': 1turn = 360deg
      factor = 360;
      break;
    }
    // case G: // 'deg', but no need to check as it's also the default
    default: {
      return parseFloat(angle); // degrees
    }
  }
  return parseFloat(angle) * factor;
}

/**
 * Accepts: "100%", "50", "none"
 * @returns the numeric value, with percentages resolved against 100 (so "50%" -> 50)
 */
export function parsePercent(value: string): number {
  if ((value.charCodeAt(0) | 0x20) === N) {
    return 0;
  }
  return parseFloat(value);
}

/**
 * Accepts: "1.0", "100%", "none"
 * @returns a value in the 0.0 to 1.0 range
 */
export function parsePercentageOrValue(value: string): number {
  if ((value.charCodeAt(0) | 0x20) === N) {
    return 0;
  }
  if (value.charCodeAt(value.length - 1) === PERCENT) {
    return parseFloat(value) / 100;
  }
  return parseFloat(value);
}

/**
 * Accepts: "100", "100%", "none"
 * @returns a raw number, with percentages resolved against @range (so "50%" -> 0.5 * range)
 */
export function parseNumberOrPercentage(value: string, range: number): number {
  if ((value.charCodeAt(0) | 0x20) === N) {
    return 0;
  }
  if (value.charCodeAt(value.length - 1) === PERCENT) {
    return (parseFloat(value) / 100) * range;
  }
  return parseFloat(value);
}
