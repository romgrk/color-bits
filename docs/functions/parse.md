[**color-bits**](../README.md) • **Docs**

***

[color-bits](../README.md) / parse

# Function: parse()

> **parse**(`color`): [`ColorBits`](../type-aliases/ColorBits.md)

Parse CSS color. Fast path: supports hexadecimal and the absolute forms of
every CSS color function. For named colors, relative colors (`from …`) and
`color-mix()`, use `parseCSS` from `color-bits/css`.

## Parameters

• **color**: `string`

CSS color string: #xxx, #xxxxxx, #xxxxxxxx, rgb(), rgba(), hsl(), hsla(), color()

## Returns

[`ColorBits`](../type-aliases/ColorBits.md)

## Defined in

parsing/fast.ts:52
