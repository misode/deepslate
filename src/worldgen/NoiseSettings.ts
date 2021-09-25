import { Json } from '../core'
import { NoiseSamplingSettings } from '../math'

export type NoiseSettings = {
	minY: number,
	height: number,
	xzSize: number,
	ySize: number,
	densityFactor: number,
	densityOffset: number,
	sampling: NoiseSamplingSettings,
	topSlide: NoiseSlideSettings,
	bottomSlide: NoiseSlideSettings,
	useSimplexSurfaceNoise: boolean,
	randomDensityOffset: boolean,
	islandNoiseOverride: boolean,
	isAmplified: boolean,
	useLegacyRandom: boolean,
}
export namespace NoiseSettings {
	export function fromJson(obj: any): NoiseSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			minY: Json.readInt(root.min_y) ?? 0,
			height: Json.readInt(root.height) ?? 256,
			xzSize: Json.readInt(root.size_horizontal) ?? 1,
			ySize: Json.readInt(root.size_vertical) ?? 1,
			densityFactor: Json.readNumber(root.density_factor) ?? 0,
			densityOffset: Json.readNumber(root.density_offset) ?? 0,
			sampling: NoiseSamplingSettings.fromJson(root.sampling),
			topSlide: NoiseSlideSettings.fromJson(root.top_slide),
			bottomSlide: NoiseSlideSettings.fromJson(root.bottom_slide),
			useSimplexSurfaceNoise: Json.readBoolean(root.simplex_surface_noise) ?? false,
			randomDensityOffset: Json.readBoolean(root.random_density_offset) ?? false,
			islandNoiseOverride: Json.readBoolean(root.island_noise_override) ?? false,
			isAmplified: Json.readBoolean(root.amplified) ?? false,
			useLegacyRandom: Json.readBoolean(root.use_legacy_random) ?? false,
		}
	}
}

export type NoiseSlideSettings = {
	target: number,
	size: number,
	offset: number,
}
export namespace NoiseSlideSettings {
	export function fromJson(obj: unknown): NoiseSlideSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			target: Json.readNumber(root.target) ?? 0,
			size: Json.readInt(root.size) ?? 0,
			offset: Json.readInt(root.offset) ?? 0,
		}
	}
}
