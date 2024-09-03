<h1 align="center">
  color-bits
</h1>

<p align="center">
  <b>High-performance color library</b>
</p>

This library represents RGBA colors as a single `int32` number and avoids allocating memory as much as possible while parsing, handling, and formatting colors, to provide the best possible memory and CPU efficiency.

<p align="center">
  <a href="#-benchmarks">Benchmarks</a> •
  <a href="#-install">Install</a> •
  <a href="#-technical-details">Technical details</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <small>🔴🟠🟡🟢🔵🟣</small>
</p>

### ⚡ Benchmarks

| Library        | Operations/sec | Relative speed |
| ---            | --:            | ---            |
| **color-bits** | **22 966 299** | fastest        |
| colord         | 4 308 547      | 81.24% slower  |
| tinycolor2     | 1 475 762      | 93.57% slower  |
| chroma-js      | 846 924        | 96.31% slower  |
| color          | 799 262        | 96.52% slower  |

### 🛠️ Install

```sh
pnpm install color-bits
```

### 📑 Technical details

Due to the compact representation, `color-bits` preserves **at most 8 bits of precision for each channel**, so an operation like `alpha(color, 0.000001)` would simply return the same color with no modification.

`color-bits` supports the full **CSS Color Module Level 4** color spaces **in absolute representations only**, so:
 - Yes: `oklab(59.69% 0.1007 0.1191)`
 - No: `oklab(from green l a b / 0.5)`

When parsing and converting non-sRGB color spaces, `color-bits` behaves the same as browsers behave, which differs from the formal CSS spec! In technical terms: non-sRGB color spaces with a wider gamut are converted using clipping rather than gamut-mapping.

For performance reasons, the representation is `int32`, not `uint32`. It is expected if you see negative numbers when you print the color value.

Every function is tree-shakeable, so the bundle size cost should be from 1.5kb to 3kb, depending on which functions you use.

### 📚 Documentation

[Docs for color-bits](https://github.com/romgrk/color-bits/tree/master/docs/README.md)  
[Docs for color-bits/string](https://github.com/romgrk/color-bits/tree/master/docs/string/README.md)  

If you're storing and manipulating colors frequently, you should use the `color-bits` exports directly, e.g.

```tsx
import * as Color from 'color-bits'

const background = Color.parse('#232323')
const seeThrough = Color.alpha(background, 0.5)
const output = Color.format(seeThrough) // #RRGGBBAA string
```

The `color-bits/string` module wraps some of the functions to accept string colors as input/output, which may be useful if you're not storing the colors but just transforming them on the fly. It can be faster than calling the functions yourself like the example above in some cases.

```tsx
import * as Color from 'color-bits/string'

const output = Color.alpha('#232323', 0.5) // #RRGGBBAA string
```

### 📜 License

I release any of the code I wrote here to the public domain. Feel free to copy/paste in part or in full without attribution.

Some parts of the codebase have been extracted from Chrome's devtools, MaterialUI, and stackoverflow, those contain a license notice or attribution in code comments, inline.

<p align="center">
  <small>🔴🟠🟡🟢🔵🟣</small>
</p>
