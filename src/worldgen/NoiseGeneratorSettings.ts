import { BlockState } from '../core/index.js'
import { Json } from '../util/index.js'
import type { SimpleNoiseRouter } from './NoiseRouter.js'
import { NoiseRouter } from './NoiseRouter.js'
import { NoiseSettings } from './NoiseSettings.js'
import { SurfaceRule } from './SurfaceSystem.js'

export interface NoiseGeneratorSettings {
	noise: NoiseSettings,
	surfaceRule: SurfaceRule,
	defaultBlock: BlockState,
	defaultFluid: BlockState,
	noiseRouter: SimpleNoiseRouter,
	seaLevel: number,
	disableMobGeneration: boolean,
	aquifersEnabled: boolean,
	oreVeinsEnabled: boolean,
	legacyRandomSource: boolean,
}

export namespace NoiseGeneratorSettings {
	export function fromJson(obj: unknown): NoiseGeneratorSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			surfaceRule: SurfaceRule.fromJson(root.surface_rule),
			noise: NoiseSettings.fromJson(root.noise),
			defaultBlock: BlockState.fromJson(root.default_block),
			defaultFluid: BlockState.fromJson(root.default_fluid),
			noiseRouter: NoiseRouter.fromJson(root.noise_router),
			seaLevel: Json.readInt(root.sea_level) ?? 0,
			disableMobGeneration: Json.readBoolean(root.disable_mob_generation) ?? false,
			aquifersEnabled: Json.readBoolean(root.aquifers_enabled) ?? false,
			oreVeinsEnabled: Json.readBoolean(root.ore_veins_enabled) ?? false,
			legacyRandomSource: Json.readBoolean(root.legacy_random_source) ?? false,
		}
	}
}
