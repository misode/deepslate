import type { Holder } from '../core/index.js'
import { Identifier, Registry } from '../core/index.js'
import { NoiseParameters } from '../math/index.js'
import { DensityFunction } from './DensityFunction.js'
import { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'
import { WorldgenStructure } from './WorldgenStructure.js'

export namespace WorldgenRegistries {
	export const NOISE = register('worldgen/noise', NoiseParameters.fromJson)
	export const DENSITY_FUNCTION = register('worldgen/density_function', obj => DensityFunction.fromJson(obj))
	export const NOISE_SETTINGS = register('worldgen/noise_settings', NoiseGeneratorSettings.fromJson)
	export const STRUCTURE = register('worldgen/structure', WorldgenStructure.fromJson)
	export const BIOME = register('worldgen/biome')

	function register<T>(name: string, parser?: (obj: unknown) => T) {
		const registry = new Registry<T>(Identifier.create(name), parser)
		Registry.REGISTRY.register(registry.key, registry)
		return registry
	}

	export const SURFACE_NOISE = createNoise('surface', -6, [1, 1, 1])
	export const SURFACE_SECONDARY_NOISE = createNoise('surface_secondary', -6, [1, 1, 0, 1])

	function createNoise(name: string, firstOctave: number, amplitudes: number[]): Holder<NoiseParameters> {
		return WorldgenRegistries.NOISE.register(Identifier.create(name), NoiseParameters.create(firstOctave, amplitudes), true)
	}
}
