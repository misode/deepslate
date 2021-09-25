import { Json } from '../../core'
import type { Random } from '../random'
import { clampedLerp } from '../Util'
import type { ImprovedNoise } from './ImprovedNoise'
import { PerlinNoise } from './PerlinNoise'

export class BlendedNoise {
	public readonly minLimitNoise: PerlinNoise
	public readonly maxLimitNoise: PerlinNoise
	public readonly mainNoise: PerlinNoise
	private readonly xzScale: number
	private readonly yScale: number
	private readonly xzMainScale: number
	private readonly yMainScale: number

	constructor(
		random: Random,
		sampling: NoiseSamplingSettings,
	) {
		this.minLimitNoise = new PerlinNoise(random, -15, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
		this.maxLimitNoise = new PerlinNoise(random, -15, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
		this.mainNoise = new PerlinNoise(random, -7, [1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0])
		this.xzScale = 684.412 * sampling.xzScale
		this.yScale = 684.412 * sampling.yScale
		this.xzMainScale = this.xzScale / sampling.xzFactor
		this.yMainScale = this.yScale / sampling.yFactor
	}

	public sample(x: number, y: number, z: number) {
		let noise: ImprovedNoise | undefined
		let value = 0
		let factor = 1
		for (let i = 0; i < 8; i += 1) {
			noise = this.mainNoise.getOctaveNoise(i)
			if (noise) {
				const xzScale = this.xzMainScale * factor
				const yScale = this.yMainScale * factor
				const xx = PerlinNoise.wrap(x * xzScale)
				const yy = PerlinNoise.wrap(y * yScale)
				const zz = PerlinNoise.wrap(z * xzScale)
				value += noise.sample(xx, yy, zz, yScale, y * yScale) / factor
			}
			factor /= 2
		}

		value = (value / 10 + 1) / 2
		factor = 1
		let min = 0
		let max = 0
		for (let i = 0; i < 16; i += 1) {
			const xzScale = this.xzScale * factor
			const yScale = this.yScale * factor
			const xx = PerlinNoise.wrap(x * xzScale)
			const yy = PerlinNoise.wrap(y * yScale)
			const zz = PerlinNoise.wrap(z * xzScale)
			if (value < 1 && (noise = this.minLimitNoise.getOctaveNoise(i))) {
				min += noise.sample(xx, yy, zz, yScale, y * yScale) / factor
			}
			if (value > 0 && (noise = this.maxLimitNoise.getOctaveNoise(i))) {
				max += noise.sample(xx, yy, zz, yScale, y * yScale) / factor
			}
			factor /= 2
		}

		return clampedLerp(min / 512, max / 512, value)
	}
}

export type NoiseSamplingSettings = {
	xzScale: number,
	yScale: number,
	xzFactor: number,
	yFactor: number,
}
export namespace NoiseSamplingSettings {
	export function fromJson(obj: any): NoiseSamplingSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			xzScale: Json.readNumber(root.xz_scale) ?? 1,
			yScale: Json.readNumber(root.y_scale) ?? 1,
			xzFactor: Json.readNumber(root.xz_factor) ?? 80,
			yFactor: Json.readNumber(root.y_factor) ?? 80,
		}
	}
}
