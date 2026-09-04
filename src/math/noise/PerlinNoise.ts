import { Interval } from '../Interval.js'
import type { Random } from '../random/index.js'
import { intFloor, lerp3, smoothstep } from '../Util.js'
import { GradientNoise } from './GradientNoise.js'

export class PerlinNoise extends GradientNoise{
	public static readonly RANGE = Interval.ofSymmetric(2)
	public static readonly STANDARD_DEVIATION = 0.2702247831245211

	constructor(random: Random) {
		super(random)
	}

	public range(): Interval {
		return PerlinNoise.RANGE
	}

	public get2D(x: number, y: number): number {
		return this.get3D(GradientNoise.wrap(x), 0, GradientNoise.wrap(y))
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
		return this.sampleAndLerp(floorX, floorY, floorZ, relativeX, relativeY, relativeZ, relativeY)
	}

	public sampleAndLerp(x: number, y: number, z: number, relativeX: number, relativeY: number, relativeZ: number, originalRelativeY: number) {
		const x0 = this.permute(x)
		const x1 = this.permute(x + 1)
		const xy00 = this.permute(x0 + y)
		const xy01 = this.permute(x0 + y + 1)
		const xy10 = this.permute(x1 + y)
		const xy11 = this.permute(x1 + y + 1)
		const d000 = GradientNoise.gradDot(this.permute(xy00 + z), relativeX, relativeY, relativeZ)
		const d100 = GradientNoise.gradDot(this.permute(xy10 + z), relativeX - 1.0, relativeY, relativeZ)
		const d010 = GradientNoise.gradDot(this.permute(xy01 + z), relativeX, relativeY - 1.0, relativeZ)
		const d110 = GradientNoise.gradDot(this.permute(xy11 + z), relativeX - 1.0, relativeY - 1.0, relativeZ)
		const d001 = GradientNoise.gradDot(this.permute(xy00 + z + 1), relativeX, relativeY, relativeZ - 1.0)
		const d101 = GradientNoise.gradDot(this.permute(xy10 + z + 1), relativeX - 1.0, relativeY, relativeZ - 1.0)
		const d011 = GradientNoise.gradDot(this.permute(xy01 + z + 1), relativeX, relativeY - 1.0, relativeZ - 1.0)
		const d111 = GradientNoise.gradDot(this.permute(xy11 + z + 1), relativeX - 1.0, relativeY - 1.0, relativeZ - 1.0)
		const xAlpha = smoothstep(relativeX)
		const yAlpha = smoothstep(originalRelativeY)
		const zAlpha = smoothstep(relativeZ)
		return lerp3(xAlpha, yAlpha, zAlpha, d000, d100, d010, d110, d001, d101, d011, d111)
	}
}
