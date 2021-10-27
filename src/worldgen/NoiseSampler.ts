import { BlockState } from '../core'
import { BlendedNoise, clamp, LegacyRandom, NormalNoise } from '../math'
import { XoroshiroRandom } from '../math/random/XoroshiroRandom'
import { Climate, TerrainShaper } from './biome'
import type { BlockStateFiller, InterpolatableNoise, NoiseChunk, NoiseFiller } from './NoiseChunk'
import { TerrainInfo } from './NoiseChunk'
import type { NoiseOctaves } from './NoiseGeneratorSettings'
import type { NoiseSettings } from './NoiseSettings'
import { NoiseSlideSettings } from './NoiseSettings'

export class NoiseSampler {
	private readonly blendedNoise: BlendedNoise
	private readonly temperatureNoise: NormalNoise
	private readonly humidityNoise: NormalNoise
	private readonly continentalnessNoise: NormalNoise
	private readonly erosionNoise: NormalNoise
	private readonly weirdnessNoise: NormalNoise
	private readonly offsetNoise: NormalNoise
	private readonly jaggedNoise: NormalNoise

	private readonly baseNoise: InterpolatableNoise

	constructor(
		private readonly cellWidth: number,
		private readonly cellHeight: number,
		private readonly cellCountY: number,
		private readonly settings: NoiseSettings,
		octaves: NoiseOctaves,
		seed: bigint,
		legacyRandomSource: boolean = false,
		/** @deprecated */
		terrainOverride?: TerrainInfo,
	) {
		if (!legacyRandomSource) {
			const random = XoroshiroRandom.create(seed).fork()
			this.blendedNoise = new BlendedNoise(random.forkWithHashOf('minecraft:terrain'), settings.sampling, cellWidth, cellHeight)
			this.temperatureNoise = new NormalNoise(random.forkWithHashOf('minecraft:temperature'), octaves.temperature)
			this.humidityNoise = new NormalNoise(random.forkWithHashOf('minecraft:vegetation'), octaves.humidity)
			this.continentalnessNoise = new NormalNoise(random.forkWithHashOf('minecraft:continentalness'), octaves.continentalness)
			this.erosionNoise = new NormalNoise(random.forkWithHashOf('minecraft:erosion'), octaves.erosion)
			this.weirdnessNoise = new NormalNoise(random.forkWithHashOf('minecraft:ridge'), octaves.weirdness)
			this.offsetNoise = new NormalNoise(random.forkWithHashOf('minecraft:offset'), octaves.shift)
			this.jaggedNoise = new NormalNoise(random.forkWithHashOf('minecraft:jagged'), { firstOctave: -16, amplitudes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] })
		} else {
			const random = new LegacyRandom(seed)
			const blendedRandom = settings.useLegacyRandom ? new LegacyRandom(seed) : random.fork()
			this.blendedNoise = new BlendedNoise(blendedRandom, settings.sampling, cellWidth, cellHeight)
			random.consume(8)
			this.temperatureNoise = new NormalNoise(new LegacyRandom(seed), octaves.temperature)
			this.humidityNoise = new NormalNoise(new LegacyRandom(seed + BigInt(1)), octaves.humidity)
			this.continentalnessNoise = new NormalNoise(new LegacyRandom(seed + BigInt(2)), octaves.continentalness)
			this.erosionNoise = new NormalNoise(new LegacyRandom(seed + BigInt(3)), octaves.erosion)
			this.weirdnessNoise = new NormalNoise(new LegacyRandom(seed + BigInt(4)), octaves.weirdness)
			this.offsetNoise = new NormalNoise(new LegacyRandom(seed + BigInt(5)), octaves.shift)
			this.jaggedNoise = new NormalNoise(random.fork(), { firstOctave: -16, amplitudes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] })
		}

		this.baseNoise = chunk => {
			const sampler = chunk.createNoiseInterpolator((x, y, z) => this.calculateBaseNoise(x, y, z, terrainOverride ?? chunk.getTerrainInfo(x >> 2, z >> 2)))
			return () => sampler.sample()
		}
	}

	public sample(x: number, y: number, z: number) {
		const xx = x + this.getOffset(x, 0, z)
		const zz = z + this.getOffset(z, x, 0)
		const continentalness = this.getContinentalness(xx, zz)
		const erosion = this.getErosion(xx, zz)
		const weirdness = this.getWeirdness(xx, zz)
		const offset = TerrainShaper.offset(TerrainShaper.point(continentalness, erosion, weirdness))
		return this.target(x, y, z, xx, zz, continentalness, erosion, weirdness, offset)
	}

	public target(x: number, y: number, z: number, xx: number, zz: number, continentalness: number, erosion: number, weirdness: number, offset: number) {
		const yy = y + this.getOffset(y, z, x)
		const temperature = this.getTemperature(xx, yy, zz)
		const humidity = this.getHumidity(xx, yy, zz)
		const depth = this.computeDimensionDensity(y << 2) + offset
		return Climate.target(temperature, humidity, continentalness, erosion, depth, weirdness)
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

	public getTerrainInfo(x: number, z: number, continentalness: number, erosion: number, weirdness: number) {
		const point = TerrainShaper.point(continentalness, erosion, weirdness)
		return TerrainInfo.create(TerrainShaper.offset(point), TerrainShaper.factor(point), TerrainShaper.jaggedness(point))
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
			const dimensionDensity = this.computeDimensionDensity(y)
			const heightDensity = terrain.factor * (terrain.offset + jaggedness + dimensionDensity)
			density += heightDensity > 0 ? heightDensity * 4 : heightDensity
		}

		density = clamp(density, -64, 64)
		density = this.applySlide(density, y / this.cellHeight)
		density = clamp(density, -64, 64)
		return density
	}

	public sampleJaggedNoise(jaggedness: number, x: number, z: number) {
		if (jaggedness === 0) return 0
		const noise = this.jaggedNoise.sample(x * 1500, 0, z * 1500)
		return noise > 0 ? jaggedness * noise : jaggedness / 2 * noise
	}

	public computeDimensionDensity(y: number) {
		const heightFactor = 1 - y / 128
		return heightFactor * this.settings.densityFactor + this.settings.densityOffset
	}

	public applySlide(density: number, y: number) {
		const yCell = y - Math.floor(this.settings.minY / this.cellHeight)
		density = NoiseSlideSettings.apply(this.settings.topSlide, density, this.cellCountY - yCell)
		density = NoiseSlideSettings.apply(this.settings.bottomSlide, density, yCell)
		return density
	}
}
