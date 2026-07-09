// Full CSS Color parser: everything the fast `parse` handles (hex + absolute
// functions) plus named colors, relative colors (`from …`) and color-mix().
// This is the batteries-included entry (`color-bits/css`); importing it pulls in
// the named-color table and the relative/color-mix machinery, which is why it is
// kept separate from the lean `parse` core.

import { Color } from './core'
import { parse, parseHex } from './parse'
import { tokenize } from './tokenize'
import { resolveNamed } from './named'
import { resolveRelative } from './relative'
import { resolveColorMix } from './color-mix'

export { colorMix } from './color-mix'
export type { HueMethod, ColorMixOptions } from './color-mix'
export { resolveNamed, namedColors } from './named'

/**
 * Resolves a color keyword that has no fixed value — `currentColor` and system
 * colors (e.g. `Canvas`, `ButtonText`). Return a Color, a CSS color string, or
 * null if unresolved. In the browser this is typically backed by
 * `getComputedStyle`.
 */
export type ColorResolver = (name: string) => Color | string | null

export interface ParseCSSOptions {
  resolve?: ColorResolver
}

const HASH = '#'.charCodeAt(0)

/**
 * Parse any CSS Color Module 4/5 color: hex, named colors, rgb()/hsl()/hwb()/
 * lab()/lch()/oklab()/oklch()/color(), their relative `from …` forms, and
 * color-mix(). For `currentColor`/system colors, pass `options.resolve`.
 */
export function parseCSS(input: string, options?: ParseCSSOptions): Color {
  const color = input.trim()

  if (color.charCodeAt(0) === HASH) {
    return parseHex(color)
  }

  const tokens = tokenize(color)
  if (tokens === null) {
    // Bare identifier: named color, transparent, currentColor, system color.
    const named = resolveNamed(color)
    if (named !== null) {
      return named
    }
    return resolveExternal(color, options)
  }

  if (tokens.name === 'color-mix') {
    return resolveColorMix(tokens, (input) => parseCSS(input, options))
  }
  if (tokens.tokens[0] === 'from') {
    return resolveRelative(tokens, (input) => parseCSS(input, options))
  }

  // Absolute function: delegate to the fast path.
  return parse(color)
}

function resolveExternal(name: string, options: ParseCSSOptions | undefined): Color {
  const resolve = options?.resolve
  if (resolve) {
    const result = resolve(name)
    if (result !== null && result !== undefined) {
      return typeof result === 'number' ? result : parseCSS(result, options)
    }
  }
  throw new Error(`parseCSS(): unknown color: "${name}"`)
}
