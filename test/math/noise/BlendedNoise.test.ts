import { expect } from 'chai'
import { BlendedNoise, Random } from '../../../src/math'

describe('BlendedNoise', () => {
	const DELTA = 1e-3
	const setup = (seed: number) => {
		const random = new Random(BigInt(seed))
		const noise = new BlendedNoise(random)
		return { random, noise }
	}

	it('sample', () => {
		const { noise } = setup(569)
		const sampling = [684.412, 684.412, 0.0125, 0.0125] as const

		expect(noise.sample(0, 0, 0, ...sampling)).closeTo(36.810225271974495, DELTA)
		expect(noise.sample(1, 4, -2, ...sampling)).closeTo(33.14436957857784, DELTA)
		expect(noise.sample(-204, 28, 12, ...sampling)).closeTo(43.79055254881905, DELTA)
	})

	it('sample 2', () => { 
		const { noise } = setup(123)

		expect(noise.sample(3, 3, 2, 684.412, 684.412, 8.55515, 2.1387875)).closeTo(-22.998707259763467, DELTA)
	})
})
