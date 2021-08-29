import { NormalNoise, WorldgenRandom } from '../../math'
import { NoiseSampler } from '../NoiseSampler'
import { Climate } from './Climate'
import { TerrainShaper } from './TerrainShaper'

export type NoiseParams = {
	firstOctave: number,
	amplitudes: number[],
}

export class MultiNoise {
	private readonly temperature: NormalNoise
	private readonly humidity: NormalNoise
	private readonly continentalness: NormalNoise
	private readonly erosion: NormalNoise
	private readonly weirdness: NormalNoise
	private readonly offset: NormalNoise

	constructor(
		seed: bigint,
		private readonly parameters: Climate.Parameters<string>,
		temperatureParams: NoiseParams,
		humidityParams: NoiseParams,
		continentalnessParams: NoiseParams,
		erosionParams: NoiseParams,
		weirdnessParams: NoiseParams,
	) {
		this.temperature = new NormalNoise(new WorldgenRandom(seed), temperatureParams.firstOctave, temperatureParams.amplitudes)
		this.humidity = new NormalNoise(new WorldgenRandom(seed + BigInt(1)), humidityParams.firstOctave, humidityParams.amplitudes)
		this.continentalness = new NormalNoise(new WorldgenRandom(seed + BigInt(2)), continentalnessParams.firstOctave, continentalnessParams.amplitudes)
		this.erosion = new NormalNoise(new WorldgenRandom(seed + BigInt(3)), erosionParams.firstOctave, erosionParams.amplitudes)
		this.weirdness = new NormalNoise(new WorldgenRandom(seed + BigInt(4)), weirdnessParams.firstOctave, weirdnessParams.amplitudes)
		this.offset = new NormalNoise(new WorldgenRandom(seed + BigInt(5)), -3, [1, 1, 1, 1])
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
		const isCoastal = TerrainShaper.isCoastal(continentalness, weirdness)
		return TerrainShaper.shape(point, isCoastal)
	}

	public getOffset(x: number, y: number, z: number) {
		return this.offset.sample(x, y, z) * 4
	}
}
