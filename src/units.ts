// Primitive CSS value parsers shared by the absolute parser (parse.ts) and the
// relative parser (relative.ts). Kept in their own module so both paths use the
// exact same unit conventions and neither can drift from the other.

const PERCENT = '%'.charCodeAt(0);
const G = 'g'.charCodeAt(0);
const N = 'n'.charCodeAt(0);
const D = 'd'.charCodeAt(0);
const E = 'e'.charCodeAt(0);

/**
 * Accepts: "50%", "128"
 * https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb#values
 * @returns a value in the 0 to 255 range
 */
export function parseColorChannel(channel: string): number {
  if (channel.charCodeAt(channel.length - 1) === PERCENT) {
    return Math.round((parseFloat(channel) / 100) * 255);
  }
  return Math.round(parseFloat(channel));
}

/**
 * Accepts: "50%", ".5", "0.5"
 * https://developer.mozilla.org/en-US/docs/Web/CSS/alpha-value
 * @returns a value in the [0, 255] range
 */
export function parseAlphaChannel(channel: string): number {
  return Math.round(parseAlphaValue(channel) * 255);
}

/**
 * Accepts: "50%", ".5", "0.5", "none"
 * https://developer.mozilla.org/en-US/docs/Web/CSS/alpha-value
 * @returns a value in the [0, 1] range
 */
export function parseAlphaValue(channel: string): number {
  if (channel.charCodeAt(0) === N) {
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
  switch (angle.charCodeAt(angle.length - 1)) {
    case E: {
      // 'none'
      return 0;
    }
    case D: {
      // 'rad', 'grad'
      if (angle.charCodeAt(Math.max(0, angle.length - 4)) === G) {
        // 'grad': 400grad = 360deg
        factor = 400 / 360;
      } else {
        // 'rad': 2π rad = 360deg
        factor = (2 * Math.PI) / 360; // TAU / 360
      }
      break;
    }
    case N: {
      // 'turn': 1turn = 360deg
      factor = 1 / 360;
      break;
    }
    // case G: // 'deg', but no need to check as it's also the default
    default: {
      factor = 1;
    }
  }
  return parseFloat(angle) / factor;
}

/**
 * Accepts: "100%", "50", "none"
 * @returns the numeric value, with percentages resolved against 100 (so "50%" -> 50)
 */
export function parsePercent(value: string): number {
  if (value.charCodeAt(0) === N) {
    return 0;
  }
  return parseFloat(value);
}

/**
 * Accepts: "1.0", "100%", "none"
 * @returns a value in the 0.0 to 1.0 range
 */
export function parsePercentageOrValue(value: string): number {
  if (value.charCodeAt(0) === N) {
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
  if (value.charCodeAt(0) === N) {
    return 0;
  }
  if (value.charCodeAt(value.length - 1) === PERCENT) {
    return (parseFloat(value) / 100) * range;
  }
  return parseFloat(value);
}
