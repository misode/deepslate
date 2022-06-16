import { describe, expect, it } from 'vitest'
import { Identifier } from '../../../src/core/index.js'
import type { NoiseSettings } from '../../../src/worldgen/index.js'
import { Climate, DensityFunction as DF, MultiNoise, NoiseRouter, Noises } from '../../../src/worldgen/index.js'

describe('MultiNoise', () => {
	it('nether', () => {
		const netherBiomes = new Climate.Parameters([
			[Climate.parameters(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('nether_wastes')],
			[Climate.parameters(0.0, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('soul_sand_valley')],
			[Climate.parameters(0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('crimson_forest')],
			[Climate.parameters(0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.375), () => Identifier.create('warped_forest')],
			[Climate.parameters(-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.175), () => Identifier.create('basalt_deltas')],
		])
		const nether = new MultiNoise(netherBiomes)
		const settings: NoiseSettings = {
			minY: 0,
			height: 128,
			xzSize: 1,
			ySize: 2,
		}
		const router = NoiseRouter.create({
			temperature: new DF.Noise(0.25, 0, Noises.TEMPERATURE),
			vegetation: new DF.Noise(0.25, 0, Noises.VEGETATION),
		})
		const sampler = Climate.Sampler.fromRouter(NoiseRouter.withSettings(router, settings, BigInt(123)))

		expect(nether.getBiome(0, 0, 0, sampler)).toEqual(Identifier.create('basalt_deltas'))
		expect(nether.getBiome(200, 0, 0, sampler)).toEqual(Identifier.create('basalt_deltas'))
		expect(nether.getBiome(400, 0, 0, sampler)).toEqual(Identifier.create('nether_wastes'))
		expect(nether.getBiome(600, 0, 0, sampler)).toEqual(Identifier.create('crimson_forest'))
		expect(nether.getBiome(0, 0, -500, sampler)).toEqual(Identifier.create('soul_sand_valley'))
	})
})
