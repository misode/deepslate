import { clampedLerp } from '../math'
import { Json } from '../util'

export type NoiseSettings = {
	minY: number,
	height: number,
	xzSize: number,
	ySize: number,
	topSlide: NoiseSlideSettings,
	bottomSlide: NoiseSlideSettings
}
export namespace NoiseSettings {
	export function fromJson(obj: any): NoiseSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			minY: Json.readInt(root.min_y) ?? 0,
			height: Json.readInt(root.height) ?? 256,
			xzSize: Json.readInt(root.size_horizontal) ?? 1,
			ySize: Json.readInt(root.size_vertical) ?? 1,
			topSlide: NoiseSlideSettings.fromJson(root.top_slide),
			bottomSlide: NoiseSlideSettings.fromJson(root.bottom_slide),
		}
	}

	export function cellHeight(settings: NoiseSettings) {
		return settings.ySize << 2
	}

	export function cellWidth(settings: NoiseSettings) {
		return settings.xzSize << 2
	}

	export function cellCountY(settings: NoiseSettings) {
		return settings.height / cellHeight(settings)
	}

	export function minCellY(settings: NoiseSettings) {
		return Math.floor(settings.minY / cellHeight(settings))
	}

	export function applySlides(settings: NoiseSettings, density: number, y: number) {
		const yCell = Math.floor(y / cellHeight(settings)) - NoiseSettings.minCellY(settings)
		density = NoiseSlideSettings.apply(settings.topSlide, density, NoiseSettings.cellCountY(settings) - yCell)
		density = NoiseSlideSettings.apply(settings.bottomSlide, density, yCell)
		return density
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

	export function apply(slide: NoiseSlideSettings, density: number, y: number) {
		if (slide.size <= 0) return density
		const t = (y - slide.offset) / slide.size
		return clampedLerp(slide.target, density, t)
	}
}
