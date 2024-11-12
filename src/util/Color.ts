import { Json } from "./Json.js"

export type Color = [number, number, number]

export namespace Color {
	export function fromJson(obj: unknown): Color | undefined {
		const packed = Json.readNumber(obj)
		if (packed) return intToRgb(packed)
		const array = Json.readArray(obj, o => Json.readNumber(o) ?? 0)
		if (array === undefined || array.length !== 3) return undefined
		return array as [number, number, number]
	}

	export function intToRgb(n: number): Color {
		const r = (n >> 16) & 255
		const g = (n >> 8) & 255
		const b = n & 255
		return [r / 255, g / 255, b / 255]
	}
}