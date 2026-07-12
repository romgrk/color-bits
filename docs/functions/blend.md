[**color-bits**](../README.md) • **Docs**

***

[color-bits](../README.md) / blend

# Function: blend()

> **blend**(`background`, `overlay`, `opacity`, `gamma`?): [`ColorBits`](../type-aliases/ColorBits.md)

Blend (aka mix) two colors together.

## Parameters

• **background**: `number`

The background color

• **overlay**: `number`

The overlay color affected by `opacity`

• **opacity**: `number`

Opacity (alpha) for `overlay`

• **gamma?**: `number` = `1.0`

Gamma correction coefficient. `1.0` to match browser behavior, `2.2` for gamma-corrected blending.

## Returns

[`ColorBits`](../type-aliases/ColorBits.md)

## Defined in

operations/blend.ts:11
