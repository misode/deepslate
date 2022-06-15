import type { Identifier } from '../../core/index.js'
import type { Climate } from './Climate.js'

export interface BiomeSource {
	getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler): Identifier
}
