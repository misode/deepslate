import { Interval } from '../Interval.js'
import type { Random } from '../random/index.js'
import { intFloor } from '../Util.js'
import { GradientNoise } from './GradientNoise.js'

export class SimplexNoise extends GradientNoise {
	public static readonly RANGE = Interval.ofSymmetric(2)
	public static readonly STANDARD_DEVIATION = 0.42544
	private static readonly F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
	private static readonly G2 = (3.0 - Math.sqrt(3.0)) / 6.0

	constructor(random: Random, discardNoiseOffset?: boolean) {
		super(random, discardNoiseOffset ? 0 : undefined)
	}

	public range(): Interval {
		return SimplexNoise.RANGE
	}

	public get2D(x: number, y: number) {
		const xin = x + this.offsetX
		const yin = y + this.offsetY
		const s = (xin + yin) * SimplexNoise.F2
		const i = intFloor(xin + s)
		const j = intFloor(yin + s)
		const t = (i + j) * SimplexNoise.G2
		const x0 = xin - (i - t)
		const y0 = yin - (j - t)
		let i1
		let j1
		if (x0 > y0) {
			i1 = 1
			j1 = 0
		} else {
			i1 = 0
			j1 = 1
		}
		const x1 = x0 - i1 + SimplexNoise.G2
		const y1 = y0 - j1 + SimplexNoise.G2
		const x2 = x0 - 1.0 + 2.0 * SimplexNoise.G2
		const y2 = y0 - 1.0 + 2.0 * SimplexNoise.G2
		const ii = i & 0xFF
		const jj = j & 0xFF
		const gi0 = this.permute(ii + this.permute(jj)) % 12
		const gi1 = this.permute(ii + i1 + this.permute(jj + j1)) % 12
		const gi2 = this.permute(ii + 1 + this.permute(jj + 1)) % 12
		const n0 = this.getCornerNoise3D(gi0, x0, y0, 0.0, 0.5)
		const n1 = this.getCornerNoise3D(gi1, x1, y1, 0.0, 0.5)
		const n2 = this.getCornerNoise3D(gi2, x2, y2, 0.0, 0.5)
		return 70.0 * (n0 + n1 + n2)
	}

	public get3D(x: number, y: number, z: number) {
		const xin = x + this.offsetX
		const yin = y + this.offsetY
		const zin = z + this.offsetZ
		const s = (xin + yin + zin) * 0.3333333333333333
		const i = intFloor(xin + s)
		const j = intFloor(yin + s)
		const k = intFloor(zin + s)
		const t = (i + j + k) * 0.16666666666666666
		const x0 = xin - (i - t)
		const y0 = yin - (j - t)
		const z0 = zin - (k - t)
		let i1
		let j1
		let k1
		let i2
		let j2
		let k2
		if (x0 >= y0) {
			if (y0 >= z0) {
				i1 = 1
				j1 = 0
				k1 = 0
				i2 = 1
				j2 = 1
				k2 = 0
			} else if (x0 >= z0) {
				i1 = 1
				j1 = 0
				k1 = 0
				i2 = 1
				j2 = 0
				k2 = 1
			} else {
				i1 = 0
				j1 = 0
				k1 = 1
				i2 = 1
				j2 = 0
				k2 = 1
			}
		} else if (y0 < z0) {
			i1 = 0
			j1 = 0
			k1 = 1
			i2 = 0
			j2 = 1
			k2 = 1
		} else if (x0 < z0) {
			i1 = 0
			j1 = 1
			k1 = 0
			i2 = 0
			j2 = 1
			k2 = 1
		} else {
			i1 = 0
			j1 = 1
			k1 = 0
			i2 = 1
			j2 = 1
			k2 = 0
		}
		const x1 = x0 - i1 + 0.16666666666666666
		const y1 = y0 - j1 + 0.16666666666666666
		const z1 = z0 - k1 + 0.16666666666666666
		const x2 = x0 - i2 + 0.3333333333333333
		const y2 = y0 - j2 + 0.3333333333333333
		const z2 = z0 - k2 + 0.3333333333333333
		const x3 = x0 - 0.5
		const y3 = y0 - 0.5
		const z3 = z0 - 0.5
		const ii = i & 0xFF
		const jj = j & 0xFF
		const kk = k & 0xFF
		const gi0 = this.permute(ii + this.permute(jj + this.permute(kk))) % 12
		const gi1 = this.permute(ii + i1 + this.permute(jj + j1 + this.permute(kk + k1))) % 12
		const gi2 = this.permute(ii + i2 + this.permute(jj + j2 + this.permute(kk + k2))) % 12
		const gi3 = this.permute(ii + 1 + this.permute(jj + 1 + this.permute(kk + 1))) % 12
		const n0 = this.getCornerNoise3D(gi0, x0, y0, z0, 0.6)
		const n1 = this.getCornerNoise3D(gi1, x1, y1, z1, 0.6)
		const n2 = this.getCornerNoise3D(gi2, x2, y2, z2, 0.6)
		const n3 = this.getCornerNoise3D(gi3, x3, y3, z3, 0.6)
		return 32.0 * (n0 + n1 + n2 + n3)
	}

	private getCornerNoise3D(index: number, x: number, y: number, z: number, base: number) {
		let t0 = base - x * x - y * y - z * z
		let n0
		if (t0 < 0.0) {
			n0 = 0.0
		} else {
			t0 *= t0
			n0 = t0 * t0 * SimplexNoise.gradDot(index, x, y, z)
		}
		return n0
	}
}
