import type { BlendedNoise } from '../math'
import { clampedLerp, NormalNoise, WorldgenRandom } from '../math'
import type { BiomeSource } from './biome'
import type { NoiseSettings } from './NoiseSettings'

export class NoiseSampler {
	private readonly mountainPeakNoise: NormalNoise

	constructor(
		private readonly cellWidth: number,
		private readonly cellHeight: number,
		private readonly cellCountY: number,
		private readonly biomeSource: BiomeSource,
		private readonly settings: NoiseSettings,
		private readonly blendedNoise: BlendedNoise,
	) {
		this.mountainPeakNoise = new NormalNoise(new WorldgenRandom(BigInt(42)), -16, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
	}

	public noiseColumn(x: number, z: number, minY: number, height: number) {
		const biomeX = x * this.cellWidth >> 2
		const biomeZ = z * this.cellWidth >> 2
		const { offset, factor, peaks } = this.biomeSource.getTerrainShape(biomeX, biomeZ)

		const xzLimitScale = 684.412 * this.settings.sampling.xzScale
		const yLimitScale = 684.412 * this.settings.sampling.yScale
		const xzMainScale = xzLimitScale / this.settings.sampling.xzFactor
		const yMainScale = yLimitScale / this.settings.sampling.yFactor

		const arr = Array(height + 1)
		for (let i = 0; i <= height; i += 1) {
			const y = i + minY
			const noise = this.blendedNoise.sample(x, y, z, xzLimitScale, yLimitScale, xzMainScale, yMainScale)
			const peakNoise = this.samplePeakNoise(peaks, x * this.cellHeight, z * this.cellHeight) / 128
			const density = this.computeInitialDensity(y * this.cellHeight, offset, factor, 0, peakNoise) + noise
			arr[i] = this.applySlide(density, y)
		}
		return arr
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
			density = clampedLerp(this.settings.topSlide.target, density, a)
		}
		if (this.settings.bottomSlide.size > 0) {
			const a = (yCell - this.settings.bottomSlide.offset) / this.settings.bottomSlide.size
			density = clampedLerp(this.settings.bottomSlide.target, density, a)
		}
		return density
	}

	public static computeDimensionDensity(factor: number, offset: number, y: number, c = 0) {
		return factor * (1 - y / 128 + c) + offset
	}
}
