import { Identifier } from '../../core/index.js'
import { DensityFunction } from '../DensityFunction.js'
import type { BiomeSource } from './BiomeSource.js'
import type { Climate } from './Climate.js'

export class TheEndBiomeSource implements BiomeSource {
	private static readonly END = Identifier.create('the_end')
	private static readonly HIGHLANDS = Identifier.create('end_highlands')
	private static readonly MIDLANDS = Identifier.create('end_midlands')
	private static readonly ISLANDS = Identifier.create('small_end_islands')
	private static readonly BARRENS = Identifier.create('end_barrens')

	public getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler) {
		const blockX = x << 2
		const blockY = y << 2
		const blockZ = z << 2

		const sectionX = blockX >> 4
		const sectionZ = blockZ >> 4

		if (sectionX * sectionX + sectionZ * sectionZ <= 4096) {
			return TheEndBiomeSource.END
		}

		const context = DensityFunction.context((sectionX * 2 + 1) * 8, blockY, (sectionZ * 2 + 1) * 8)
		const erosion = climateSampler.erosion.compute(context)
		if (erosion > 0.25) {
			return TheEndBiomeSource.HIGHLANDS
		} else if (erosion >= -0.0625) {
			return TheEndBiomeSource.MIDLANDS
		} else if (erosion >= -0.21875) {
			return TheEndBiomeSource.BARRENS
		} else {
			return TheEndBiomeSource.ISLANDS
		}
	}

	public static fromJson(obj: unknown) {
		return new TheEndBiomeSource()
	}
}
