import { LegacyRandom, PerlinSimplexNoise } from '@math'
import { expect } from 'chai'

describe('PerlinSimplexNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new LegacyRandom(BigInt(912))
		const noise = new PerlinSimplexNoise(random, [-5, -3])
		return { random, noise }
	}

	it('highestFreqInputFactor', () => {
		const { noise } = setup()

		expect(noise.highestFreqInputFactor).equal(0.125)
	})

	it('highestFreqValueFactor', () => {
		const { noise } = setup()

		expect(noise.highestFreqValueFactor).equal(0.14285714285714285)
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, false)).closeTo(0, DELTA)
		expect(noise.sample(0.5, 4, false)).closeTo(-0.21923182504094454, DELTA)
		expect(noise.sample(-204, 28, false)).closeTo(-0.0473969632761884, DELTA)
	})

	it('sample (useOffsets)', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, true)).closeTo(0.19662956141233895, DELTA)
		expect(noise.sample(0.5, 4, true)).closeTo(0.32083820513613104, DELTA)
		expect(noise.sample(-204, 28, true)).closeTo(-0.2808108571523156, DELTA)
	})
})
