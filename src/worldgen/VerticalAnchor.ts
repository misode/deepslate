import { Json } from '../util/index.js'
import type { NoiseSettings } from './NoiseSettings.js'

export type VerticalAnchor = (context: NoiseSettings) => number

export namespace VerticalAnchor {
	export function fromJson(obj: unknown): VerticalAnchor {
		const root = Json.readObject(obj) ?? {}
		if (root.absolute !== undefined) {
			return absolute(Json.readNumber(root.absolute) ?? 0)
		} else if (root.above_bottom !== undefined) {
			return aboveBottom(Json.readNumber(root.above_bottom) ?? 0)
		} else if (root.below_top !== undefined) {
			return belowTop(Json.readNumber(root.below_top) ?? 0)
		}
		return () => 0
	}

	export function absolute(value: number): VerticalAnchor {
		return () => value
	}

	export function aboveBottom(value: number): VerticalAnchor {
		return context => context.minY + value
	}

	export function belowTop(value: number): VerticalAnchor {
		return context => context.minY + context.height - 1 - value
	}
}

