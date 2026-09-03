import { Holder } from '../core/index.js'
import { Json } from '../util/index.js'
import { DensityFunction } from './DensityFunction.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

export interface NoiseRouter {
	temperature: DensityFunction,
	vegetation: DensityFunction,
	continents: DensityFunction,
	erosion: DensityFunction,
	depth: DensityFunction,
	ridges: DensityFunction,
	chunkSurfaceLevel: DensityFunction,
	finalDensity: DensityFunction,
}

export namespace NoiseRouter {
	const fieldParser = (obj: unknown) => new DensityFunction.HolderHolder(Holder.parser(WorldgenRegistries.DENSITY_FUNCTION, DensityFunction.fromJson)(obj))

	export function fromJson(obj: unknown): NoiseRouter {
		const root = Json.readObject(obj) ?? {}
		return {
			temperature: fieldParser(root.temperature),
			vegetation: fieldParser(root.vegetation),
			continents: fieldParser(root.continents),
			erosion: fieldParser(root.erosion),
			depth: fieldParser(root.depth),
			ridges: fieldParser(root.ridges),
			chunkSurfaceLevel: fieldParser(root.preliminary_surface_level),
			finalDensity: fieldParser(root.final_density),
		}
	}

	export function create(router: Partial<NoiseRouter>): NoiseRouter {
		return {
			temperature: DensityFunction.Constant.ZERO,
			vegetation: DensityFunction.Constant.ZERO,
			continents: DensityFunction.Constant.ZERO,
			erosion: DensityFunction.Constant.ZERO,
			depth: DensityFunction.Constant.ZERO,
			ridges: DensityFunction.Constant.ZERO,
			chunkSurfaceLevel: DensityFunction.Constant.ZERO,
			finalDensity: DensityFunction.Constant.ZERO,
			...router,
		}
	}

	export function mapAll(router: NoiseRouter, visitor: DensityFunction.Visitor): NoiseRouter {
		return {
			temperature: router.temperature.mapAll(visitor),
			vegetation: router.vegetation.mapAll(visitor),
			continents: router.continents.mapAll(visitor),
			erosion: router.erosion.mapAll(visitor),
			depth: router.depth.mapAll(visitor),
			ridges: router.ridges.mapAll(visitor),
			chunkSurfaceLevel: router.chunkSurfaceLevel.mapAll(visitor),
			finalDensity: router.finalDensity.mapAll(visitor),
		}
	}
}
