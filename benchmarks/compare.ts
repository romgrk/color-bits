import { parse } from '../src/index'

// Deterministic best-of-N micro-benchmark for one case, run in an isolated
// process to avoid cross-case JIT pollution. Usage:
//   tsx benchmarks/compare.ts <case-name>
// Compare before/after a refactor by running it, then `git stash` + run again.

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

const name = process.argv[2]
const input = cases[name]
if (!input) { console.error(`unknown case: ${name}`); process.exit(1) }

const ITERATIONS = 1_000_000
const TRIALS = 15
let sink = 0

// warmup
for (let i = 0; i < 200_000; i++) sink ^= parse(input)

let best = Infinity
for (let t = 0; t < TRIALS; t++) {
  const start = process.hrtime.bigint()
  for (let i = 0; i < ITERATIONS; i++) sink ^= parse(input)
  const ns = Number(process.hrtime.bigint() - start)
  if (ns < best) best = ns
}
const opsPerSec = Math.round((ITERATIONS / best) * 1e9)
console.log(`RESULT ${name.padEnd(12)} ${opsPerSec.toString().padStart(12)} ops/s`)

if (sink === 42) console.log('') // prevent dead-code elimination
