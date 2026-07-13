// Regression net for the out-buffer conversion layer: every reverse
// conversion writes into a caller-owned Float64Array, several modules share
// module-level scratch buffers, and colorMix mixes in place. These tests
// target the failure modes of that design: partial writes leaving stale
// channels, state leaking between interleaved calls, endpoint buffers
// aliasing each other, and scratch reuse across nested parses.

import { expect } from 'chai'
import * as Color from '../index'
import { parseCSS, colorMix, colorSpaceModel } from '../css'
import type { ColorModel } from '../conversion/channels'
import {
  colorModel,
  colorSpaceToColor,
  colorSpaceToSrgb,
  srgbToColorSpace,
  srgbToHsl,
  srgbToHwb,
  srgbToLab,
  srgbToLch,
  srgbToOklab,
  srgbToOklch,
} from '../conversion/channels'
import { newColor, getRed, getGreen, getBlue } from '../core/bits'
import { clampByte } from '../core/bytes'

const hex = (color: number) => Color.formatHEXA(color)

const MODEL_NAMES = ['hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch']
const SPACE_NAMES = [
  'srgb', 'srgb-linear', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020',
  'xyz', 'xyz-d65', 'xyz-d50',
]

const REVERSE_FNS: Array<[string, (r: number, g: number, b: number, out: Float64Array) => Float64Array]> = [
  ['srgbToHsl', srgbToHsl],
  ['srgbToHwb', srgbToHwb],
  ['srgbToLab', srgbToLab],
  ['srgbToLch', srgbToLch],
  ['srgbToOklab', srgbToOklab],
  ['srgbToOklch', srgbToOklch],
]

// Grid plus edge/oddball colors: black, white, achromatic grays (missing-hue
// paths), pure primaries (hue boundaries), and arbitrary mixed bytes.
const SAMPLE: number[] = []
for (const r of [0, 51, 119, 187, 255]) {
  for (const g of [0, 51, 119, 187, 255]) {
    for (const b of [0, 51, 119, 187, 255]) {
      SAMPLE.push(newColor(r, g, b, 255))
    }
  }
}
SAMPLE.push(
  newColor(128, 128, 128, 255),
  newColor(255, 0, 0, 255),
  newColor(0, 255, 0, 255),
  newColor(0, 0, 255, 255),
  newColor(18, 52, 86, 255),
  newColor(254, 220, 186, 255),
)

