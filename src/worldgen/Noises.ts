import type { PositionalRandom } from '../math'
import { NoiseParameters, NormalNoise } from '../math'

interface NamedNoiseParameters extends NoiseParameters {
	name: string
}
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

	const registry = new Map<string, NamedNoiseParameters>()

	function create(name: string, firstOctave: number, amplitudes: number[]): NamedNoiseParameters {
		const result = {
			name: `minecraft:${name}`,
			...NoiseParameters.create(firstOctave, amplitudes),
		}
		registry.set(name, result)
		return result
	}

	export function instantiate(random: PositionalRandom, data: NamedNoiseParameters): NormalNoise {
		return new NormalNoise(random.fromHashOf(data.name), data)
	}
}
