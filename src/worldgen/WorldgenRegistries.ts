import type { Holder } from '../core/index.js'
import { Identifier, Registry } from '../core/index.js'
import { NormalNoise } from '../math/index.js'
import { DensityFunction } from './DensityFunction.js'
import { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'

export namespace WorldgenRegistries {
	export const NOISE = Registry.createAndRegister('worldgen/noise', NormalNoise.fromJson)
	export const DENSITY_FUNCTION = Registry.createAndRegister('worldgen/density_function', obj => DensityFunction.fromJson(obj))
	export const NOISE_SETTINGS = Registry.createAndRegister('worldgen/noise_settings', NoiseGeneratorSettings.fromJson)
	export const BIOME = Registry.createAndRegister<{}>('worldgen/biome')

	export const SURFACE_NOISE = createNoise('surface', 0.9381732587751008, -6, [1, 1, 1])
	export const SURFACE_SECONDARY_NOISE = createNoise('surface_secondary', 1.0582769165096106, -6, [1, 1, 0, 1])

	function createNoise(name: string, baseAmplitude: number, firstOctave: number, amplitudes: number[]): Holder<NormalNoise> {
		return WorldgenRegistries.NOISE.register(Identifier.create(name), new NormalNoise(baseAmplitude, firstOctave, amplitudes.length, 'enabled', amplitudes), true)
	}
}
