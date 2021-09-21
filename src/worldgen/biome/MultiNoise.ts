import type { NoiseOctaves } from '..'
import { NormalNoise, WorldgenRandom } from '../../math'
import { NoiseSampler } from '../NoiseSampler'
import type { BiomeSource } from './BiomeSource'
import { Climate } from './Climate'
import { TerrainShaper } from './TerrainShaper'

export type NoiseParams = {
	firstOctave: number,
	amplitudes: number[],
}

export class MultiNoise implements BiomeSource {
	private readonly temperature: NormalNoise
	private readonly humidity: NormalNoise
	private readonly continentalness: NormalNoise
	private readonly erosion: NormalNoise
	private readonly weirdness: NormalNoise
	private readonly offset: NormalNoise

	constructor(
		seed: bigint,
		private readonly parameters: Climate.Parameters<string>,
		octaves: NoiseOctaves
	) {
		this.temperature = new NormalNoise(new WorldgenRandom(seed), octaves.temperature)
		this.humidity = new NormalNoise(new WorldgenRandom(seed + BigInt(1)), octaves.humidity)
		this.continentalness = new NormalNoise(new WorldgenRandom(seed + BigInt(2)), octaves.continentalness)
		this.erosion = new NormalNoise(new WorldgenRandom(seed + BigInt(3)), octaves.erosion)
		this.weirdness = new NormalNoise(new WorldgenRandom(seed + BigInt(4)), octaves.weirdness)
		this.offset = new NormalNoise(new WorldgenRandom(seed + BigInt(5)), octaves.shift)
	}

	public getBiome(x: number, y: number, z: number) {
		const xx = x + this.getOffset(x, 0, z)
		const yy = y + this.getOffset(y, z, x)
		const zz = z + this.getOffset(z, x, 0)
		const temperature = this.temperature.sample(xx, yy, zz)
		const humidity = this.humidity.sample(xx, yy, zz)
		const continentalness = this.continentalness.sample(xx, 0, zz)
		const erosion = this.erosion.sample(xx, 0, zz)
		const weirdness = this.weirdness.sample(xx, 0, zz)
		const offset = TerrainShaper.offset(TerrainShaper.point(continentalness, erosion, weirdness))
		const depth = NoiseSampler.computeDimensionDensity(1, -0.51875, y * 4) + offset
		const target = new Climate.TargetPoint(temperature, humidity, continentalness, erosion, depth, weirdness)
		return this.parameters.find(target)
	}

	public getTerrainShape(x: number, z: number) {
		const xx = x + this.getOffset(x, 0, z)
		const zz = z + this.getOffset(z, x, 0)
		const continentalness = this.continentalness.sample(xx, 0, zz)
		const erosion = this.erosion.sample(xx, 0, zz)
		const weirdness = this.weirdness.sample(xx, 0, zz)
		const point = TerrainShaper.point(continentalness, erosion, weirdness)
		const nearWater = TerrainShaper.nearWater(continentalness, weirdness)
		return TerrainShaper.shape(point, nearWater)
	}

	public getOffset(x: number, y: number, z: number) {
		return this.offset.sample(x, y, z) * 4
	}
}