describe('out-buffer conversions', () => {
  describe('reverse conversions', () => {
    it('write every channel of the out buffer', () => {
      for (const [name, fn] of REVERSE_FNS) {
        const out = Float64Array.of(NaN, NaN, NaN)
        fn(0.2, 0.4, 0.6, out)
        expect(Array.from(out).every(Number.isFinite), name).to.equal(true)
      }
      for (const space of SPACE_NAMES) {
        const out = Float64Array.of(NaN, NaN, NaN)
        expect(srgbToColorSpace(space, 0.2, 0.4, 0.6, out), `srgbToColorSpace ${space}`).to.equal(out)
        expect(Array.from(out).every(Number.isFinite), `srgbToColorSpace ${space}`).to.equal(true)

        out.fill(NaN)
        expect(colorSpaceToSrgb(space, 0.2, 0.4, 0.6, out), `colorSpaceToSrgb ${space}`).to.equal(out)
        expect(Array.from(out).every(Number.isFinite), `colorSpaceToSrgb ${space}`).to.equal(true)
      }
    })

    it('are pure: interleaved calls with other inputs do not change results', () => {
      for (const [name, fn] of REVERSE_FNS) {
        const first = new Float64Array(3)
        const other = new Float64Array(3)
        const again = new Float64Array(3)
        fn(1, 0, 0, first)
        fn(0.3, 0.9, 0.5, other)
        fn(1, 0, 0, again)
        expect(Array.from(again), name).to.deep.equal(Array.from(first))
      }
      for (const space of SPACE_NAMES) {
        const first = colorSpaceToColor(space, 0.2, 0.4, 0.6, 255)
        colorSpaceToColor(space, 0.9, 0.1, 0.5, 128)
        const again = colorSpaceToColor(space, 0.2, 0.4, 0.6, 255)
        expect(again, `colorSpaceToColor ${space}`).to.equal(first)
      }
    })

    it('round-trips every color model byte-exactly', () => {
      for (const name of MODEL_NAMES) {
        const model = colorModel(name)!
        const out = new Float64Array(3)
        for (const color of SAMPLE) {
          model.fromSrgb(getRed(color) / 255, getGreen(color) / 255, getBlue(color) / 255, out)
          const back = model.toColor(out[0], out[1], out[2], 255)
          expect(hex(back), `${name} ${hex(color)}`).to.equal(hex(color))
        }
      }
    })

    it('round-trips every color() space byte-exactly', () => {
      const out = new Float64Array(3)
      for (const space of SPACE_NAMES) {
        for (const color of SAMPLE) {
          srgbToColorSpace(space, getRed(color) / 255, getGreen(color) / 255, getBlue(color) / 255, out)
          const back = colorSpaceToColor(space, out[0], out[1], out[2], 255)
          expect(back === null ? 'null' : hex(back), `${space} ${hex(color)}`).to.equal(hex(color))
        }
      }
    })

    it('return null for unknown spaces', () => {
      const out = new Float64Array(3)
      expect(srgbToColorSpace('not-a-space', 0.1, 0.2, 0.3, out)).to.equal(null)
      expect(colorSpaceToSrgb('not-a-space', 0.1, 0.2, 0.3, out)).to.equal(null)
      expect(colorSpaceToColor('not-a-space', 0.1, 0.2, 0.3, 255)).to.equal(null)
    })
  })

  describe('colorMix endpoint buffers', () => {
    const COLORS = [
      parseCSS('#5599ff'),
      parseCSS('rgba(20 200 100 / 0.5)'),
      parseCSS('#808080'),
      parseCSS('#ff0000'),
    ]
    const SPACES: Array<[string, string | ColorModel]> = [
      ...MODEL_NAMES.map((name): [string, string | ColorModel] => [name, name]),
      ...SPACE_NAMES.map((name): [string, string | ColorModel] => [name, colorSpaceModel(name)!]),
    ]

    it('mixing a color with itself is the identity', () => {
      for (const [label, space] of SPACES) {
        for (const color of COLORS) {
          expect(hex(colorMix(color, color, { space })), `${label} ${hex(color)}`).to.equal(hex(color))
        }
      }
    })

    it('mixes 50/50 commutatively', () => {
      for (const [label, space] of SPACES) {
        for (const a of COLORS) {
          for (const b of COLORS) {
            expect(hex(colorMix(a, b, { space })), `${label} ${hex(a)} ${hex(b)}`)
              .to.equal(hex(colorMix(b, a, { space })))
          }
        }
      }
    })

    it('accepts a custom model whose fromSrgb ignores the out buffer', () => {
      const rawSrgb: ColorModel = {
        keys: ['r', 'g', 'b'],
        ranges: [1, 1, 1],
        hues: [false, false, false],
        fromSrgb: (r, g, b) => Float64Array.of(r, g, b),
        toColor: (r, g, b, alpha) => newColor(clampByte(r * 255), clampByte(g * 255), clampByte(b * 255), alpha),
      }
      const red = parseCSS('red')
      const blue = parseCSS('rgba(0 0 255 / 0.5)')
      expect(hex(colorMix(red, blue, { space: rawSrgb })))
        .to.equal(hex(colorMix(red, blue, { space: colorSpaceModel('srgb')! })))
    })
  })

  describe('relative-color origin scratch', () => {
    it('identity round-trips reproduce the origin for every model', () => {
      for (const color of ['#5599ff', '#808080', '#123456']) {
        const expected = hex(parseCSS(color))
        expect(hex(parseCSS(`rgb(from ${color} r g b)`)), `rgb ${color}`).to.equal(expected)
        expect(hex(parseCSS(`hsl(from ${color} h s l)`)), `hsl ${color}`).to.equal(expected)
        expect(hex(parseCSS(`hwb(from ${color} h w b)`)), `hwb ${color}`).to.equal(expected)
        expect(hex(parseCSS(`lab(from ${color} l a b)`)), `lab ${color}`).to.equal(expected)
        expect(hex(parseCSS(`lch(from ${color} l c h)`)), `lch ${color}`).to.equal(expected)
        expect(hex(parseCSS(`oklab(from ${color} l a b)`)), `oklab ${color}`).to.equal(expected)
        expect(hex(parseCSS(`oklch(from ${color} l c h)`)), `oklch ${color}`).to.equal(expected)
        for (const space of SPACE_NAMES) {
          const keys = space.startsWith('xyz') ? 'x y z' : 'r g b'
          expect(hex(parseCSS(`color(from ${color} ${space} ${keys})`)), `${space} ${color}`).to.equal(expected)
        }
      }
    })

    it('nested from-origins resolve correctly', () => {
      expect(parseCSS('oklch(from oklch(from #5599ff l c h) l c h)'))
        .to.equal(parseCSS('oklch(from #5599ff l c h)'))
      expect(parseCSS('lab(from hsl(from #5599ff h s l) l a b)'))
        .to.equal(parseCSS('lab(from #5599ff l a b)'))
    })
  })

  describe('formatting scratch', () => {
    it('consecutive calls do not corrupt each other', () => {
      const red = parseCSS('#ff0000')
      const blue = parseCSS('#0000ff')
      const first = Color.toHSLA(red)
      Color.toHSLA(blue)
      expect(Color.toHSLA(red)).to.deep.equal(first)
      expect(first).to.deep.equal({ h: 0, s: 100, l: 50, a: 1 })
      expect(Color.formatHWBA(red)).to.equal('hwb(0 0% 0% / 1)')
      expect(Color.toHWBA(blue)).to.deep.equal({ h: 240, w: 0, b: 0, a: 1 })
    })
  })
})
