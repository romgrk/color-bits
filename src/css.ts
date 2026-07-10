// Full CSS Color parser: everything the fast `parse` handles (hex + absolute
// functions) plus named colors, relative colors (`from …`), calc() channels
// and color-mix(). This is the batteries-included entry (`color-bits/css`);
// importing it pulls in the named-color table and the relative/color-mix
// machinery, which is why it is kept separate from the lean `parse` core.

import { Color } from './core'
import { parse, parseHex } from './parse'
import { tokenize } from './tokenize'
import { resolveNamed } from './namedColors'
import { resolveColorFunction } from './relative'
import { resolveColorMix } from './color-mix'

export { colorMix } from './color-mix'
export type { HueMethod, ColorMixOptions } from './color-mix'
export { resolveNamed, namedColors } from './namedColors'

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

const HASH = 35  // '#'
const CLOSE = 41 // ')'

/** Guard against resolvers that keep answering with unresolvable strings. */
const MAX_DEPTH = 32

function isSpace(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 13
}

const COLOR_MIX = 'color-mix'

/** ASCII case-insensitive check that the function name is `color-mix`. */
function isColorMixName(color: string, open: number): boolean {
  if (open !== COLOR_MIX.length) {
    return false
  }
  for (let i = 0; i < COLOR_MIX.length; i++) {
    if ((color.charCodeAt(i) | 0x20) !== COLOR_MIX.charCodeAt(i)) {
      return false
    }
  }
  return true
}

/** ASCII case-insensitive check that the first argument is the `from` keyword. */
function firstArgIsFrom(color: string, open: number): boolean {
  let i = open + 1
  while (i < color.length && isSpace(color.charCodeAt(i))) {
    i++
  }
  return (
    i + 4 < color.length
    && (color.charCodeAt(i) | 0x20) === 102     // 'f'
    && (color.charCodeAt(i + 1) | 0x20) === 114 // 'r'
    && (color.charCodeAt(i + 2) | 0x20) === 111 // 'o'
    && (color.charCodeAt(i + 3) | 0x20) === 109 // 'm'
    && isSpace(color.charCodeAt(i + 4))
  )
}

/**
 * Parse any CSS Color Module 4/5 color: hex, named colors, rgb()/hsl()/hwb()/
 * lab()/lch()/oklab()/oklch()/color(), their relative `from …` forms, calc()
 * channels, and color-mix(). For `currentColor`/system colors, pass
 * `options.resolve`.
 */
export function parseCSS(input: string, options?: ParseCSSOptions): Color {
  return parseAny(input, options, 0)
}

function invalid(color: string): never {
  throw new Error(`parseCSS(): invalid CSS color: "${color}"`)
}

function parseAny(input: string, options: ParseCSSOptions | undefined, depth: number): Color {
  if (depth > MAX_DEPTH) {
    throw new Error(`parseCSS(): too many nested color references: "${input}"`)
  }
  const color = input.trim()

  if (color.charCodeAt(0) === HASH) {
    return parseHex(color)
  }

  const open = color.indexOf('(')
  if (open === -1) {
    // Bare identifier: named color, transparent, currentColor, system color.
    const named = resolveNamed(color)
    if (named !== null) {
      return named
    }
    return resolveExternal(color, options, depth)
  }

  if (color.charCodeAt(color.length - 1) !== CLOSE) {
    invalid(color)
  }

  // Slow forms — color-mix(), relative `from` colors, and nested calc()/
  // functions — need the nesting-aware tokenizer. Everything else (the common
  // case) goes straight to the fast path and scans the string only once.
  if (isColorMixName(color, open) || firstArgIsFrom(color, open) || color.indexOf('(', open + 1) !== -1) {
    const tokens = tokenize(color)
    if (tokens === null) {
      invalid(color)
    }
    const parseNested = (nested: string) => parseAny(nested, options, depth + 1)
    if (tokens.name === 'color-mix') {
      return resolveColorMix(tokens, parseNested)
    }
    return resolveColorFunction(tokens, parseNested)
  }

  // Absolute function: delegate to the fast path.
  return parse(color)
}

function resolveExternal(name: string, options: ParseCSSOptions | undefined, depth: number): Color {
  const resolve = options?.resolve
  if (resolve) {
    const result = resolve(name)
    if (result !== null && result !== undefined) {
      return typeof result === 'number' ? result : parseAny(result, options, depth + 1)
    }
  }
  throw new Error(`parseCSS(): unknown color: "${name}"`)
}
