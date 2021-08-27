import { expect } from 'chai'
import { BlendedNoise, Random } from '../../../src/math'

describe('BlendedNoise', () => {
	const DELTA = 1e-3
	const setup = () => {
		const random = new Random(BigInt(569))
		const noise = new BlendedNoise(random)
		return { random, noise }
	}

	it('sample', () => {
		const { noise } = setup()

		const sampling: [number, number, number, number] = [684.412, 684.412, 0.0125, 0.0125]

		expect(noise.sample(0, 0, 0, ...sampling)).to.be.approximately(36.810225271974495, DELTA)
		expect(noise.sample(1, 4, -2, ...sampling)).to.be.approximately(33.14436957857784, DELTA)
		expect(noise.sample(-204, 28, 12, ...sampling)).to.be.approximately(43.79055254881905, DELTA)
	})
})
