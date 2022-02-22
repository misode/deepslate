import { Identifier, Registry } from '../core'
import type { NoiseParameters } from '../math'
import type { DensityFunction } from './DensityFunction'

export namespace WorldgenRegistries {
	export const NOISE = new Registry<NoiseParameters>(Identifier.create('worldgen/noise'))
	export const DENSITY_FUNCTION = new Registry<DensityFunction>(Identifier.create('worldgen/density_function'))
}
