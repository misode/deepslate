import { Interval } from '../Interval.js'
import type { Random } from '../random/index.js'
import { intFloor } from '../Util.js'
import { GradientNoise } from './GradientNoise.js'
import { PerlinNoise } from './PerlinNoise.js'

export class SmearedPerlinNoise extends PerlinNoise {
	private static readonly SHIFT_UP_EPSILON = 1e-7

	constructor(
		random: Random,
		private readonly fudgeYScale: number,
	) {
		super(random)
	}

	public range(): Interval {
		return Interval.ofSymmetric(Math.abs(this.fudgeYScale) + 2)
	}

	public get3D(x: number, y: number, z: number): number {
		const x1 = GradientNoise.wrap(x) + this.offsetX
		const y1 = GradientNoise.wrap(y) + this.offsetY
		const z1 = GradientNoise.wrap(z) + this.offsetZ
		const floorX = intFloor(x1)
		const floorY = intFloor(y1)
		const floorZ = intFloor(z1)
		const relativeX = x1 - floorX
		const relativeY = y1 - floorY
		const relativeZ = z1 - floorZ
		const fudgedRelativeY = relativeY - this.computeFudgeY(y, relativeY)
		return this.sampleAndLerp(floorX, floorY, floorZ, relativeX, fudgedRelativeY, relativeZ, relativeY)
	}

	private computeFudgeY(originalY: number, relativeY: number): number {
		let fudgeLImit = relativeY
		if (originalY >= 0 && originalY < relativeY) {
			fudgeLImit = originalY
		}
		return Math.floor(fudgeLImit / this.fudgeYScale + SmearedPerlinNoise.SHIFT_UP_EPSILON) * this.fudgeYScale
	}
}
