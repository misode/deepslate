import type { Identifier } from '@core'
import type { Climate } from './Climate'

export interface BiomeSource {
	getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler): Identifier
}
