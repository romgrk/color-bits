**color-bits** • **Docs**

***

# color-bits

🔴🟠🟡🟢🔵🟣

Fast & efficient color manipulation library, for high-performance critical applications. This library represents RGBA colors as a single `int32` number and avoids allocating memory as much as possible while parsing, handling, and formatting colors.

### Technical tradeoffs

Due to the compact representation, `color-bits` preserves at most 8 bits of precision for each channel, so an operation like `alpha(color, 0.000001)` would simply return the same color with no modification.

`color-bits` supports the full CSS Color Module Level 4 color spaces *in absolute representations only*, so `oklab(59.69% 0.1007 0.1191)` yes, `oklab(from green l a b / 0.5)` no. When parsing and converting non-sRGB color spaces, `color-bits` behaves the same as browsers behave, which differs from the formal CSS spec! (In technical terms: non-sRGB color spaces with a wide gamut are converted using clipping rather than gamut-mapping).

🔴🟠🟡🟢🔵🟣

[Documentation: `'color-bits'`](https://github.com/romgrk/color-bits/tree/master/docs/README.md)  
[Documentation: `'color-bits/string'`](https://github.com/romgrk/color-bits/tree/master/docs/string/README.md)

## Type Aliases

- [Color](type-aliases/Color.md)

## Variables

- [OFFSET\_A](variables/OFFSET_A.md)
- [OFFSET\_B](variables/OFFSET_B.md)
- [OFFSET\_G](variables/OFFSET_G.md)
- [OFFSET\_R](variables/OFFSET_R.md)

## Functions

- [alpha](functions/alpha.md)
- [blend](functions/blend.md)
- [darken](functions/darken.md)
- [format](functions/format.md)
- [formatHSLA](functions/formatHSLA.md)
- [formatHWBA](functions/formatHWBA.md)
- [formatRGBA](functions/formatRGBA.md)
- [from](functions/from.md)
- [getAlpha](functions/getAlpha.md)
- [getBlue](functions/getBlue.md)
- [getGreen](functions/getGreen.md)
- [getLuminance](functions/getLuminance.md)
- [getRed](functions/getRed.md)
- [lighten](functions/lighten.md)
- [newColor](functions/newColor.md)
- [parse](functions/parse.md)
- [parseColor](functions/parseColor.md)
- [parseHex](functions/parseHex.md)
- [setAlpha](functions/setAlpha.md)
- [setBlue](functions/setBlue.md)
- [setGreen](functions/setGreen.md)
- [setRed](functions/setRed.md)
- [toHSLA](functions/toHSLA.md)
- [toHWBA](functions/toHWBA.md)
- [toNumber](functions/toNumber.md)
- [toRGBA](functions/toRGBA.md)
