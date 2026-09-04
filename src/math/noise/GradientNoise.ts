import type { Interval } from '../Interval.js'
import type { Random } from '../random/index.js'
import { longFloor } from '../Util.js'
import type { Noise } from './NoiseStack.js'

export abstract class GradientNoise implements Noise {
	public static readonly GRADIENT = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1], [1, 1, 0], [0, -1, 1], [-1, 1, 0], [0, -1, -1]]

	public readonly perms: number[]
	public readonly offsetX: number
	public readonly offsetY: number
	public readonly offsetZ: number

	constructor(random: Random, offsetScale = 256) {
		this.offsetX = random.nextDouble() * offsetScale
		this.offsetY = random.nextDouble() * offsetScale
		this.offsetZ = random.nextDouble() * offsetScale
		this.perms = Array(256)

		for (let i = 0; i < 256; i += 1) {
			this.perms[i] = i
		}
		for (let i = 0; i < 256; i += 1) {
			const offset = random.nextInt(256 - i)
			const tmp = this.perms[i]
			this.perms[i] = this.perms[i + offset]
			this.perms[i + offset] = tmp
		}
	}

	abstract range(): Interval

	abstract get2D(x: number, y: number): number

	abstract get3D(x: number, y: number, z: number): number

	public permute(x: number) {
		return this.perms[x & 0xFF] & 0xFF
	}

	public static wrap(x: number) {
		return x - longFloor(x / 3.3554432E7 + 0.5) * 3.3554432E7
	}

	public static gradDot(hash: number, x: number, y: number, z: number) {
		const gradient = GradientNoise.GRADIENT[hash & 15]
		return gradient[0] * x + gradient[1] * y + gradient[2] * z
	}
}
