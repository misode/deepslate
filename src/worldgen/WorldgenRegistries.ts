import type { Holder } from '../core/index.js'
import { Identifier, Registry } from '../core/index.js'
import { NormalNoise } from '../math/index.js'
import { DensityFunction } from './DensityFunction.js'
import { MaterialCondition, MaterialRule } from './MaterialSystem.js'
import { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'

export class WorldgenRegistries {
	public static readonly NOISE = Registry.createAndRegister('worldgen/noise', NormalNoise.fromJson)
	public static readonly DENSITY_FUNCTION = Registry.createAndRegister('worldgen/density_function', obj => DensityFunction.fromJson(obj))
	public static readonly NOISE_SETTINGS = Registry.createAndRegister('worldgen/noise_settings', NoiseGeneratorSettings.fromJson)
	public static readonly MATERIAL_RULE = Registry.createAndRegister('worldgen/material_rule', MaterialRule.fromJson)
	public static readonly MATERIAL_CONDITION = Registry.createAndRegister('worldgen/material_condition', MaterialCondition.fromJson)
	public static readonly BIOME = Registry.createAndRegister<{}>('worldgen/biome')

	public static readonly SURFACE_NOISE = WorldgenRegistries.createNoise('surface', 0.9381732587751008, -6, [1, 1, 1])
	public static readonly SURFACE_SECONDARY_NOISE = WorldgenRegistries.createNoise('surface_secondary', 1.0582769165096106, -6, [1, 1, 0, 1])

	public static createNoise(name: string, baseAmplitude: number, firstOctave: number, amplitudes: number[]): Holder<NormalNoise> {
		return WorldgenRegistries.NOISE.register(Identifier.create(name), new NormalNoise(baseAmplitude, firstOctave, amplitudes.length, 'enabled', amplitudes), true)
	}
}
