import { expect } from 'chai'
import type { NoiseSettings } from '../../../src/worldgen'
import { Climate, DensityFunction as DF, MultiNoise, NoiseRouter, Noises, TerrainShaper } from '../../../src/worldgen'

describe('MultiNoise', () => {
	it('nether', () => {
		const netherBiomes = new Climate.Parameters([
			[Climate.parameters(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:nether_wastes'],
			[Climate.parameters(0.0, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:soul_sand_valley'],
			[Climate.parameters(0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:crimson_forest'],
			[Climate.parameters(0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.375), () => 'minecraft:warped_forest'],
			[Climate.parameters(-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.175), () => 'minecraft:basalt_deltas'],
		])
		const nether = new MultiNoise(netherBiomes)
		const settings: NoiseSettings = {
			minY: 0,
			height: 128,
			xzSize: 1,
			ySize: 2,
			sampling: { xzScale: 1, yScale: 3, xzFactor: 80, yFactor: 60 },
			topSlide: { target: 0.9375, offset: 0, size: 3 },
			bottomSlide: { target: 2.5, offset: -1, size: 4 },
			terrainShaper: TerrainShaper.fromJson({ offset: 0, factor: 0, jaggedness: 0 }),
		}
		const router = NoiseRouter.create({
			temperature: new DF.Noise(0.25, 0, Noises.TEMPERATURE),
			vegetation: new DF.Noise(0.25, 0, Noises.VEGETATION),
		})
		const sampler = Climate.Sampler.fromRouter(NoiseRouter.withSettings(router, settings, BigInt(123)))

		expect(nether.getBiome(0, 0, 0, sampler)).equal('minecraft:basalt_deltas')
		expect(nether.getBiome(200, 0, 0, sampler)).equal('minecraft:basalt_deltas')
		expect(nether.getBiome(400, 0, 0, sampler)).equal('minecraft:nether_wastes')
		expect(nether.getBiome(600, 0, 0, sampler)).equal('minecraft:crimson_forest')
		expect(nether.getBiome(0, 0, -500, sampler)).equal('minecraft:soul_sand_valley')
	})
})
