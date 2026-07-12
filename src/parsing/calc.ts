// Minimal CSS calc() evaluator for relative-color channel expressions, e.g.
// `calc(l * 0.8)`, `calc(h + 120)`, `calc((r + g) / 2)`. Supports + - * /, unary
// +/-, parentheses, nested calc(), numbers, percentages and angle dimensions.
//
// Identifiers are channel keywords resolved from `scope` (e.g. r, g, b, l, h,
// alpha). Percentages resolve against `range` — the destination channel's
// reference (e.g. 255 for rgb, 1 for oklab lightness) — matching how a bare
// percentage is interpreted in that channel slot.

const ZERO = 48    // '0'
const NINE = 57    // '9'
const DOT = 46     // '.'
const PERCENT = 37 // '%'

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

/** A complete CSS <number>: the lexer's digit scan can overshoot (e.g. "1.2.3", "2e"). */
const NUMBER = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

function fail(message: string, input: string): never {
  throw new Error(`calc(): ${message} in "${input}"`)
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
      const raw = input.slice(i, j)
      if (!NUMBER.test(raw)) {
        fail(`invalid number "${raw}"`, input)
      }
      let value = parseFloat(raw)
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
      const id = input.slice(i, j).toLowerCase()
      i = j
      // `calc(` (outer and nested) reads as a plain parenthesis
      if (id === 'calc' && i < n && input.charCodeAt(i) === 40) {
        continue
      }
      tokens.push({ t: 'id', v: id })
      continue
    }

    fail(`unexpected character "${input[i]}"`, input)
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
  const tokens = lex(body, range)
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
      fail('unexpected end of expression', body)
    }
    switch (tok.t) {
      case 'num':
        return tok.v
      case 'id': {
        // constants and channel keywords
        if (tok.v === 'pi') return Math.PI
        if (tok.v === 'e') return Math.E
        if (tok.v === 'infinity') return Infinity
        if (tok.v === 'nan') return NaN
        if (tok.v === 'none') return 0
        const bound = scope.get(tok.v)
        if (bound === undefined) {
          fail(`unknown identifier "${tok.v}"`, body)
        }
        return bound
      }
      case 'op':
        if (tok.v === '-') return -parseFactor()
        if (tok.v === '+') return parseFactor()
        fail(`unexpected "${tok.v}"`, body)
      case 'lparen': {
        const value = parseExpr()
        const close = next()
        if (!close || close.t !== 'rparen') {
          fail('expected ")"', body)
        }
        return value
      }
      default:
        fail('unexpected token', body)
    }
  }

  const result = parseExpr()
  if (pos !== tokens.length) {
    fail('trailing tokens', body)
  }
  return result
}
