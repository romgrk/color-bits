// Bits
//
// The color representation would ideally be 32-bits unsigned, but JS bitwise
// operators only work as 32-bits signed. The range of Smi values on V8 is also
// 32-bits signed. Those two factors make it that it's much more efficient to just
// use signed integers to represent the data.
//
// Colors with a R channel >= 0x80 will be a negative number, but that's not really
// an issue at any point because the bits for signed and unsigned integers are always
// the same, only their interpretation changes.

const INT32_TO_UINT32_OFFSET = 2 ** 32;

export type ColorBits = number;
export type Color = ColorBits;

export const OFFSET_R = 24;
export const OFFSET_G = 16;
export const OFFSET_B =  8;
export const OFFSET_A =  0;

/**
 * Creates a new color from the given RGBA components.
 * Every component should be in the [0, 255] range.
 */
export function newColor(r: number, g: number, b: number, a: number): ColorBits {
  return (
    (r << OFFSET_R) +
    (g << OFFSET_G) +
    (b << OFFSET_B) +
    (a << OFFSET_A)
  );
}

/**
 * Creates a new color from the given number value, e.g. 0x599eff.
 */
export function from(color: number): ColorBits {
  return newColor(
    get(color, OFFSET_R),
    get(color, OFFSET_G),
    get(color, OFFSET_B),
    get(color, OFFSET_A),
  );
}

/**
 * Turns the color into its equivalent number representation.
 * This is essentially a cast from int32 to uint32.
 */
export function toNumber(color: ColorBits) {
  return cast(color);
}

export function getRed(c: ColorBits) { return get(c, OFFSET_R); }
export function getGreen(c: ColorBits) { return get(c, OFFSET_G); }
export function getBlue(c: ColorBits) { return get(c, OFFSET_B); }
export function getAlpha(c: ColorBits) { return get(c, OFFSET_A); }

export function setRed(c: ColorBits, value: number): ColorBits { return set(c, OFFSET_R, value); }
export function setGreen(c: ColorBits, value: number): ColorBits { return set(c, OFFSET_G, value); }
export function setBlue(c: ColorBits, value: number): ColorBits { return set(c, OFFSET_B, value); }
export function setAlpha(c: ColorBits, value: number): ColorBits { return set(c, OFFSET_A, value); }

/* Bitwise functions */

function cast(n: number) {
  if (n < 0) {
    return n + INT32_TO_UINT32_OFFSET;
  }
  return n;
}

function get(n: number, offset: number) {
  return (n >> offset) & 0xff;
}

function set(n: number, offset: number, byte: number) {
  return n ^ ((n ^ (byte << offset)) & (0xff << offset));
}
