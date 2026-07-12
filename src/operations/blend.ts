import type { ColorBits } from '../core/bits'
import { getBlue, getGreen, getRed, newColor } from '../core/bits'

/**
 * Blend (aka mix) two colors together.
 * @param background The background color
 * @param overlay The overlay color affected by `opacity`
 * @param opacity Opacity (alpha) for `overlay`
 * @param [gamma=1.0] Gamma correction coefficient. `1.0` to match browser behavior, `2.2` for gamma-corrected blending.
 */
export function blend(background: ColorBits, overlay: ColorBits, opacity: number, gamma = 1.0): ColorBits {
  const blendChannel = (b: number, o: number) =>
    Math.round((b ** (1 / gamma) * (1 - opacity) + o ** (1 / gamma) * opacity) ** gamma)

  const r = blendChannel(getRed(background), getRed(overlay))
  const g = blendChannel(getGreen(background), getGreen(overlay))
  const b = blendChannel(getBlue(background), getBlue(overlay))

  return newColor(r, g, b, 255)
}
