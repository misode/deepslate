import { BlockState } from '../core/index.js'
import { Json } from '../util/index.js'
import { AquiferConfig } from './Aquifer.js'
import { MaterialRule } from './MaterialSystem.js'
import { NoiseRouter } from './NoiseRouter.js'
import { NoiseSettings } from './NoiseSettings.js'

export interface NoiseGeneratorSettings {
	noise: NoiseSettings,
	defaultBlock: BlockState,
	defaultFluid: BlockState,
	noiseRouter: NoiseRouter,
	materialRule: MaterialRule,
	seaLevel: number,
	aquifers: AquiferConfig | undefined,
	legacyRandomSource: boolean,
}

export namespace NoiseGeneratorSettings {
	export function fromJson(obj: unknown): NoiseGeneratorSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			noise: NoiseSettings.fromJson(root.noise),
			defaultBlock: BlockState.fromJson(root.default_block),
			defaultFluid: BlockState.fromJson(root.default_fluid),
			noiseRouter: NoiseRouter.fromJson(root.noise_router),
			materialRule: MaterialRule.fromJson(root.material_rule),
			seaLevel: Json.readInt(root.sea_level) ?? 0,
			aquifers: root.aquifers ? AquiferConfig.fromJson(root.aquifers) : undefined,
			legacyRandomSource: Json.readBoolean(root.legacy_random_source) ?? false,
		}
	}

	export function create(settings: Partial<NoiseGeneratorSettings>): NoiseGeneratorSettings {
		return {
			noise: NoiseSettings.create({}),
			defaultBlock: BlockState.STONE,
			defaultFluid: BlockState.WATER,
			noiseRouter: NoiseRouter.create({}),
			materialRule: MaterialRule.NOOP,
			seaLevel: 0,
			aquifers: undefined,
			legacyRandomSource: false,
			...settings,
		}
	}
}
