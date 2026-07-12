import { expect } from 'chai'
import * as Color from '../index';

const c = Color.from;

describe('Color', () => {
  it('can encode/decode the representation', () => {
    const color = Color.from(0x599eff80)
    expect(Color.getRed(color)).to.equal(0x59)
    expect(Color.getGreen(color)).to.equal(0x9e)
    expect(Color.getBlue(color)).to.equal(0xff)
    expect(Color.getAlpha(color)).to.equal(0x80)
  });

  it('can set channels', () => {
    const color = Color.parse('#ffffff')
    expect(Color.setRed(color, 0)).to.equal(c(0x00ffffff))
    expect(Color.setGreen(color, 0)).to.equal(c(0xff00ffff))
    expect(Color.setBlue(color, 0)).to.equal(c(0xffff00ff))
    expect(Color.setAlpha(color, 0)).to.equal(c(0xffffff00))
  });

  describe('.parse():', () => {
    it('parses CSS hexadecimal', () => {
      expect(Color.parse('#59f')).to.equal(c(0x5599ffff));
      expect(Color.parse('#5599ff')).to.equal(c(0x5599ffff));
      expect(Color.parse('#5599ffff')).to.equal(c(0x5599ffff));
    });

    it('parses CSS color spaces', () => {
      ['rgb', 'rgba'].forEach(type => {
        expect(Color.parse(`${type}(255 153 85)`)).to.equal(c(0xff9955ff));
        expect(Color.parse(`${type}(255, 153, 85)`)).to.equal(c(0xff9955ff));
        expect(Color.parse(`${type}(255 153 85 / 50%)`)).to.equal(c(0xff995580));
        expect(Color.parse(`${type}(255 153 85 /  .5)`)).to.equal(c(0xff995580));
        expect(Color.parse(`${type}(255 153 85 / 0.5)`)).to.equal(c(0xff995580));
      });

      ['hsl', 'hsla'].forEach(type => {
        expect(Color.parse(`${type}(50deg 80% 40% / 50%)`)).to.equal(c(0xb89c1480));
        expect(Color.parse(`${type}(50deg 80% 40% / 0.5)`)).to.equal(c(0xb89c1480));
        expect(Color.parse(`${type}(0 80% 40% / 0.5)`)).to.equal(c(0xb8141480));
        expect(Color.parse(`${type}(none 80% 40% / 0.5)`)).to.equal(c(0xb8141480));
        expect(Color.parse(`${type}(1turn 80% 40% / 0.5)`)).to.equal(c(0xb8141480));
        expect(Color.parse(`${type}(400grad 80% 40% / 0.5)`)).to.equal(c(0xb8141480));
        expect(Color.parse(`${type}(0rad 80% 40% / 0.5)`)).to.equal(c(0xb8141480));
      });

      expect(Color.parse('hwb(12 50% 0%)')).to.equal(c(0xff9980ff));
      expect(Color.parse('hwb(50deg 30% 40%)')).to.equal(c(0x998c4dff));
      expect(Color.parse('hwb(0.5turn 10% 0% / .5)')).to.equal(c(0x1affff80));

      expect(Color.parse('color(srgb         1 0.5 0 / 0.5)')).to.equal(c(0xff800080))
      expect(Color.parse('color(srgb-linear  1 0.5 0 / 0.5)')).to.equal(c(0xffbc0080))
      expect(Color.parse('color(display-p3   1 0.5 0 / 0.5)')).to.equal(c(0xff760080))
      expect(Color.parse('color(a98-rgb      1 0.5 0 / 0.5)')).to.equal(c(0xff810080))
      expect(Color.parse('color(prophoto-rgb 1 0.5 0 / 0.5)')).to.equal(c(0xff630080))
      expect(Color.parse('color(rec2020      1 0.5 0 / 0.5)')).to.equal(c(0xff720080))
    });

    it('parses lab()', () => {
      expect(Color.format(Color.parse('lab(50% 40 59.5 / 0.5)'))).to.equal(Color.format(c(0xbf570080)))
    });

    it('parses lch()', () => {
      expect(Color.format(Color.parse('lch(52.2% 72.2 50 / 0.5)'))).to.equal(Color.format(c(0xcd561a80)))
    });

    it('parses oklab()', () => {
      expect(Color.format(Color.parse('oklab(40.1% 0.1143 0.045)'))).to.equal(Color.format(c(0x7d2429ff)))
    });

    it('parses oklch()', () => {
      expect(Color.format(Color.parse('oklch(40.1% 0.123 21.57)'))).to.equal(Color.format(c(0x7d2429ff)))
    });

  });

  describe('.parse() non-sRGB spaces', () => {
    it('maps full channels to white (RGB gamuts) and zero to black', () => {
      for (const space of ['srgb', 'srgb-linear', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020']) {
        expect(Color.parse(`color(${space} 1 1 1)`)).to.equal(c(0xffffffff))
      }
      for (const space of ['srgb', 'display-p3', 'prophoto-rgb', 'rec2020', 'xyz', 'xyz-d50', 'xyz-d65']) {
        expect(Color.parse(`color(${space} 0 0 0)`)).to.equal(c(0x000000ff))
      }
    });

    it('clips wide-gamut colors to sRGB, like Chrome', () => {
      expect(Color.parse('color(display-p3 1 0 0)')).to.equal(c(0xff0000ff))
      expect(Color.parse('color(display-p3 0 1 0)')).to.equal(c(0x00ff00ff))
      expect(Color.parse('color(display-p3 0 0 1)')).to.equal(c(0x0000ffff))
      expect(Color.parse('color(rec2020 1 0 0)')).to.equal(c(0xff0000ff))
    });

    it('treats angle units (deg/turn/rad/grad) equivalently', () => {
      const deg = Color.parse('hsl(120deg 80% 40%)')
      expect(Color.parse('hsl(0.3333333turn 80% 40%)')).to.equal(deg)
      expect(Color.parse('hsl(2.0943951rad 80% 40%)')).to.equal(deg)
      expect(Color.parse('hsl(133.3333grad 80% 40%)')).to.equal(deg)
    });

    it('wraps hue by 360°', () => {
      expect(Color.parse('lch(52% 72 410)')).to.equal(Color.parse('lch(52% 72 50)'))
      expect(Color.parse('oklch(60% 0.15 390)')).to.equal(Color.parse('oklch(60% 0.15 30)'))
      expect(Color.parse('hsl(480 80% 40%)')).to.equal(Color.parse('hsl(120 80% 40%)'))
    });

    it('accepts numbers or percentages for hsl saturation/lightness', () => {
      expect(Color.parse('hsl(120 50 50)')).to.equal(Color.parse('hsl(120 50% 50%)'))
    });

    it('clamps out-of-range rgb channels and alpha instead of bleeding into adjacent bytes', () => {
      expect(Color.parse('rgb(300 0 0)')).to.equal(c(0xff0000ff))
      expect(Color.parse('rgb(-10 128 0)')).to.equal(c(0x008000ff))
      expect(Color.parse('rgb(255 0 0 / 300%)')).to.equal(c(0xff0000ff))
      expect(Color.parse('rgb(255 0 0 / -1)')).to.equal(c(0xff000000))
    });

    it('clamps hsl saturation/lightness to [0%, 100%]', () => {
      expect(Color.parse('hsl(120 150% 50%)')).to.equal(Color.parse('hsl(120 100% 50%)'))
      expect(Color.parse('hsl(120 -50% 50%)')).to.equal(Color.parse('hsl(120 0% 50%)'))
    });

    it('wraps hue beyond one turn', () => {
      expect(Color.parse('hsl(810 50% 50%)')).to.equal(Color.parse('hsl(90 50% 50%)'))
      expect(Color.parse('hsl(1080 100% 50%)')).to.equal(Color.parse('hsl(0 100% 50%)'))
      expect(Color.parse('hsl(-480 100% 50%)')).to.equal(Color.parse('hsl(240 100% 50%)'))
      expect(Color.parse('hwb(770 30% 40%)')).to.equal(Color.parse('hwb(50 30% 40%)'))
    });

    it('normalizes hwb to gray when whiteness + blackness >= 100%', () => {
      expect(Color.parse('hwb(120 70% 70%)')).to.equal(c(0x808080ff))
      expect(Color.parse('hwb(0 100% 100%)')).to.equal(c(0x808080ff))
      expect(Color.parse('hwb(120 90% 30%)')).to.equal(c(0xbfbfbfff))
    });

    it('is case-insensitive for function names, units and none', () => {
      expect(Color.parse('RGB(255 153 85)')).to.equal(c(0xff9955ff))
      expect(Color.parse('HSL(50DEG 80% 40%)')).to.equal(Color.parse('hsl(50deg 80% 40%)'))
      expect(Color.parse('hsl(1TURN 80% 40%)')).to.equal(Color.parse('hsl(1turn 80% 40%)'))
      expect(Color.parse('rgb(NONE 128 64)')).to.equal(c(0x008040ff))
    });

    it('formats HSL with the correct saturation (lightness branch)', () => {
      // #993333: l = 0.4 (≤ 0.5) but max = 0.6 (> 0.5) — the branch must test lightness
      const hsl = Color.toHSLA(Color.parse('#993333'))
      expect(Math.round(hsl.s)).to.equal(50)
      expect(Math.round(hsl.l)).to.equal(40)
    });

    it('formats HSLA and HWBA in CSS syntax', () => {
      expect(Color.formatHSLA(Color.parse('#ff0000'))).to.equal('hsla(0 100% 50% / 1)')
      expect(Color.formatHWBA(Color.parse('#00ffff'))).to.equal('hwb(180 0% 0% / 1)')
    });

    it('converts to HWB with hue in degrees and w/b in 0..100', () => {
      const hwb = Color.toHWBA(Color.parse('#993333'))
      expect(hwb.h).to.equal(0)
      expect(Math.round(hwb.w)).to.equal(20)
      expect(Math.round(hwb.b)).to.equal(40)
      expect(hwb.a).to.equal(1)
      expect(Color.parse(Color.formatHWBA(Color.parse('#993333')))).to.equal(Color.parse('#993333'))
    });

    it('orients the lab/oklab a (green↔red) and b (blue↔yellow) axes', () => {
      const rgb = (color: string) => {
        const col = Color.parse(color)
        return { r: Color.getRed(col), g: Color.getGreen(col), b: Color.getBlue(col) }
      }
      const aPos = rgb('lab(60% 60 0)');   expect(aPos.r).to.be.greaterThan(aPos.g)  // +a → red
      const aNeg = rgb('lab(60% -60 0)');  expect(aNeg.g).to.be.greaterThan(aNeg.r)  // -a → green
      const bNeg = rgb('lab(60% 0 -60)');  expect(bNeg.b).to.be.greaterThan(bNeg.r)  // -b → blue
      const bPos = rgb('lab(60% 0 60)');   expect(bPos.b).to.be.lessThan(bPos.r)     // +b → yellow
      const oaPos = rgb('oklab(60% 0.15 0)');  expect(oaPos.r).to.be.greaterThan(oaPos.g)
      const oaNeg = rgb('oklab(60% -0.15 0)'); expect(oaNeg.g).to.be.greaterThan(oaNeg.r)
    });
  });
});
