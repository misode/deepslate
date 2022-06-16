import { Identifier, Registry } from '../core/index.js'
import { NoiseParameters } from '../math/index.js'
import { DensityFunction } from './DensityFunction.js'

export namespace WorldgenRegistries {
	export const NOISE = register<NoiseParameters>('worldgen/noise', NoiseParameters.fromJson)
	export const DENSITY_FUNCTION = register<DensityFunction>('worldgen/density_function', obj => DensityFunction.fromJson(obj))

	function register<T>(name: string, parser?: (obj: unknown) => T) {
		const registry = new Registry<T>(Identifier.create(name), parser)
		Registry.REGISTRY.register(registry.key, registry)
		return registry
	}
}
