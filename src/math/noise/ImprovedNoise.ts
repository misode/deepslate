import type { Random } from '../random/index.js'
import { intFloor, lerp3, smoothstep } from '../Util.js'
import { SimplexNoise } from './SimplexNoise.js'

export class ImprovedNoise {
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
			this.p[i] = i > 127 ? i - 256 : i
		}
		for (let i = 0; i < 256; i += 1) {
			const j = random.nextInt(256 - i)
			const b = this.p[i]
			this.p[i] = this.p[i + j]
			this.p[i + j] = b
		}
	}

	public sample(x: number, y: number, z: number, yScale = 0, yLimit = 0) {
		const x2 = x + this.xo
		const y2 = y + this.yo
		const z2 = z + this.zo
		const x3 = intFloor(x2)
		const y3 = intFloor(y2)
		const z3 = intFloor(z2)
		const x4 = x2 - x3
		const y4 = y2 - y3
		const z4 = z2 - z3

		let y6 = 0
		if (yScale !== 0) {
			const t = yLimit >= 0 && yLimit < y4 ? yLimit : y4
			y6 = intFloor(t / yScale + 1e-7) * yScale
		}

		return this.sampleAndLerp(x3, y3, z3, x4, y4 - y6, z4, y4)
	}

	private sampleAndLerp(a: number, b: number, c: number, d: number, e: number, f: number, g: number) {
		const h = this.P(a)
		const i = this.P(a + 1)
		const j = this.P(h + b)
		const k = this.P(h + b + 1)
		const l = this.P(i + b)
		const m = this.P(i + b + 1)

		const n = SimplexNoise.gradDot(this.P(j + c), d, e, f)
		const o = SimplexNoise.gradDot(this.P(l + c), d - 1.0, e, f)
		const p = SimplexNoise.gradDot(this.P(k + c), d, e - 1.0, f)
		const q = SimplexNoise.gradDot(this.P(m + c), d - 1.0, e - 1.0, f)
		const r = SimplexNoise.gradDot(this.P(j + c + 1), d, e, f - 1.0)
		const s = SimplexNoise.gradDot(this.P(l + c + 1), d - 1.0, e, f - 1.0)
		const t = SimplexNoise.gradDot(this.P(k + c + 1), d, e - 1.0, f - 1.0)
		const u = SimplexNoise.gradDot(this.P(m + c + 1), d - 1.0, e - 1.0, f - 1.0)

		const v = smoothstep(d)
		const w = smoothstep(g)
		const x = smoothstep(f)

		return lerp3(v, w, x, n, o, p, q, r, s, t, u)
	}

	private P(i: number) {
		return this.p[i & 0xFF] & 0xFF
	}
}
