import b from 'benny'
import { alpha as colorBitsAlpha } from '../src/string'
import chroma from 'chroma-js'
import { parse as culoriParse, formatHex8 as culoriFormatHex8 } from 'culori'

const input = 'oklab(40.1% 0.1143 0.045)'

async function main() {
  // @texel/color is ESM-only; load it dynamically so this file still runs under tsx's CJS.
  const { parse: texelParse, sRGB, RGBToHex } = (await import('@texel/color')) as any

  b.suite(
    'Parse an OKLab color, set to 0.5 opacity, and convert back to hexadecimal',

    b.add('color-bits', () => {
      colorBitsAlpha(input, 0.5)
    }),

    b.add('chroma-js', () => {
      chroma(input).alpha(0.5).hex()
    }),

    b.add('culori', () => {
      const parsed = culoriParse(input)!
      parsed.alpha = 0.5
      culoriFormatHex8(parsed)
    }),

    b.add('@texel/color', () => {
      const rgb = texelParse(input, sRGB)
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
