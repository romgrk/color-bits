// Nesting-aware scanner for CSS color functions. Unlike the fast-path regex in
// parse.ts, it correctly handles nested parentheses — needed for relative colors
// whose origin can be another function (`rgb(from hsl(0 100% 50%) r g b)`) and
// for `calc(...)` channel expressions — and it keeps `/` (the alpha separator)
// as its own token.

export interface Tokens {
  /** Function name, lowercased (e.g. "rgb", "oklch", "color-mix"). */
  name: string
  /**
   * Top-level argument tokens, split on whitespace at paren depth 0. Nested
   * function calls (origins, `calc(...)`) stay whole. The separators `/` (alpha)
   * and `,` (color-mix groups) are emitted as their own "/" and "," tokens.
   */
  tokens: string[]
}

const SPACE = 32    // ' '
const TAB = 9       // '\t'
const NEWLINE = 10  // '\n'
const RETURN = 13   // '\r'
const COMMA = 44    // ','
const SLASH = 47    // '/'
const OPEN = 40     // '('
const CLOSE = 41    // ')'

function isSeparator(c: number): boolean {
  return c === SPACE || c === TAB || c === NEWLINE || c === RETURN
}

/**
 * Tokenize a CSS color function string, e.g. "oklch(from green l c h / .5)".
 * @returns the function name and its top-level tokens, or null if the input is
 *   not a function call (no parentheses).
 */
export function tokenize(input: string): Tokens | null {
  const open = input.indexOf('(')
  if (open === -1) {
    return null
  }
  const name = input.slice(0, open).trim().toLowerCase()

  // Inner content is everything between the first '(' and the matching last ')'.
  let end = input.length
  while (end > open && input.charCodeAt(end - 1) !== CLOSE) {
    end--
  }
  if (end <= open) {
    return null // unterminated
  }

  const tokens: string[] = []
  let depth = 0
  let start = -1 // start index of the current token, or -1 when between tokens

  for (let i = open + 1; i < end - 1; i++) {
    const c = input.charCodeAt(i)

    if (depth === 0 && (isSeparator(c) || c === SLASH || c === COMMA)) {
      if (start !== -1) {
        tokens.push(input.slice(start, i))
        start = -1
      }
      if (c === SLASH) {
        tokens.push('/')
      } else if (c === COMMA) {
        tokens.push(',')
      }
      continue
    }

    if (c === OPEN) {
      depth++
    } else if (c === CLOSE) {
      depth--
      if (depth < 0) {
        return null // unbalanced
      }
    }
    if (start === -1) {
      start = i
    }
  }
  if (depth !== 0) {
    return null // unbalanced
  }
  if (start !== -1) {
    tokens.push(input.slice(start, end - 1))
  }

  return { name, tokens }
}
