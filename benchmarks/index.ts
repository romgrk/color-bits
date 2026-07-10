import b from 'benny'
import { alpha as colorBitsAlpha } from '../src/string'
import { colord } from 'colord'
import tinycolor2 from 'tinycolor2'
import color from 'color'
import chroma from 'chroma-js'
import { parse as culoriParse, formatHex8 as culoriFormatHex8 } from 'culori'

const input = '#808080'

async function main() {
  // @texel/color is ESM-only; load it dynamically so this file still runs under tsx's CJS.
  const { hexToRGB, RGBToHex } = (await import('@texel/color')) as any

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

    b.add('culori', () => {
      culoriFormatHex8({ ...culoriParse(input), alpha: 0.5 })
    }),

    b.add('@texel/color', () => {
      const rgb = hexToRGB(input)
      rgb[3] = 0.5
      RGBToHex(rgb)
    }),

    b.cycle(),
    b.complete((summary: any) => {
      for (const r of summary.results) {
        console.log(`RESULT ${r.name.padEnd(14)} ${Math.round(r.ops).toString().padStart(12)} ops/s`)
      }
    }),
  )
}

main()
