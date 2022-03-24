import type { Random } from '../random'
import { clampedLerp } from '../Util'
import type { ImprovedNoise } from './ImprovedNoise'
import { PerlinNoise } from './PerlinNoise'

export class BlendedNoise {
	public readonly minLimitNoise: PerlinNoise
	public readonly maxLimitNoise: PerlinNoise
	public readonly mainNoise: PerlinNoise
	private readonly xzMultiplier: number
	private readonly yMultiplier: number
	public readonly maxValue: number

	constructor(
		random: Random,
		public readonly xzScale: number,
		public readonly yScale: number,
		public readonly xzFactor: number,
		public readonly yFactor: number,
		public readonly smearScaleMultiplier: number
	) {
		this.minLimitNoise = new PerlinNoise(random, -15, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
		this.maxLimitNoise = new PerlinNoise(random, -15, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
		this.mainNoise = new PerlinNoise(random, -7, [1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0])
		this.xzMultiplier = 684.412 * xzScale
		this.yMultiplier = 684.412 * yScale
		this.maxValue = this.minLimitNoise.edgeValue(this.yScale + 2) //TODO
	}

	public sample(x: number, y: number, z: number) {
		const scaled_x = x * this.xzMultiplier
		const scaled_y = y * this.yMultiplier
		const scaled_z = z * this.xzMultiplier

		const factored_x = scaled_x / this.xzFactor
		const factored_y = scaled_y / this.yFactor
		const factored_z = scaled_z / this.xzFactor

		const smear = this.yMultiplier * this.smearScaleMultiplier
		const factored_smear = smear / this.yFactor

		let noise: ImprovedNoise | undefined
		let value = 0
		let factor = 1
		for (let i = 0; i < 8; i += 1) {
			noise = this.mainNoise.getOctaveNoise(i)
			if (noise) {
				const xx = PerlinNoise.wrap(factored_x * factor)
				const yy = PerlinNoise.wrap(factored_y * factor)
				const zz = PerlinNoise.wrap(factored_z * factor)
				value += noise.sample(xx, yy, zz, factored_smear * factor, factored_y * factor) / factor
			}
			factor /= 2
		}

		value = (value / 10 + 1) / 2
		factor = 1
		let min = 0
		let max = 0
		for (let i = 0; i < 16; i += 1) {
			const xx = PerlinNoise.wrap(scaled_x * factor)
			const yy = PerlinNoise.wrap(scaled_y * factor)
			const zz = PerlinNoise.wrap(scaled_z * factor)
			const smearsmear = smear * factor
			if (value < 1 && (noise = this.minLimitNoise.getOctaveNoise(i))) {
				min += noise.sample(xx, yy, zz, smearsmear, scaled_y * factor) / factor
			}
			if (value > 0 && (noise = this.maxLimitNoise.getOctaveNoise(i))) {
				max += noise.sample(xx, yy, zz, smearsmear, scaled_y * factor) / factor
			}
			factor /= 2
		}

		return clampedLerp(min / 512, max / 512, value) / 128
	}
}

