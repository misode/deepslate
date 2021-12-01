import { BlockState } from '../core'
import { BlendedNoise, clamp, LegacyRandom, NormalNoise, XoroshiroRandom } from '../math'
import { Climate, TerrainShaper } from './biome'
import type { BlockStateFiller, InterpolatableNoise, NoiseChunk, NoiseFiller } from './NoiseChunk'
import { TerrainInfo } from './NoiseChunk'
import type { NoiseOctaves } from './NoiseGeneratorSettings'
import { NoiseSettings, NoiseSlideSettings } from './NoiseSettings'

export class NoiseSampler {
	private readonly blendedNoise: BlendedNoise
	private readonly temperatureNoise: NormalNoise
	private readonly humidityNoise: NormalNoise
	private readonly continentalnessNoise: NormalNoise
	private readonly erosionNoise: NormalNoise
	private readonly weirdnessNoise: NormalNoise
	private readonly offsetNoise: NormalNoise
	private readonly jaggedNoise: NormalNoise

	public readonly shaper: TerrainShaper
	private readonly baseNoise: InterpolatableNoise

	constructor(
		private readonly settings: NoiseSettings,
		seed: bigint,
		octaves: NoiseOctaves,
		legacyRandomSource: boolean = false,
	) {
		if (!legacyRandomSource) {
			const random = XoroshiroRandom.create(seed).fork()
			this.blendedNoise = new BlendedNoise(random.forkWithHashOf('minecraft:terrain'), settings.sampling, NoiseSettings.cellWidth(settings), NoiseSettings.cellHeight(settings))
			this.temperatureNoise = new NormalNoise(random.forkWithHashOf('minecraft:temperature'), octaves.temperature)
			this.humidityNoise = new NormalNoise(random.forkWithHashOf('minecraft:vegetation'), octaves.humidity)
			this.continentalnessNoise = new NormalNoise(random.forkWithHashOf('minecraft:continentalness'), octaves.continentalness)
			this.erosionNoise = new NormalNoise(random.forkWithHashOf('minecraft:erosion'), octaves.erosion)
			this.weirdnessNoise = new NormalNoise(random.forkWithHashOf('minecraft:ridge'), octaves.weirdness)
			this.offsetNoise = new NormalNoise(random.forkWithHashOf('minecraft:offset'), octaves.shift)
			this.jaggedNoise = new NormalNoise(random.forkWithHashOf('minecraft:jagged'), { firstOctave: -16, amplitudes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] })
		} else {
			const random = new LegacyRandom(seed)
			this.blendedNoise = new BlendedNoise(random.fork(), settings.sampling, NoiseSettings.cellWidth(settings), NoiseSettings.cellHeight(settings))
			random.consume(8)
			this.temperatureNoise = new NormalNoise(new LegacyRandom(seed), octaves.temperature)
			this.humidityNoise = new NormalNoise(new LegacyRandom(seed + BigInt(1)), octaves.humidity)
			this.continentalnessNoise = new NormalNoise(new LegacyRandom(seed + BigInt(2)), octaves.continentalness)
			this.erosionNoise = new NormalNoise(new LegacyRandom(seed + BigInt(3)), octaves.erosion)
			this.weirdnessNoise = new NormalNoise(new LegacyRandom(seed + BigInt(4)), octaves.weirdness)
			this.offsetNoise = new NormalNoise(new LegacyRandom(seed + BigInt(5)), octaves.shift)
			this.jaggedNoise = new NormalNoise(random.fork(), { firstOctave: -16, amplitudes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] })
		}

		this.shaper = settings.terrainShaper
		this.baseNoise = chunk => {
			const sampler = chunk.createNoiseInterpolator((x, y, z) =>
				this.calculateBaseNoise(x, y, z, chunk.getNoiseData(x >> 2, z >> 2).terrainInfo))
			return () => sampler.sample()
		}
	}

	public noiseData(x: number, z: number) {
		const xx = x + this.getOffset(x, 0, z)
		const zz = z + this.getOffset(z, x, 0)
		const continentalness = this.getContinentalness(xx, zz)
		const erosion = this.getErosion(xx, zz)
		const weirdness = this.getWeirdness(xx, zz)
		const terrainInfo = this.terrainInfo(continentalness, erosion, weirdness)
		return FlatNoiseData.create(xx, zz, continentalness, erosion, weirdness, terrainInfo)
	}

	public sample(x: number, y: number, z: number) {
		return this.target(x, y, z, this.noiseData(x, z))
	}

	public target(x: number, y: number, z: number, noiseData: FlatNoiseData) {
		const xx = noiseData.shiftedX
		const yy = y + this.getOffset(y, z, x)
		const zz = noiseData.shiftedZ
		const temperature = this.getTemperature(xx, yy, zz)
		const humidity = this.getHumidity(xx, yy, zz)
		const depth = this.computeDimensionDensity(y << 2, noiseData.terrainInfo)
		return Climate.target(temperature, humidity, noiseData.continentalness, noiseData.erosion, depth, noiseData.weirdness)
	}

	public terrainInfo(continentalness: number, erosion: number, weirdness: number) {
		const point = TerrainShaper.point(continentalness, erosion, weirdness)
		const offset = this.shaper.offset(point)
		const factor = this.shaper.factor(point)
		const jaggedness = this.shaper.jaggedness(point)
		return TerrainInfo.create(offset, factor, jaggedness)
	}

	public getOffset(x: number, y: number, z: number) {
		return this.offsetNoise.sample(x, y, z) * 4
	}

	public getTemperature(x: number, y: number, z: number) {
		return this.temperatureNoise.sample(x, y, z)
	}

	public getHumidity(x: number, y: number, z: number) {
		return this.humidityNoise.sample(x, y, z)
	}

	public getContinentalness(x: number, z: number) {
		return this.continentalnessNoise.sample(x, 0, z)
	}

	public getErosion(x: number, z: number) {
		return this.erosionNoise.sample(x, 0, z)
	}

	public getWeirdness(x: number, z: number) {
		return this.weirdnessNoise.sample(x, 0, z)
	}

	public makeBaseNoiseFiller(noiseChunk: NoiseChunk, filler: NoiseFiller): BlockStateFiller {
		const baseSampler = this.baseNoise(noiseChunk)
		return (x: number, y: number, z: number) => {
			let noise = baseSampler()
			noise = clamp(noise * 0.64, -1, 1)
			noise = noise / 2 - noise * noise * noise / 24
			noise += filler(x, y, z)
			if (noise > 0) return null
			return BlockState.AIR
		}
	}

	public calculateBaseNoise(x: number, y: number, z: number, terrain?: TerrainInfo) {
		let density = this.blendedNoise.sample(x, y, z)

		if (terrain) {
			const jaggedness = this.sampleJaggedNoise(terrain.jaggedness, x, z)
			const dimensionDensity = this.computeDimensionDensity(y, terrain)
			const heightDensity = terrain.factor * (jaggedness + dimensionDensity)
			density += heightDensity > 0 ? heightDensity * 4 : heightDensity
		}

		density = clamp(density, -64, 64)
		density = this.applySlide(density, y / NoiseSettings.cellHeight(this.settings))
		density = clamp(density, -64, 64)
		return density
	}

	public sampleJaggedNoise(jaggedness: number, x: number, z: number) {
		if (jaggedness === 0) return 0
		const noise = this.jaggedNoise.sample(x * 1500, 0, z * 1500)
		return noise > 0 ? jaggedness * noise : jaggedness / 2 * noise
	}

	public computeDimensionDensity(y: number, terrainInfo: TerrainInfo) {
		return 1 - y / 128 + terrainInfo.offset
	}

	public applySlide(density: number, y: number) {
		const yCell = y - NoiseSettings.minCellY(this.settings)
		density = NoiseSlideSettings.apply(this.settings.topSlide, density, NoiseSettings.cellCountY(this.settings) - yCell)
		density = NoiseSlideSettings.apply(this.settings.bottomSlide, density, yCell)
		return density
	}
}

export type FlatNoiseData = {
	shiftedX: number,
	shiftedZ: number,
	continentalness: number,
	weirdness: number,
	erosion: number,
	terrainInfo: TerrainInfo,
}
export namespace FlatNoiseData {
	export function create(shiftedX: number, shiftedZ: number, continentalness: number, weirdness: number, erosion: number, terrainInfo: TerrainInfo): FlatNoiseData {
		return { shiftedX, shiftedZ, continentalness, weirdness, erosion, terrainInfo }
	}
}
