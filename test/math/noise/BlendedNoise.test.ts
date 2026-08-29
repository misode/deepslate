import { describe, expect, it } from 'vitest'
import { BlendedNoise, LegacyRandom } from '../../../src/math/index.js'

describe('BlendedNoise', () => {
	it('sample', () => {
		const random = new LegacyRandom(BigInt(569))
		const noise = new BlendedNoise(random, 1, 1, 54752.96, 54752.96, 1)
		expect(noise.sample(0, 0, 0)).toBeCloseTo(0.2872169017791748)
		expect(noise.sample(1, 4, -2)).toBeCloseTo(0.2589353621006012)
		expect(noise.sample(-204, 28, 12)).toBeCloseTo(0.3418821692466736)
	})

	it('sample 2', () => {
		const random = new LegacyRandom(BigInt(123))
		const noise = new BlendedNoise(random, 1, 1, 80, 320, 1)
		expect(noise.sample(3, 3, 2)).toBeCloseTo(-0.18018919229507446)
	})
})
