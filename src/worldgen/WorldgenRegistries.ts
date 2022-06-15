import { Identifier, Registry } from '../core/index.js'
import type { NoiseParameters } from '../math/index.js'
import type { DensityFunction } from './DensityFunction.js'

export namespace WorldgenRegistries {
	export const NOISE = register<NoiseParameters>('worldgen/noise')
	export const DENSITY_FUNCTION = register<DensityFunction>('worldgen/density_function')

	function register<T>(name: string) {
		const registry = new Registry<T>(Identifier.create(name))
		Registry.REGISTRY.register(registry.key, registry)
		return registry
	}
}
