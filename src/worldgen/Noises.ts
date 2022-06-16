import type { Holder } from '../core/index.js'
import { Identifier } from '../core/index.js'
import type { PositionalRandom } from '../math/index.js'
import { NoiseParameters, NormalNoise } from '../math/index.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

export namespace Noises {
	export const TEMPERATURE = create('temperature', -10, [1.5, 0, 1, 0, 0, 0])
	export const VEGETATION = create('vegetation', -8, [1, 1, 0, 0, 0, 0])
	export const CONTINENTALNESS = create('continentalness', -9, [1, 1, 2, 2, 2, 1, 1, 1, 1])
	export const EROSION = create('erosion', -9, [1, 1, 0, 1, 1])
	export const TEMPERATURE_LARGE = create('temperature_large', -12, [1.5, 0, 1, 0, 0, 0])
	export const VEGETATION_LARGE = create('vegetation_large', -10, [1, 1, 0, 0, 0, 0])
	export const CONTINENTALNESS_LARGE = create('continentalness_large', -11, [1, 1, 2, 2, 2, 1, 1, 1, 1])
	export const EROSION_LARGE = create('erosion_large', -11, [1, 1, 0, 1, 1])
	export const RIDGE = create('ridge', -7, [1, 2, 1, 0, 0, 0])
	export const SHIFT = create('offset', -3, [1, 1, 1, 0])

	export const AQUIFER_BARRIER = create('aquifer_barrier', -3, [1])
	export const AQUIFER_FLUID_LEVEL_FLOODEDNESS = create('aquifer_fluid_level_floodedness', -7, [1])
	export const AQUIFER_FLUID_LEVEL_SPREAD = create('aquifer_fluid_level_spread', -5, [1])
	export const AQUIFER_LAVA = create('aquifer_lava', -1, [1])

	export const PILLAR = create('pillar', -7, [1, 1])
	export const PILLAR_RARENESS = create('pillar_rareness', -8, [1])
	export const PILLAR_THICKNESS = create('pillar_thickness', -8, [1])

	export const SPAGHETTI_2D = create('spaghetti_2d', -8, [1])
	export const SPAGHETTI_2D_ELEVATION = create('spaghetti_2d_elevation', -8, [1])
	export const SPAGHETTI_2D_MODULATOR = create('spaghetti_2d_modulator', -8, [1])
	export const SPAGHETTI_2D_THICKNESS = create('spaghetti_2d_thickness', -8, [1])
	export const SPAGHETTI_3D_1 = create('spaghetti_3d_1', -8, [1])
	export const SPAGHETTI_3D_2 = create('spaghetti_3d_2', -8, [1])
	export const SPAGHETTI_3D_RARITY = create('spaghetti_3d_rarity', -8, [1])
	export const SPAGHETTI_3D_THICKNESS = create('spaghetti_3d_thickness', -8, [1])
	export const SPAGHETTI_ROUGHNESS = create('spaghetti_roughness', -8, [1])
	export const SPAGHETTI_ROUGHNESS_MODULATOR = create('spaghetti_roughness_modulator', -8, [1])

	export const CAVE_ENTRANCE = create('cave_entrance', -7, [0.4, 0.5, 1])
	export const CAVE_LAYER = create('cave_layer', -8, [1])
	export const CAVE_CHEESE = create('cave_cheese', -8, [0.5, 1, 2, 1, 2, 1, 0, 2, 0])

	export const NOODLE = create('noodle', -8, [1])
	export const NOODLE_THICKNESS = create('noodle_thickness', -8, [1])
	export const NOODLE_RIDGE_A = create('noodle_ridge_a', -7, [1])
	export const NOODLE_RIDGE_B = create('noodle_ridge_b', -7, [1])

	export const JAGGED = create('jagged', -16, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])

	export const SURFACE = create('surface', -6, [1, 1, 1])
	export const SURFACE_SECONDARY = create('surface_secondary', -6, [1, 1, 0, 1])

	function create(name: string, firstOctave: number, amplitudes: number[]): Holder<NoiseParameters> {
		return WorldgenRegistries.NOISE.register(Identifier.create(name), NoiseParameters.create(firstOctave, amplitudes), true)
	}

	const noiseCache = new Map<string, [bigint | number, bigint | number, NormalNoise]>()

	export function instantiate(random: PositionalRandom, noise: Holder<NoiseParameters>): NormalNoise {
		const key = noise.key()?.toString()
		if (!key) {
			throw new Error('Cannot instantiate noise from direct holder')
		}

		const randomKey = random.seedKey()
		const cached = noiseCache.get(key)
		if (cached && cached[0] === randomKey[0] && cached[1] === randomKey[1]) {
			return cached[2]
		}
		const result = new NormalNoise(random.fromHashOf(key), noise.value())
		noiseCache.set(key, [randomKey[0], randomKey[1], result])
		return result
	}
}
