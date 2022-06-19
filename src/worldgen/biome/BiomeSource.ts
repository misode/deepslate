import { Identifier } from '../../core/index.js'
import { Json } from '../../util/index.js'
import { CheckerboardBiomeSource } from './CheckerboardBiomeSource.js'
import type { Climate } from './Climate.js'
import { FixedBiomeSource } from './FixedBiomeSource.js'
import { MultiNoiseBiomeSource } from './MultiNoiseBiome.js'
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
			default: return { getBiome: () => Identifier.create('plains') }
		}
	}
}
