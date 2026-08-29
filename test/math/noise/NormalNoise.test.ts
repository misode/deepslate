import { describe, expect, it } from 'vitest'
import { LegacyRandom, NormalNoise } from '../../../src/math/index.js'

describe('NormalNoise', () => {
	it('get3D', () => {
		const random = new LegacyRandom(BigInt(82))
		const normalNoise = new NormalNoise(1, -6, 2, 'enabled', [1, 1])
		const noise = normalNoise.create(random)
		console.log(noise.layers)
		expect(noise.get3D(0, 0, 0)).toBeCloseTo(-0.06922730058431625)
		expect(noise.get3D(0.5, 4, -2)).toBeCloseTo(-0.1008465588092804)
		expect(noise.get3D(-204, 28, 12)).toBeCloseTo(-0.0675075352191925)
	})
})
