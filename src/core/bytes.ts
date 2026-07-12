/**
 * Round and clamp a channel value to a [0, 255] byte. NaN passes through so it
 * packs as 0 in `newColor`.
 */
export function clampByte(value: number): number {
  const n = Math.round(value)
  return n < 0 ? 0 : n > 255 ? 255 : n
}
