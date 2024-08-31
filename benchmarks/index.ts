import b from 'benny'
import { alpha as colorBitsAlpha } from '../src/string'
import { colord } from 'colord'
import tinycolor2 from 'tinycolor2'
import color from 'color'
import chroma from 'chroma-js'

const input = '#808080'

b.suite(
  `Parse color, set to 0.5 opacity, and convert back to hexadecimal`,

  b.add('color-bits', () => {
    colorBitsAlpha(input, 0.5)
  }),

  b.add('colord', () => {
    colord(input).alpha(0.5).toHex()
  }),

  b.add('color', () => {
    color(input).alpha(0.5).hex()
  }),

  b.add('tinycolor2', () => {
    tinycolor2(input).setAlpha(0.5).toHexString()
  }),

  b.add('chroma-js', () => {
    chroma(input).alpha(0.5).hex()
  }),

  b.cycle(),
  b.complete()
)
