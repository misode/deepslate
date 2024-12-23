import type { Random } from '../random/index.js'
import { intFloor } from '../Util.js'

export class SimplexNoise {
	private static readonly GRADIENT = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1], [1, 1, 0], [0, -1, 1], [-1, 1, 0], [0, -1, -1]]
	private static readonly F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
	private static readonly G2 = (3.0 - Math.sqrt(3.0)) / 6.0

	public readonly p: number[]
	public readonly xo: number
	public readonly yo: number
	public readonly zo: number

	constructor(random: Random) {
		this.xo = random.nextDouble() * 256
		this.yo = random.nextDouble() * 256
		this.zo = random.nextDouble() * 256
		this.p = Array(256)

		for (let i = 0; i < 256; i += 1) {
			this.p[i] = i
		}
		for (let i = 0; i < 256; i += 1) {
			const j = random.nextInt(256 - i)
			const b = this.p[i]
			this.p[i] = this.p[i + j]
			this.p[i + j] = b
		}
	}

	public sample2D(d: number, d2: number) {
		const d6 = (d + d2) * SimplexNoise.F2
		const n4 = intFloor(d + d6)
		const n3 = intFloor(d2 + d6)
		const d3 = (n4 + n3) * SimplexNoise.G2
		const d7 = n4 - d3
		const d8 = d - d7
		let a
		let b
		const d4 = d2 - (n3 - d3)
		if (d8 > d4) {
			a = 1
			b = 0
		} else {
			a = 0
			b = 1
		}
		const d9 = d8 - a + SimplexNoise.G2
		const d10 = d4 - b + SimplexNoise.G2
		const d11 = d8 - 1.0 + 2.0 * SimplexNoise.G2
		const d12 = d4 - 1.0 + 2.0 * SimplexNoise.G2
		const n5 = n4 & 0xFF
		const n6 = n3 & 0xFF
		const n7 = this.P(n5 + this.P(n6)) % 12
		const n8 = this.P(n5 + a + this.P(n6 + b)) % 12
		const n9 = this.P(n5 + 1 + this.P(n6 + 1)) % 12
		const d13 = this.getCornerNoise3D(n7, d8, d4, 0.0, 0.5)
		const d14 = this.getCornerNoise3D(n8, d9, d10, 0.0, 0.5)
		const d15 = this.getCornerNoise3D(n9, d11, d12, 0.0, 0.5)
		return 70.0 * (d13 + d14 + d15)
	}

	public sample(x: number, y: number, z: number) {
		const d5 = (x + y + z) * 0.3333333333333333
		const x2 = intFloor(x + d5)
		const y2 = intFloor(y + d5)
		const z2 = intFloor(z + d5)
		const d7 = (x2 + y2 + z2) * 0.16666666666666666
		const x3 = x - (x2 - d7)
		const y3 = y - (y2 - d7)
		const z3 = z - (z2 - d7)
		let a
		let b
		let c
		let d
		let e
		let f
		if (x3 >= y3) {
			if (y3 >= z3) {
				a = 1
				b = 0
				c = 0
				d = 1
				e = 1
				f = 0
			} else if (x3 >= z3) {
				a = 1
				b = 0
				c = 0
				d = 1
				e = 0
				f = 1
			} else {
				a = 0
				b = 0
				c = 1
				d = 1
				e = 0
				f = 1
			}
		} else if (y3 < z3) {
			a = 0
			b = 0
			c = 1
			d = 0
			e = 1
			f = 1
		} else if (x3 < z3) {
			a = 0
			b = 1
			c = 0
			d = 0
			e = 1
			f = 1
		} else {
			a = 0
			b = 1
			c = 0
			d = 1
			e = 1
			f = 0
		}
		const x4 = x3 - a + 0.16666666666666666
		const y4 = y3 - b + 0.16666666666666666
		const z4 = z3 - c + 0.16666666666666666
		const x5 = x3 - d + 0.3333333333333333
		const y5 = y3 - e + 0.3333333333333333
		const z5 = z3 - f + 0.3333333333333333
		const x6 = x3 - 0.5
		const y6 = y3 - 0.5
		const z6 = z3 - 0.5
		const x7 = x2 & 0xFF
		const y7 = y2 & 0xFF
		const z7 = z2 & 0xFF
		const g = this.P(x7 + this.P(y7 + this.P(z7))) % 12
		const h = this.P(x7 + a + this.P(y7 + b + this.P(z7 + c))) % 12
		const i = this.P(x7 + d + this.P(y7 + e + this.P(z7 + f))) % 12
		const j = this.P(x7 + 1 + this.P(y7 + 1 + this.P(z7 + 1))) % 12
		const k = this.getCornerNoise3D(g, x3, y3, z3, 0.6)
		const l = this.getCornerNoise3D(h, x4, y4, z4, 0.6)
		const m = this.getCornerNoise3D(i, x5, y5, z5, 0.6)
		const n = this.getCornerNoise3D(j, x6, y6, z6, 0.6)
		return 32.0 * (k + l + m + n)
	}

	private P(i: number) {
		return this.p[i & 0xFF]
	}

	private getCornerNoise3D(i: number, a: number, b: number, c: number, d: number) {
		let f
		let e = d - a * a - b * b - c * c
		if (e < 0.0) {
			f = 0.0
		} else {
			e *= e
			f = e * e * SimplexNoise.gradDot(i, a, b, c)
		}
		return f
	}

	public static gradDot(a: number, b: number, c: number, d: number) {
		const grad = SimplexNoise.GRADIENT[a & 15]
		return grad[0] * b + grad[1] * c + grad[2] * d
	}
}
