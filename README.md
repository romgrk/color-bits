# color-bits

<small>🔴🟠🟡🟢🔵🟣</small>

Fast & efficient color manipulation library, for high-performance critical applications. This library represents RGBA colors as a single `int32` number and avoids allocating memory as much as possible while parsing, handling, and formatting colors.

### ⚡ Benchmarks

| Library        | Operations/sec | Relative speed |
| ---            | --:            | ---            |
| **color-bits** | **22 966 299** | fastest        |
| colord         | 4 308 547      | 81.24% slower  |
| tinycolor2     | 1 475 762      | 93.57% slower  |
| chroma-js      | 846 924        | 96.31% slower  |
| color          | 799 262        | 96.52% slower  |

### 📑 Technical details

Due to the compact representation, `color-bits` preserves **at most 8 bits of precision for each channel**, so an operation like `alpha(color, 0.000001)` would simply return the same color with no modification. `color-bits` supports the full **CSS Color Module Level 4** color spaces *in absolute representations only*, so `oklab(59.69% 0.1007 0.1191)` yes, `oklab(from green l a b / 0.5)` no. When parsing and converting non-sRGB color spaces, `color-bits` behaves the same as browsers behave, which differs from the formal CSS spec! In technical terms: non-sRGB color spaces with a wide gamut are converted using clipping rather than gamut-mapping.

<small>🔴🟠🟡🟢🔵🟣</small>

For efficient manipulation, you should use the `color-bits` exports directly, e.g.

```tsx
import * as Color from 'color-bits'

const background = Color.parse('#232323')
const seeThrough = Color.alpha(backround, 0.5)
const output = Color.format(seeThrough)
```

The `color-bits/string` exports wrap some of the functions to accept string colors as input/output, which may be used if you're not storing the colors but just transforming them on the fly.

```tsx
import * as Color from 'color-bits/string'

const background = '#232323'
const output = Color.alpha(backround, 0.5)
```

[Documentation: `'color-bits'`](https://github.com/romgrk/color-bits/tree/master/docs/README.md)  
[Documentation: `'color-bits/string'`](https://github.com/romgrk/color-bits/tree/master/docs/string/README.md)  
