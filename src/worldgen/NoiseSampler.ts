import { BlendedNoise, clampedLerp, NormalNoise, Random, WorldgenRandom } from '../math'
import { Climate, TerrainShaper } from './biome'
import type { NoiseOctaves } from './NoiseGeneratorSettings'
import type { NoiseSettings } from './NoiseSettings'

export class NoiseSampler {
	private readonly blendedNoise: BlendedNoise
	private readonly temperatureNoise: NormalNoise
	private readonly humidityNoise: NormalNoise
	private readonly continentalnessNoise: NormalNoise
	private readonly erosionNoise: NormalNoise
	private readonly weirdnessNoise: NormalNoise
	private readonly offsetNoise: NormalNoise
	private readonly mountainPeakNoise: NormalNoise

	constructor(
		private readonly cellWidth: number,
		private readonly cellHeight: number,
		private readonly cellCountY: number,
		private readonly settings: NoiseSettings,
		octaves: NoiseOctaves,
		seed: bigint,
		/** @deprecated */
		private readonly shapeOverride?: TerrainShaper.Shape,
	) {
		const random = new Random(seed)
		const blendedRandom = settings.useLegacyRandom ? new Random(seed) : random.fork()
		this.blendedNoise = new BlendedNoise(blendedRandom, settings.sampling)
		random.consume(8)
		this.temperatureNoise = new NormalNoise(new WorldgenRandom(seed), octaves.temperature)
		this.humidityNoise = new NormalNoise(new WorldgenRandom(seed + BigInt(1)), octaves.humidity)
		this.continentalnessNoise = new NormalNoise(new WorldgenRandom(seed + BigInt(2)), octaves.continentalness)
		this.erosionNoise = new NormalNoise(new WorldgenRandom(seed + BigInt(3)), octaves.erosion)
		this.weirdnessNoise = new NormalNoise(new WorldgenRandom(seed + BigInt(4)), octaves.weirdness)
		this.offsetNoise = new NormalNoise(new WorldgenRandom(seed + BigInt(5)), octaves.shift)
		this.mountainPeakNoise = new NormalNoise(random.fork(), { firstOctave: -16, amplitudes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] })
	}

	public getClimate(x: number, y: number, z: number) {
		const xx = x + this.getOffset(x, 0, z)
		const yy = y + this.getOffset(y, z, x)
		const zz = z + this.getOffset(z, x, 0)
		const temperature = this.temperatureNoise.sample(xx, yy, zz)
		const humidity = this.humidityNoise.sample(xx, yy, zz)
		const continentalness = this.continentalnessNoise.sample(xx, 0, zz)
		const erosion = this.erosionNoise.sample(xx, 0, zz)
		const weirdness = this.weirdnessNoise.sample(xx, 0, zz)
		const offset = TerrainShaper.offset(TerrainShaper.point(continentalness, erosion, weirdness))
		const depth = NoiseSampler.computeDimensionDensity(1, -0.51875, y * 4) + offset
		return new Climate.TargetPoint(temperature, humidity, continentalness, erosion, depth, weirdness)
	}

	public getTerrainShape(x: number, z: number) {
		if (this.shapeOverride) return this.shapeOverride
		const xx = x + this.getOffset(x, 0, z)
		const zz = z + this.getOffset(z, x, 0)
		const continentalness = this.continentalnessNoise.sample(xx, 0, zz)
		const erosion = this.erosionNoise.sample(xx, 0, zz)
		const weirdness = this.weirdnessNoise.sample(xx, 0, zz)
		const point = TerrainShaper.point(continentalness, erosion, weirdness)
		const nearWater = TerrainShaper.nearWater(continentalness, weirdness)
		return TerrainShaper.shape(point, nearWater)
	}

	private getOffset(x: number, y: number, z: number) {
		return this.offsetNoise.sample(x, y, z) * 4
	}

	public fillNoiseColumn(column: number[], x: number, z: number, minY: number, height: number) {
		const biomeX = x * this.cellWidth >> 2
		const biomeZ = z * this.cellWidth >> 2
		const { offset, factor, peaks } = this.getTerrainShape(biomeX, biomeZ)

		for (let i = 0; i <= height; i += 1) {
			const y = i + minY
			const noise = this.blendedNoise.sample(x, y, z)
			const peakNoise = this.samplePeakNoise(peaks, x * this.cellHeight, z * this.cellHeight) / 128
			const density = this.computeInitialDensity(y * this.cellHeight, offset, factor, 0, peakNoise) + noise
			column[i] = this.applySlide(density, y)
		}
	}

	public samplePeakNoise(peaks: number, x: number, z: number) {
		if (peaks === 0) return 0
		const f = 3000 / this.cellWidth
		const noise = this.mountainPeakNoise.sample(x * f, 0, z * f)
		return noise > 0 ? peaks * noise : peaks / 2 * noise
	}

	public computeInitialDensity(y: number, offset: number, factor: number, c: number, peakNoise: number) {
		const density = NoiseSampler.computeDimensionDensity(this.settings.densityFactor, this.settings.densityOffset, y, c)
		const d6 = (density + offset + peakNoise) * factor
		return d6 * (d6 > 0 ? 4 : 1)
	}

	public applySlide(density: number, y: number) {
		const yCell = y - Math.floor(this.settings.minY / this.cellHeight)
		if (this.settings.topSlide.size > 0) {
			const a = ((this.cellCountY - yCell) - this.settings.topSlide.offset) / this.settings.topSlide.size
			density = clampedLerp(this.settings.topSlide.target * 128, density, a)
		}
		if (this.settings.bottomSlide.size > 0) {
			const a = (yCell - this.settings.bottomSlide.offset) / this.settings.bottomSlide.size
			density = clampedLerp(this.settings.bottomSlide.target * 128, density, a)
		}
		return density
	}

	public static computeDimensionDensity(factor: number, offset: number, y: number, c = 0) {
		return factor * (1 - y / 128 + c) + offset
	}
}
