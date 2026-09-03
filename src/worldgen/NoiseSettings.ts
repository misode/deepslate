import { Json } from '../util/index.js'

export type NoiseSettings = {
	minY: number,
	height: number,
}
export namespace NoiseSettings {
	export function fromJson(obj: any): NoiseSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			minY: Json.readInt(root.min_y) ?? 0,
			height: Json.readInt(root.height) ?? 256,
		}
	}

	export function create(settings: Partial<NoiseSettings>): NoiseSettings {
		return {
			minY: 0,
			height: 256,
			...settings,
		}
	}
}
