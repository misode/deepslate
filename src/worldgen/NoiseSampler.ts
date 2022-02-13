import { BlockState } from '../core'
import { BlendedNoise, clamp, LegacyRandom, NoiseParameters, NormalNoise, XoroshiroRandom } from '../math'
import { Climate, TerrainShaper } from './biome'
import type { BlockStateFiller, InterpolatableNoise, NoiseChunk, NoiseFiller } from './NoiseChunk'
import { TerrainInfo } from './NoiseChunk'
import { Noises } from './Noises'
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
		legacyRandomSource: boolean = false,
	) {
		const large = settings.hasLargeBiomes
		const random = (legacyRandomSource ? new LegacyRandom(seed) : XoroshiroRandom.create(seed)).forkPositional()
		if (!legacyRandomSource) {
			this.blendedNoise = new BlendedNoise(random.fromHashOf('minecraft:terrain'), settings.sampling, NoiseSettings.cellWidth(settings), NoiseSettings.cellHeight(settings))
			this.temperatureNoise = Noises.instantiate(random, large ? Noises.TEMPERATURE_LARGE : Noises.TEMPERATURE)
			this.humidityNoise = Noises.instantiate(random, large ? Noises.VEGETATION_LARGE : Noises.VEGETATION)
			this.offsetNoise = Noises.instantiate(random, Noises.SHIFT)
		} else {
			this.blendedNoise = new BlendedNoise(new LegacyRandom(seed), settings.sampling, NoiseSettings.cellWidth(settings), NoiseSettings.cellHeight(settings))
			this.temperatureNoise = new NormalNoise(new LegacyRandom(seed), NoiseParameters.create(-7, [1, 1]))
			this.humidityNoise = new NormalNoise(new LegacyRandom(seed + BigInt(1)), NoiseParameters.create(-7, [1, 1]))
			this.offsetNoise = new NormalNoise(new LegacyRandom(seed + BigInt(5)), NoiseParameters.create(0, [0]))
		}
		this.continentalnessNoise = Noises.instantiate(random, large ? Noises.CONTINENTALNESS_LARGE : Noises.CONTINENTALNESS)
		this.erosionNoise = Noises.instantiate(random, large ? Noises.EROSION_LARGE : Noises.EROSION)
		this.weirdnessNoise = Noises.instantiate(random, Noises.RIDGE)
		this.jaggedNoise = Noises.instantiate(random, Noises.JAGGED)

		this.shaper = settings.terrainShaper
		this.baseNoise = chunk => {
			const sampler = chunk.createNoiseInterpolator((x, y, z) =>
				this.calculateBlendedBaseNoise(x, y, z, chunk.getNoiseData(x >> 2, z >> 2).terrainInfo))
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

	public calculateBlendedBaseNoise(x: number, y: number, z: number, terrain: TerrainInfo) {
		const density = this.blendedNoise.sample(x, y, z)
		return this.calculateBaseNoise(x, y, z, terrain, density, true, true)
	}

	public calculateBaseNoise(x: number, y: number, z: number, terrain: TerrainInfo, density: number, disableNoiseCaves: boolean, enableJaggedNess: boolean) {
		if (!this.settings.islandNoiseOverride) {
			const jaggedness = enableJaggedNess ? this.sampleJaggedNoise(terrain.jaggedness, x, z) : 0
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

	public getPreliminarySurfaceLevel(x: number, z: number, terrainInfo: TerrainInfo) {
		const maxCellY = NoiseSettings.minCellY(this.settings) + NoiseSettings.cellCountY(this.settings)
		const minCellY = NoiseSettings.minCellY(this.settings)
		const cellHeight = NoiseSettings.cellHeight(this.settings)
		for (let yCell = maxCellY; yCell >=  minCellY; yCell -= 1) {
			const y = yCell * cellHeight
			const density = this.calculateBaseNoise(x, y, z, terrainInfo, -0.703125, true, false)
			if (density >= 0.390625) {
				return y
			}
		}
		return Number.MAX_SAFE_INTEGER
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
