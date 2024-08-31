import { cast, get, set } from './bit';

export type Color = number;

export const OFFSET_R = 24;
export const OFFSET_G = 16;
export const OFFSET_B =  8;
export const OFFSET_A =  0;

export function newColor(r: number, g: number, b: number, a: number) {
  return (
    (r << OFFSET_R) +
    (g << OFFSET_G) +
    (b << OFFSET_B) +
    (a << OFFSET_A)
  );
}

export function from(hex: number) {
  return newColor(
    get(hex, OFFSET_R),
    get(hex, OFFSET_G),
    get(hex, OFFSET_B),
    get(hex, OFFSET_A),
  );
}

export function toNumber(color: Color) {
  return cast(color);
}

export function getRed(c: Color) { return get(c, OFFSET_R); }
export function getGreen(c: Color) { return get(c, OFFSET_G); }
export function getBlue(c: Color) { return get(c, OFFSET_B); }
export function getAlpha(c: Color) { return get(c, OFFSET_A); }

export function setRed(c: Color, value: number) { return set(c, OFFSET_R, value); }
export function setGreen(c: Color, value: number) { return set(c, OFFSET_G, value); }
export function setBlue(c: Color, value: number) { return set(c, OFFSET_B, value); }
export function setAlpha(c: Color, value: number) { return set(c, OFFSET_A, value); }
