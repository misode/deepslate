import { expect } from 'chai'
import type { NoiseOctaves } from '../../../src/worldgen'
import { Climate, MultiNoise, NoiseSampler, NoiseSettings } from '../../../src/worldgen'

describe('MultiNoise', () => {
	it('nether', () => {
		const netherBiomes = new Climate.Parameters([
			[Climate.parameters(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:nether_wastes'],
			[Climate.parameters(0.0, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:soul_sand_valley'],
			[Climate.parameters(0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:crimson_forest'],
			[Climate.parameters(0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.375), () => 'minecraft:warped_forest'],
			[Climate.parameters(-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.175), () => 'minecraft:basalt_deltas'],
		])
		const octaves: NoiseOctaves = {
			temperature: { firstOctave: -7, amplitudes: [1, 1] },
			humidity: { firstOctave: -7, amplitudes: [1, 1] },
			continentalness: { firstOctave: -7, amplitudes: [1, 1] },
			erosion: { firstOctave: -7, amplitudes: [1, 1] },
			weirdness: { firstOctave: -7, amplitudes: [1, 1] },
			shift: { firstOctave: 0, amplitudes: [0] },
		}
		const nether = new MultiNoise(netherBiomes)
		const sampler = new NoiseSampler(4, 4, 32, NoiseSettings.fromJson(null), octaves, BigInt(5392))
		const climate: Climate.Sampler = (x, y, z) => sampler.sample(x, y, z)

		expect(nether.getBiome(0, 0, 0, climate)).equal('minecraft:soul_sand_valley')
		expect(nether.getBiome(100, 0, 0, climate)).equal('minecraft:crimson_forest')
		expect(nether.getBiome(200, 0, 0, climate)).equal('minecraft:crimson_forest')
		expect(nether.getBiome(300, 0, 0, climate)).equal('minecraft:nether_wastes')
		expect(nether.getBiome(400, 0, 0, climate)).equal('minecraft:warped_forest')
		expect(nether.getBiome(500, 0, 0, climate)).equal('minecraft:soul_sand_valley')
	})
})
