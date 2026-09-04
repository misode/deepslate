import { describe, expect, it } from 'vitest'
import { LegacyRandom, PerlinNoise } from '../../../src/math/index.js'

describe('PerlinNoise', () => {
	it('get3D', () => {
		const random = new LegacyRandom(BigInt(845))
		const noise = new PerlinNoise(random)
		expect(noise.get3D(0, 0, 0)).toBeCloseTo(0.009862303733825684)
		expect(noise.get3D(0.5, 4, -2)).toBeCloseTo(-0.11885859817266464)
		expect(noise.get3D(-204, 28, 12)).toBeCloseTo(-0.5896812081336975)
	})
})
