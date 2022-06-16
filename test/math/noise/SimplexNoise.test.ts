import { describe, expect, it } from 'vitest'
import { LegacyRandom, SimplexNoise } from '../../../src/math/index.js'

describe('SimplexNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new LegacyRandom(BigInt(912))
		const noise = new SimplexNoise(random)
		return { random, noise }
	}

	it('create (xo, yo, zo)', () => {
		const { noise } = setup()

		expect(noise.xo).toBeCloseTo(184.55927643985504, DELTA)
		expect(noise.yo).toBeCloseTo(58.75425464225128, DELTA)
		expect(noise.zo).toBeCloseTo(130.74653150081576, DELTA)
	})

	it('create (p)', () => {
		const { noise } = setup()

		expect(noise.p.slice(0, 10)).toEqual([42, 8, 98, 215, 246, 183, 100, 180, 39, 79])
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, 0)).toBeCloseTo(0, DELTA)
		expect(noise.sample(0.5, 4, -2)).toBeCloseTo(-0.5641691358024689, DELTA)
		expect(noise.sample(0.5, 5, -2)).toBeCloseTo(0.050444444444444535, DELTA)
		expect(noise.sample(-204, 28, 12)).toBeCloseTo(-3.2404994462807675E-14, DELTA)
	})

	it('sample2D', () => {
		const { noise } = setup()

		expect(noise.sample2D(0, 0)).toBeCloseTo(0, DELTA)
		expect(noise.sample2D(0.5, 4)).toBeCloseTo(-0.647057742960899, DELTA)
		expect(noise.sample2D(0.5, 5)).toBeCloseTo(-0.22600696858784494, DELTA)
		expect(noise.sample2D(-204, 28)).toBeCloseTo(0.2262631529249181, DELTA)
	})
})
