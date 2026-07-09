import { expect } from 'chai'
import * as Color from './index'
import { parseCSS, colorMix } from './css'
import { resolveNamed, namedColors } from './named'

const c = Color.from
const hex = (color: number) => Color.formatHEXA(color)

describe('CSS Color 4/5', () => {
  describe('named colors', () => {
    it('resolves named colors (case-insensitive)', () => {
      expect(resolveNamed('rebeccapurple')).to.equal(c(0x663399ff))
      expect(resolveNamed('GREEN')).to.equal(c(0x008000ff))
      expect(resolveNamed('transparent')).to.equal(c(0x00000000))
    })
    it('returns null for unknown / prototype keys', () => {
      expect(resolveNamed('notacolor')).to.equal(null)
      expect(resolveNamed('toString')).to.equal(null)
      expect(resolveNamed('hasOwnProperty')).to.equal(null)
    })
    it('exposes the raw namedColors map', () => {
      expect(namedColors.green).to.equal(Color.parse('#008000'))
    })
    it('parseCSS resolves named colors', () => {
      expect(parseCSS('rebeccapurple')).to.equal(c(0x663399ff))
      expect(parseCSS('transparent')).to.equal(c(0x00000000))
    })
  })

  describe('parseCSS still handles the fast subset', () => {
    it('hex and absolute functions', () => {
      expect(parseCSS('#59f')).to.equal(c(0x5599ffff))
      expect(parseCSS('rgb(255 153 85)')).to.equal(c(0xff9955ff))
      expect(parseCSS('hsl(50deg 80% 40%)')).to.equal(Color.parse('hsl(50deg 80% 40%)'))
    })
  })

  describe('fast parse() rejects relative colors', () => {
    it('throws instead of returning garbage', () => {
      expect(() => Color.parse('rgb(from red r g b)')).to.throw()
    })
  })

  describe('relative colors', () => {
    it('identity round-trips reproduce the origin', () => {
      expect(parseCSS('rgb(from red r g b)')).to.equal(c(0xff0000ff))
      expect(parseCSS('hsl(from red h s l)')).to.equal(c(0xff0000ff))
      expect(parseCSS('hwb(from red h w b)')).to.equal(c(0xff0000ff))
      expect(parseCSS('lab(from white l a b)')).to.equal(c(0xffffffff))
      expect(parseCSS('lch(from green l c h)')).to.equal(c(0x008000ff))
      expect(parseCSS('oklab(from green l a b)')).to.equal(c(0x008000ff))
      expect(parseCSS('oklch(from green l c h)')).to.equal(c(0x008000ff))
      expect(parseCSS('color(from red display-p3 r g b)')).to.equal(c(0xff0000ff))
      expect(parseCSS('color(from green xyz x y z)')).to.equal(c(0x008000ff))
    })
    it('overrides channels with numbers and percentages', () => {
      expect(parseCSS('rgb(from red 0 g b)')).to.equal(c(0x000000ff))
      expect(parseCSS('rgb(from red r g 255)')).to.equal(c(0xff00ffff))
      expect(parseCSS('rgb(from red r g b / 50%)')).to.equal(c(0xff000080))
    })
    it('evaluates calc() over channel keywords', () => {
      expect(parseCSS('rgb(from red calc(r * 0.5) g b)')).to.equal(c(0x800000ff))
      expect(parseCSS('hsl(from red calc(h + 120) s l)')).to.equal(c(0x00ff00ff))
    })
    it('inherits the origin alpha when omitted', () => {
      expect(parseCSS('rgb(from #ff000080 r g b)')).to.equal(c(0xff000080))
    })
    it('supports named and nested origins', () => {
      expect(parseCSS('rgb(from rebeccapurple r g b)')).to.equal(c(0x663399ff))
      expect(parseCSS('rgb(from rgb(255 0 0) r g b)')).to.equal(c(0xff0000ff))
    })
  })

  describe('color-mix()', () => {
    it('mixes in sRGB', () => {
      expect(parseCSS('color-mix(in srgb, red, blue)')).to.equal(c(0x800080ff))
      expect(parseCSS('color-mix(in srgb, red 100%, blue)')).to.equal(c(0xff0000ff))
    })
    it('mixes in HSL with hue interpolation methods', () => {
      expect(parseCSS('color-mix(in hsl, red, blue)')).to.equal(c(0xff00ffff))
      expect(parseCSS('color-mix(in hsl longer hue, red, blue)')).to.equal(c(0x00ff00ff))
    })
    it('handles premultiplied alpha', () => {
      expect(parseCSS('color-mix(in srgb, red 50%, transparent)')).to.equal(c(0xff000080))
    })
    it('exposes a programmatic colorMix over parsed colors', () => {
      const red = Color.parse('#ff0000')
      const blue = Color.parse('#0000ff')
      expect(colorMix(red, blue, { space: 'srgb' })).to.equal(c(0x800080ff))
    })
  })

  describe('resolver hook', () => {
    it('resolves currentColor / system colors via options.resolve', () => {
      expect(parseCSS('currentColor', { resolve: () => '#123456' })).to.equal(c(0x123456ff))
      expect(parseCSS('Canvas', { resolve: () => Color.parse('#ffffff') })).to.equal(c(0xffffffff))
    })
    it('throws for unresolved keywords', () => {
      expect(() => parseCSS('currentColor')).to.throw()
      expect(() => parseCSS('notacolor')).to.throw()
    })
  })
})
