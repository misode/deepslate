import { expect } from 'chai'
import type { NoiseSamplingSettings } from '../../../src/math'
import { BlendedNoise, Random } from '../../../src/math'

describe('BlendedNoise', () => {
	const DELTA = 1e-3
	const setup = (seed: number, sampling: NoiseSamplingSettings) => {
		const random = new Random(BigInt(seed))
		const noise = new BlendedNoise(random, sampling, 1, 1)
		return { random, noise }
	}

	it('sample', () => {
		const { noise } = setup(569, { xzScale: 1, yScale: 1, xzFactor: 54752.96, yFactor: 54752.96 })

		expect(noise.sample(0, 0, 0)).closeTo(0.28757988493, DELTA)
		expect(noise.sample(1, 4, -2)).closeTo(0.25894038733, DELTA)
		expect(noise.sample(-204, 28, 12)).closeTo(0.34211369178, DELTA)
	})

	it('sample 2', () => { 
		const { noise } = setup(123, { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 320 })

		expect(noise.sample(3, 3, 2)).closeTo(-0.17967740046, DELTA)
	})
})
