import { Json } from '../util/index.js'

export interface WorldgenContext {
	minY: number,
	height: number,
	seaLevel: number,
}

export type VerticalAnchor = (context: WorldgenContext) => number

export namespace VerticalAnchor {
	export function fromJson(obj: unknown): VerticalAnchor {
		const root = Json.readObject(obj) ?? {}
		if (root.absolute !== undefined) {
			return absolute(Json.readNumber(root.absolute) ?? 0)
		} else if (root.above_bottom !== undefined) {
			return aboveBottom(Json.readNumber(root.above_bottom) ?? 0)
		} else if (root.below_top !== undefined) {
			return belowTop(Json.readNumber(root.below_top) ?? 0)
		} else if (root.relative_to_sea_level !== undefined) {
			return relativeToSeaLevel(Json.readNumber(root.relative_to_sea_level) ?? 0)
		}
		return () => 0
	}

	export function absolute(y: number): VerticalAnchor {
		return () => y
	}

	export function aboveBottom(offset: number): VerticalAnchor {
		return context => context.minY + offset
	}

	export function belowTop(offset: number): VerticalAnchor {
		return context => context.minY + context.height - 1 - offset
	}

	export function relativeToSeaLevel(offset: number): VerticalAnchor {
		return context => context.seaLevel + offset
	}
}

