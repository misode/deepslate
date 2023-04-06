import * as b from 'benny'
import type { DensityFunction } from '../../src'
import { Climate, LegacyRandom, MultiNoiseBiomeSource } from '../../src'

class DemoSampler implements Climate.Sampler{
	public readonly temperature: DensityFunction
	public readonly humidity: DensityFunction
	public readonly continentalness: DensityFunction
	public readonly erosion: DensityFunction
	public readonly depth: DensityFunction
	public readonly weirdness: DensityFunction

	public random = new LegacyRandom(BigInt(1))

	public last_temperature: number = 0
	public last_humidity: number = 0
	public last_continentalness: number = 0
	public last_erosion: number = 0
	public last_depth: number = 0
	public last_weirdness: number = 0

	sample(x: number, y: number, z: number): Climate.TargetPoint {
		this.last_temperature += this.random.nextFloat() * 0.04 - 0.02
		this.last_humidity += this.random.nextFloat() * 0.04 - 0.02
		this.last_continentalness += this.random.nextFloat() * 0.04 - 0.02
		this.last_erosion += this.random.nextFloat() * 0.04 - 0.02
		this.last_depth += this.random.nextFloat() * 0.04 - 0.02
		this.last_weirdness += this.random.nextFloat() * 0.04 - 0.02
		return new Climate.TargetPoint(this.last_temperature, this.last_humidity, this.last_continentalness, this.last_erosion, this.last_depth, this.last_weirdness)
	}
}


const MC_META = 'https://raw.githubusercontent.com/misode/mcmeta/data/'


b.suite('MultiNoiseBiomeSource',
	b.add('getBiome Vanilla', async () => {
		const biome_source_json = (await (await fetch(`${MC_META}data/minecraft/dimension/overworld.json`)).json()).generator.biome_source
		const biome_source = MultiNoiseBiomeSource.fromJson(biome_source_json)
		var sampler = new DemoSampler()
		biome_source.getBiome(0,0,0, sampler)

		return () => {
			biome_source.getBiome(0, 0, 0, sampler)
		}
	}),
	b.add('getBiome Terralith', async () => {
		const biome_source_json = (await (await fetch('https://raw.githubusercontent.com/Stardust-Labs-MC/Terralith/main/data/minecraft/dimension/overworld.json')).json()).generator.biome_source
		const biome_source = MultiNoiseBiomeSource.fromJson(biome_source_json)
		var sampler = new DemoSampler()
		biome_source.getBiome(0,0,0, sampler)

		return () => {
			biome_source.getBiome(0, 0, 0, sampler)
		}
	}),
	b.cycle(),
	b.complete()
)
