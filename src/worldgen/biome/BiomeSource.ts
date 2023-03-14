import { BlockPos, Identifier } from '../../core/index.js'
import type { Random } from '../../math/index.js'
import { Json } from '../../util/index.js'
import { CheckerboardBiomeSource } from './CheckerboardBiomeSource.js'
import type { Climate } from './Climate.js'
import { FixedBiomeSource } from './FixedBiomeSource.js'
import { MultiNoiseBiomeSource } from './MultiNoiseBiomeSource.js'
import { TheEndBiomeSource } from './TheEndBiomeSource.js'

export interface BiomeSource {
	getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler): Identifier

}

export namespace BiomeSource {
	export function fromJson(obj: unknown): BiomeSource {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'fixed': return FixedBiomeSource.fromJson(obj)
			case 'checkerboard': return CheckerboardBiomeSource.fromJson(obj)
			case 'multi_noise': return MultiNoiseBiomeSource.fromJson(obj)
			case 'the_end': return TheEndBiomeSource.fromJson(obj)
			default: return new FixedBiomeSource(Identifier.create('plains'))
		}
	}

	export function findBiomeHorizontal(biomeSource: BiomeSource, centerX: number, y: number, centerZ: number, range: number, predicate: (biome: Identifier) => boolean, random: Random, sampler: Climate.Sampler, step: number = 1, searchFromCenter: boolean = false) {
		const centerQuardX = centerX >> 2
		const centerQuardZ = centerZ >> 2
		const quardRange = range >> 2
		const quardY = y >> 2
		var result = undefined
		var found_count = 0
		var currentRangeStart = searchFromCenter ? 0 : quardRange

		for (var currentRange = currentRangeStart; currentRange <= quardRange; currentRange += step) {
			for (var quardZOffset = -currentRange; quardZOffset <= currentRange; quardZOffset += step) {
				const isZEdge = Math.abs(quardZOffset) === currentRange

				for (var quardXOffset = -currentRange; quardXOffset <= currentRange; quardXOffset += step) {
					if (searchFromCenter){
						const isXEdge = Math.abs(quardXOffset) === currentRange
						if (!isXEdge && !isZEdge){
							continue
						}
					}

					const quardX = centerQuardX + quardXOffset
					const quardZ = centerQuardZ + quardZOffset
					const biome = biomeSource.getBiome(quardX, quardY, quardZ, sampler)
					if (predicate(biome)){
						if (result === undefined || random.nextInt(found_count + 1) <= 0.5) {
							result = {pos: BlockPos.create(quardX << 2, y, quardZ << 2), biome}
							if (searchFromCenter){
								return result
							}
						}
						found_count++
					}
				}
			}
		}
		return result
	}
}

