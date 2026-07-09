// Minimal CSS calc() evaluator for relative-color channel expressions, e.g.
// `calc(l * 0.8)`, `calc(h + 120)`, `calc((r + g) / 2)`. Supports + - * /, unary
// +/-, parentheses, nested calc(), numbers, percentages and angle dimensions.
//
// Identifiers are channel keywords resolved from `scope` (e.g. r, g, b, l, h,
// alpha). Percentages resolve against `range` — the destination channel's
// reference (e.g. 255 for rgb, 1 for oklab lightness) — matching how a bare
// percentage is interpreted in that channel slot.

const ZERO = '0'.charCodeAt(0)
const NINE = '9'.charCodeAt(0)
const DOT = '.'.charCodeAt(0)
const PERCENT = '%'.charCodeAt(0)

type Token =
  | { t: 'num', v: number }
  | { t: 'id', v: string }
  | { t: 'op', v: string }
  | { t: 'lparen' }
  | { t: 'rparen' }

function isDigit(c: number): boolean {
  return (c >= ZERO && c <= NINE) || c === DOT
}

function isAlpha(c: number): boolean {
  // a-z, A-Z (identifiers like `alpha`, channel letters, angle units)
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90)
}

const ANGLE_TO_DEG: Record<string, number> = {
  deg: 1,
  grad: 360 / 400,
  rad: 180 / Math.PI,
  turn: 360,
}

function lex(input: string, range: number): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = input.length

  while (i < n) {
    const c = input.charCodeAt(i)

    if (c === 32 || c === 9 || c === 10 || c === 13) { // whitespace
      i++
      continue
    }
    if (c === 40) { tokens.push({ t: 'lparen' }); i++; continue }
    if (c === 41) { tokens.push({ t: 'rparen' }); i++; continue }
    if (c === 43 || c === 45 || c === 42 || c === 47) { // + - * /
      tokens.push({ t: 'op', v: input[i] }); i++; continue
    }

    if (isDigit(c)) {
      let j = i + 1
      while (j < n && isDigit(input.charCodeAt(j))) j++
      // scientific notation (e.g. 1e-3)
      if (j < n && (input.charCodeAt(j) === 101 || input.charCodeAt(j) === 69)) {
        j++
        if (j < n && (input.charCodeAt(j) === 43 || input.charCodeAt(j) === 45)) j++
        while (j < n && isDigit(input.charCodeAt(j))) j++
      }
      let value = parseFloat(input.slice(i, j))
      i = j
      // trailing unit: % or angle
      if (i < n && input.charCodeAt(i) === PERCENT) {
        value = (value / 100) * range
        i++
      } else {
        let u = i
        while (u < n && isAlpha(input.charCodeAt(u))) u++
        if (u > i) {
          const unit = input.slice(i, u).toLowerCase()
          const factor = ANGLE_TO_DEG[unit]
          if (factor !== undefined) {
            value *= factor
            i = u
          }
        }
      }
      tokens.push({ t: 'num', v: value })
      continue
    }

    if (isAlpha(c)) {
      let j = i + 1
      while (j < n && isAlpha(input.charCodeAt(j))) j++
      tokens.push({ t: 'id', v: input.slice(i, j).toLowerCase() })
      i = j
      continue
    }

    throw new Error(`calc(): unexpected character "${input[i]}" in "${input}"`)
  }

  return tokens
}

/**
 * Evaluate a calc() expression against channel keyword bindings.
 * @param body the expression, with or without the outer `calc(` `)`, e.g.
 *   "calc(l * 0.8)" or "l * 0.8"; nested calc() is supported
 * @param scope channel keyword bindings
 * @param range percentage reference for the destination channel
 */
export function evaluateCalc(body: string, scope: Map<string, number>, range: number): number {
  // Treat `calc(` (outer and nested) as a plain parenthesis.
  const normalized = body.replace(/calc\(/gi, '(')
  const tokens = lex(normalized, range)
  let pos = 0

  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  function parseExpr(): number {
    let value = parseTerm()
    for (;;) {
      const tok = peek()
      if (tok && tok.t === 'op' && (tok.v === '+' || tok.v === '-')) {
        next()
        const rhs = parseTerm()
        value = tok.v === '+' ? value + rhs : value - rhs
      } else {
        return value
      }
    }
  }

  function parseTerm(): number {
    let value = parseFactor()
    for (;;) {
      const tok = peek()
      if (tok && tok.t === 'op' && (tok.v === '*' || tok.v === '/')) {
        next()
        const rhs = parseFactor()
        value = tok.v === '*' ? value * rhs : value / rhs
      } else {
        return value
      }
    }
  }

  function parseFactor(): number {
    const tok = next()
    if (!tok) {
      throw new Error(`calc(): unexpected end of expression in "${body}"`)
    }
    switch (tok.t) {
      case 'num':
        return tok.v
      case 'id': {
        // constants and channel keywords
        if (tok.v === 'pi') return Math.PI
        if (tok.v === 'e') return Math.E
        if (tok.v === 'infinity') return Infinity
        if (tok.v === '-infinity') return -Infinity
        if (tok.v === 'nan') return NaN
        if (tok.v === 'none') return 0
        // `calc(` was normalized to `(`; a bare `calc` id shouldn't appear
        const bound = scope.get(tok.v)
        if (bound === undefined) {
          throw new Error(`calc(): unknown identifier "${tok.v}" in "${body}"`)
        }
        return bound
      }
      case 'op':
        if (tok.v === '-') return -parseFactor()
        if (tok.v === '+') return parseFactor()
        throw new Error(`calc(): unexpected operator "${tok.v}" in "${body}"`)
      case 'lparen': {
        const value = parseExpr()
        const close = next()
        if (!close || close.t !== 'rparen') {
          throw new Error(`calc(): expected ")" in "${body}"`)
        }
        return value
      }
      default:
        throw new Error(`calc(): unexpected token in "${body}"`)
    }
  }

  const result = parseExpr()
  if (pos !== tokens.length) {
    throw new Error(`calc(): trailing tokens in "${body}"`)
  }
  return result
}
