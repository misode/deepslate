import { Interval } from '../Interval.js'
import type { Random } from '../random/index.js'
import { clamp, floatLerp } from '../Util.js'
import type { NoiseLayer } from './NoiseStack.js'
import { NoiseStack } from './NoiseStack.js'
import { SmearedPerlinNoise } from './SmearedPerlinNoise.js'

export class BlendedNoise {
	private static readonly BASE_SCALE = 684.412
	private static readonly LIMIT_FACTOR = 0.99998474
	private static readonly MAIN_FACTOR = 12.75

	public readonly minLimitNoise: NoiseStack
	public readonly maxLimitNoise: NoiseStack
	public readonly mainNoise: NoiseStack
	private readonly xzMultiplier: number
	private readonly yMultiplier: number

	constructor(
		random: Random,
		public readonly xzScale: number,
		public readonly yScale: number,
		public readonly xzFactor: number,
		public readonly yFactor: number,
		public readonly smearScaleMultiplier: number
	) {
		this.xzMultiplier = BlendedNoise.BASE_SCALE * xzScale
		this.yMultiplier = BlendedNoise.BASE_SCALE * yScale
		const limitSmearScaleY = this.yMultiplier * smearScaleMultiplier
		const mainSmearScaleY = limitSmearScaleY / yFactor
		this.minLimitNoise = BlendedNoise.createNoise(random, -15, limitSmearScaleY, BlendedNoise.LIMIT_FACTOR)
		this.maxLimitNoise = BlendedNoise.createNoise(random, -15, limitSmearScaleY, BlendedNoise.LIMIT_FACTOR)
		this.mainNoise = BlendedNoise.createNoise(random, -7, mainSmearScaleY, BlendedNoise.MAIN_FACTOR)
	}

	private static createNoise(random: Random, firstOctave: number, smearScaleY: number, valueFactor: number) {
		const octaves = -firstOctave + 1
		let factor = 1
		valueFactor /= Math.pow(2, octaves) - 1
		const layers: NoiseLayer[] = []
		for (let i = octaves - 1; i >= 0; i -= 1) {
			layers.push({ noise: new SmearedPerlinNoise(random, smearScaleY * factor), frequency: factor, amplitude: valueFactor })
			factor /= 2
			valueFactor *= 2
		}
		return new NoiseStack(layers)
	}

	public range(): Interval {
		return Interval.lerp(Interval.of(0, 1), this.minLimitNoise.range(), this.maxLimitNoise.range())
	}

	public sample(x: number, y: number, z: number) {
		const xx = x * this.xzMultiplier
		const yy = y * this.yMultiplier
		const zz = z * this.xzMultiplier
		let mainValue = this.mainNoise.get3D(xx / this.xzFactor, yy / this.yFactor, zz / this.xzFactor)
		mainValue = clamp(mainValue + 0.5, 0, 1)
		if (mainValue === 0) {
			return this.minLimitNoise.get3D(xx, yy, zz)
		} else if (mainValue === 1) {
			return this.maxLimitNoise.get3D(xx, yy, zz)
		} else {
			return floatLerp(mainValue, this.minLimitNoise.get3D(xx, yy, zz), this.maxLimitNoise.get3D(xx, yy, zz))
		}
	}
}
