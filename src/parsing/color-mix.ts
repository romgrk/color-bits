import type { ColorBits } from '../core/bits'
import { colorSpaceModel } from '../conversion/channels'
import { colorMix } from '../operations/color-mix'
import type { HueMethod } from '../operations/color-mix'
import type { Tokens } from './tokenizer'

const PERCENT = 37 // '%'

function fail(message: string): never {
  throw new Error('color-mix(): ' + message)
}

/** Parse one `<color> [<percentage>]` (order-independent) color-mix argument. */
function parseColorArg(group: string[], parseColor: (input: string) => ColorBits): { color: ColorBits, p?: number } {
  let colorToken: string | undefined
  let p: number | undefined
  for (const token of group) {
    if (token.charCodeAt(token.length - 1) === PERCENT) {
      if (p !== undefined) {
        fail(`unexpected "${token}"`)
      }
      p = parseFloat(token)
    } else {
      if (colorToken !== undefined) {
        fail(`unexpected "${token}"`)
      }
      colorToken = token
    }
  }
  if (colorToken === undefined) {
    fail('missing color')
  }
  return { color: parseColor(colorToken), p }
}

/**
 * Resolve a color-mix() from its tokenized form.
 * @param tokens tokenized `color-mix(...)`
 * @param parseColor parser for the two color arguments (recursive)
 */
export function resolveColorMix(tokens: Tokens, parseColor: (input: string) => ColorBits): ColorBits {
  const groups: string[][] = [[]]
  for (const token of tokens.tokens) {
    if (token === ',') {
      groups.push([])
    } else {
      groups[groups.length - 1].push(token)
    }
  }
  if (groups.length !== 3) {
    fail('expected "in <space>, <color>, <color>"')
  }

  const inClause = groups[0].map((token) => token.toLowerCase())
  if (inClause[0] !== 'in' || inClause[1] === undefined) {
    fail('expected "in <space>, <color>, <color>"')
  }
  const space = inClause[1]

  let hue: HueMethod | undefined
  if (inClause.length !== 2) {
    const method = inClause[2]
    if (
      inClause.length !== 4 || inClause[3] !== 'hue' ||
      (method !== 'shorter' && method !== 'longer' && method !== 'increasing' && method !== 'decreasing')
    ) {
      fail(`invalid interpolation: "${groups[0].join(' ')}"`)
    }
    hue = method
  }

  const arg1 = parseColorArg(groups[1], parseColor)
  const arg2 = parseColorArg(groups[2], parseColor)

  // CSS also allows predefined color() spaces, which have no named model.
  return colorMix(arg1.color, arg2.color, { space: colorSpaceModel(space) ?? space, hue, p1: arg1.p, p2: arg2.p })
}
