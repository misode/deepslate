import { describe, expect, it } from 'vitest'
import { BlendedNoise, LegacyRandom } from '../../../src/math/index.js'

describe('BlendedNoise', () => {
	const DELTA = 1e-3
	const setup = (seed: number, { xzScale, yScale, xzFactor, yFactor }: { xzScale: number, yScale: number, xzFactor: number, yFactor: number }) => {
		const random = new LegacyRandom(BigInt(seed))
		const noise = new BlendedNoise(random, xzScale, yScale, xzFactor, yFactor, 1)
		return { random, noise }
	}

	it('sample', () => {
		const { noise } = setup(569, { xzScale: 1, yScale: 1, xzFactor: 54752.96, yFactor: 54752.96 })

		expect(noise.sample(0, 0, 0)).toBeCloseTo(0.28757988493, DELTA)
		expect(noise.sample(1, 4, -2)).toBeCloseTo(0.25894038733, DELTA)
		expect(noise.sample(-204, 28, 12)).toBeCloseTo(0.34211369178, DELTA)
	})

	it('sample 2', () => { 
		const { noise } = setup(123, { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 320 })

		expect(noise.sample(3, 3, 2)).toBeCloseTo(-0.17967740046, DELTA)
	})
})
