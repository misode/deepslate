import { describe, expect, it } from 'vitest'
import { ImprovedNoise, LegacyRandom } from '../../../src/math/index.js'

describe('ImprovedNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new LegacyRandom(BigInt(845))
		const noise = new ImprovedNoise(random)
		return { random, noise }
	}

	it('create (xo, yo, zo)', () => {
		const { noise } = setup()

		expect(noise.xo).toBeCloseTo(179.49112098377014, DELTA)
		expect(noise.yo).toBeCloseTo(178.89801548324886, DELTA)
		expect(noise.zo).toBeCloseTo(139.89344963681773, DELTA)
	})

	it('create (p)', () => {
		const { noise } = setup()

		expect(noise.p.slice(0, 10)).toEqual([12, -96, -12, -36, -104, 102, 106, 117, -105, -119])
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, 0)).toBeCloseTo(0.009862268437005883, DELTA)
		expect(noise.sample(0.5, 4, -2)).toBeCloseTo(-0.11885865493740287, DELTA)
		expect(noise.sample(-204, 28, 12)).toBeCloseTo(-0.589681280485348, DELTA)
	})
})
