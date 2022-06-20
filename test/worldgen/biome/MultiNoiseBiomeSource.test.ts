import { afterEach, describe, expect, it } from 'vitest'
import { Identifier } from '../../../src/core/index.js'
import { NoiseParameters } from '../../../src/math/index.js'
import { Climate, DensityFunction as DF, MultiNoiseBiomeSource, NoiseGeneratorSettings, NoiseRouter, WorldgenRegistries } from '../../../src/worldgen/index.js'
import { RandomState } from '../../../src/worldgen/RandomState.js'

describe('MultiNoise', () => {
	afterEach(() => {
		WorldgenRegistries.NOISE.clear()
	})

	it('nether', () => {
		const netherBiomes: [Climate.ParamPoint, () => Identifier][] = [
			[Climate.parameters(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('nether_wastes')],
			[Climate.parameters(0.0, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('soul_sand_valley')],
			[Climate.parameters(0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('crimson_forest')],
			[Climate.parameters(0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.375), () => Identifier.create('warped_forest')],
			[Climate.parameters(-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.175), () => Identifier.create('basalt_deltas')],
		]
		const nether = new MultiNoiseBiomeSource(netherBiomes)

		const temperature = WorldgenRegistries.NOISE.register(Identifier.create('temperature'), NoiseParameters.create(-10, [1.5, 0, 1, 0, 0, 0]))
		const vegetation = WorldgenRegistries.NOISE.register(Identifier.create('vegetation'), NoiseParameters.create(-8, [1, 1, 0, 0, 0, 0]))
		const settings = NoiseGeneratorSettings.create({
			noise: { minY: 0, height: 128, xzSize: 1, ySize: 2 },
			noiseRouter: NoiseRouter.create({
				temperature: new DF.Noise(0.25, 0, temperature),
				vegetation: new DF.Noise(0.25, 0, vegetation),
			}),
		})
		const randomState = new RandomState(settings, BigInt(123))
		const sampler = randomState.sampler

		expect(nether.getBiome(0, 0, 0, sampler)).toEqual(Identifier.create('basalt_deltas'))
		expect(nether.getBiome(200, 0, 0, sampler)).toEqual(Identifier.create('basalt_deltas'))
		expect(nether.getBiome(400, 0, 0, sampler)).toEqual(Identifier.create('nether_wastes'))
		expect(nether.getBiome(600, 0, 0, sampler)).toEqual(Identifier.create('crimson_forest'))
		expect(nether.getBiome(0, 0, -500, sampler)).toEqual(Identifier.create('soul_sand_valley'))
	})
})
