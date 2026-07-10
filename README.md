<h1 align="center">
  color-bits
</h1>

<p align="center">
  <b>High-performance color library</b>
</p>

This library represents RGBA colors as a single `int32` number and avoids allocating memory as much as possible while parsing, handling, and formatting colors, to provide the best possible memory and CPU efficiency. For a full technical overview, [read the blog post](https://romgrk.com/posts/color-bits/).

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
| **color-bits** | **84 428 994** | fastest        |
| @texel/color   | 7 160 587      | 91.52% slower  |
| colord         | 6 604 745      | 92.18% slower  |
| culori         | 5 223 367      | 93.81% slower  |
| tinycolor2     | 2 479 660      | 97.06% slower  |
| color          | 1 440 968      | 98.29% slower  |
| chroma-js      | 1 348 236      | 98.40% slower  |

### 🛠️ Install

```sh
pnpm install color-bits
```

### 📑 Usage

The fast `Color.parse` supports the full **CSS Color Module Level 4** color spaces in **absolute** representations (`#hex`, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`).

Named colors, **relative** colors and `color-mix()` are supported through `parseCSS()` from the separate `color-bits/css` entry, which is slower and bigger. If you don't need those features, go for `parse()`.

```tsx
import { parseCSS } from 'color-bits/css'

parseCSS('rebeccapurple')                       // named colors
parseCSS('oklab(from green l a b / 0.5)')       // relative colors
parseCSS('hsl(from red calc(h + 120) s l)')     // relative colors with calc()
parseCSS('color-mix(in oklch, red 40%, blue)')  // color-mix()

// currentColor / system colors need context, passed via `resolve`:
parseCSS('currentColor', { resolve: () => getComputedStyle(el).color })
```

**WARNING**: Due to the compact representation, `color-bits` preserves **at most 8 bits of precision for each channel**, so an operation like `lighten(color, 0.000001)` would simply return the same color with no modification. For performance reasons, the color representation is `int32`, not `uint32`. **It is expected if you see negative numbers when you print the raw color value**. Use the formatting functions to transform the color representation back into a usable format.

The named-color table lives in its own `color-bits/named` entry (`resolveNamed`, `namedColors`), and `color-mix` is also exposed programmatically over parsed colors from `color-bits/css`.

Every function is tree-shakeable, so the bundle size cost should be from 1.5kb to 3kb, depending on which functions you use. `parseCSS` and the named-color table are only pulled into your bundle if you import them.

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

The `color-bits/string` module wraps some of the functions to accept string colors as input/output, which may be useful if you're not storing the colors but just transforming them on the fly. It can be faster than calling the functions separately in some cases.

```tsx
import * as Color from 'color-bits/string'

const output = Color.alpha('#232323', 0.5) // #RRGGBBAA string
```

### Color conversion & gamut-mapping

When parsing and converting non-sRGB color spaces, `color-bits` behaves the same as browsers (Chrome in particular) do, which differs from the formal CSS spec! In technical terms: non-sRGB color spaces with a wider gamut are converted using clipping rather than gamut-mapping.

### 📜 License

I release any of the code I wrote here to the public domain. Feel free to copy/paste in part or in full without attribution.

Some parts of the codebase have been extracted from Chrome's devtools, MaterialUI, and stackoverflow, those contain a license notice or attribution in code comments, inline. Everything is MIT-compatible.

<p align="center">
  <small>🔴🟠🟡🟢🔵🟣</small>
</p>
