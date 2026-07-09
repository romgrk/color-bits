import { Color, newColor } from './core';
import {
  hslToColor,
  hwbToColor,
  labToColor,
  lchToColor,
  oklabToColor,
  oklchToColor,
  colorSpaceToColor,
} from './channels'
import {
  parseColorChannel,
  parseAlphaChannel,
  parseAngle,
  parsePercent,
  parsePercentageOrValue,
  parseNumberOrPercentage,
} from './units'

const HASH = '#'.charCodeAt(0);

/**
 * Approximative CSS colorspace string pattern, e.g. rgb(), color()
 */
const PATTERN = (() => {
  const NAME = '(\\w+)'
  const SEPARATOR = '[\\s,\\/]'
  const VALUE = '([^\\s,\\/]+)'
  const SEPARATOR_THEN_VALUE = `(?:${SEPARATOR}+${VALUE})`

  return new RegExp(
    `${NAME}\\(
      ${SEPARATOR}*
      ${VALUE}
      ${SEPARATOR_THEN_VALUE}
      ${SEPARATOR_THEN_VALUE}
      ${SEPARATOR_THEN_VALUE}?
      ${SEPARATOR_THEN_VALUE}?
      ${SEPARATOR}*
    \\)`.replace(/\s/g, '')
  )
})();


/**
 * Parse CSS color. Fast path: supports hexadecimal and the absolute forms of
 * every CSS color function. For named colors, relative colors (`from …`) and
 * `color-mix()`, use `parseCSS` from `color-bits/css`.
 * @param color CSS color string: #xxx, #xxxxxx, #xxxxxxxx, rgb(), rgba(), hsl(), hsla(), color()
 */
export function parse(color: string): Color {
  if (color.charCodeAt(0) === HASH) {
    return parseHex(color);
  } else {
    return parseColor(color);
  }
}

/**
 * Parse hexadecimal CSS color
 * @param color Hex color string: #xxx, #xxxxxx, #xxxxxxxx
 */
export function parseHex(color: string): Color {
  let r = 0x00;
  let g = 0x00;
  let b = 0x00;
  let a = 0xff;

  switch (color.length) {
    // #59f
    case 4: {
      r = (hexValue(color.charCodeAt(1)) << 4) + hexValue(color.charCodeAt(1));
      g = (hexValue(color.charCodeAt(2)) << 4) + hexValue(color.charCodeAt(2));
      b = (hexValue(color.charCodeAt(3)) << 4) + hexValue(color.charCodeAt(3));
      break;
    }
    // #5599ff
    case 7: {
      r = (hexValue(color.charCodeAt(1)) << 4) + hexValue(color.charCodeAt(2));
      g = (hexValue(color.charCodeAt(3)) << 4) + hexValue(color.charCodeAt(4));
      b = (hexValue(color.charCodeAt(5)) << 4) + hexValue(color.charCodeAt(6));
      break;
    }
    // #5599ff88
    case 9: {
      r = (hexValue(color.charCodeAt(1)) << 4) + hexValue(color.charCodeAt(2));
      g = (hexValue(color.charCodeAt(3)) << 4) + hexValue(color.charCodeAt(4));
      b = (hexValue(color.charCodeAt(5)) << 4) + hexValue(color.charCodeAt(6));
      a = (hexValue(color.charCodeAt(7)) << 4) + hexValue(color.charCodeAt(8));
      break;
    }
    default: {
      break;
    }
  }

  return newColor(r, g, b, a)
}

// https://lemire.me/blog/2019/04/17/parsing-short-hexadecimal-strings-efficiently/
function hexValue(c: number) {
  return (c & 0xF) + 9 * (c >> 6)
}


/**
 * Parse CSS color
 * https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
 * @param color CSS color string: rgb(), rgba(), hsl(), hsla(), color()
 */
export function parseColor(color: string): Color {
  const match = PATTERN.exec(color);
  if (match === null) {
    throw new Error(`Color.parse(): invalid CSS color: "${color}"`);
  }

  const format = match[1];
  const p1 = match[2];
  const p2 = match[3];
  const p3 = match[4];
  const p4 = match[5];
  const p5 = match[6];

  // Relative colors (`rgb(from …)`) are not handled by the fast path.
  if (p1 === 'from') {
    throw new Error(`Color.parse(): relative colors require parseCSS() from "color-bits/css": "${color}"`);
  }

  switch (format) {
    case 'rgb':
    case 'rgba': {
      const r = parseColorChannel(p1);
      const g = parseColorChannel(p2);
      const b = parseColorChannel(p3);
      const a = p4 ? parseAlphaChannel(p4) : 255;

      return newColor(r, g, b, a);
    }
    case 'hsl':
    case 'hsla': {
      const h = parseAngle(p1);
      const s = parsePercent(p2);
      const l = parsePercent(p3);
      const a = p4 ? parseAlphaChannel(p4) : 255;

      return hslToColor(h, s, l, a);
    }
    case 'hwb': {
      const h = parseAngle(p1);
      const w = parsePercent(p2);
      const b = parsePercent(p3);
      const a = p4 ? parseAlphaChannel(p4) : 255;

      return hwbToColor(h, w, b, a);
    }
    case 'lab': {
      const l = parseNumberOrPercentage(p1, 100);
      const aa = parseNumberOrPercentage(p2, 125);
      const b = parseNumberOrPercentage(p3, 125);
      const a = p4 ? parseAlphaChannel(p4) : 255;

      return labToColor(l, aa, b, a);
    }
    case 'lch': {
      const l = parseNumberOrPercentage(p1, 100);
      const c = parseNumberOrPercentage(p2, 150);
      const h = parseAngle(p3);
      const a = p4 ? parseAlphaChannel(p4) : 255;

      return lchToColor(l, c, h, a);
    }
    case 'oklab': {
      const l = parseNumberOrPercentage(p1, 1);
      const aa = parseNumberOrPercentage(p2, 0.4);
      const b = parseNumberOrPercentage(p3, 0.4);
      const a = p4 ? parseAlphaChannel(p4) : 255;

      return oklabToColor(l, aa, b, a);
    }
    case 'oklch': {
      const l = parseNumberOrPercentage(p1, 1);
      const c = parseNumberOrPercentage(p2, 0.4);
      const h = parseAngle(p3);
      const a = p4 ? parseAlphaChannel(p4) : 255;

      return oklchToColor(l, c, h, a);
    }
    case 'color': {
      // https://drafts.csswg.org/css-color-4/#color-function
      const colorspace = p1;
      const c1 = parsePercentageOrValue(p2);
      const c2 = parsePercentageOrValue(p3);
      const c3 = parsePercentageOrValue(p4);
      const a = p5 ? parseAlphaChannel(p5) : 255;

      const result = colorSpaceToColor(colorspace, c1, c2, c3, a);
      if (result !== null) {
        return result;
      }
      break;
    }
    default:
  }
  throw new Error(`Color.parse(): invalid CSS color: "${color}"`);
}
