import { from } from './core'
import { parse } from './parse'
import * as Transform from './transform'

export function alpha(color: string, value: number) { return from(Transform.alpha(parse(color), value)) }
export function darken(color: string, value: number) { return from(Transform.darken(parse(color), value)) }
export function lighten(color: string, value: number) { return from(Transform.lighten(parse(color), value)) }
