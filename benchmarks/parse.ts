import b from 'benny'
import { parse } from '../src/index'

// Benchmarks the `parse` fast path across every absolute representation.
// Used as the regression gate for the channels.ts refactor: the hex hot path
// must stay flat, and the function parsers must not regress.

const cases: Record<string, string> = {
  'hex-short':  '#59f',
  'hex':        '#5599ff',
  'hex-alpha':  '#5599ff88',
  'rgb':        'rgb(255 153 85)',
  'rgb-legacy': 'rgb(255, 153, 85)',
  'rgb-alpha':  'rgb(255 153 85 / 50%)',
  'hsl':        'hsl(50deg 80% 40%)',
  'hwb':        'hwb(50deg 30% 40%)',
  'lab':        'lab(50% 40 59.5)',
  'lch':        'lch(52.2% 72.2 50)',
  'oklab':      'oklab(40.1% 0.1143 0.045)',
  'oklch':      'oklch(40.1% 0.123 21.57)',
  'color-srgb': 'color(srgb 1 0.5 0)',
  'color-p3':   'color(display-p3 1 0.5 0)',
}

b.suite(
  'Color.parse() — absolute representations',
  ...Object.entries(cases).map(([name, input]) =>
    b.add(name, () => { parse(input) })
  ),
  b.cycle(),
  b.complete((summary) => {
    for (const r of summary.results) {
      console.log(`RESULT ${r.name.padEnd(12)} ${Math.round(r.ops).toString().padStart(12)} ops/s`)
    }
  }),
)
