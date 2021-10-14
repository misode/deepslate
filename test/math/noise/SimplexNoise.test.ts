import { expect } from 'chai'
import { LegacyRandom, SimplexNoise } from '../../../src/math'

describe('SimplexNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new LegacyRandom(BigInt(912))
		const noise = new SimplexNoise(random)
		return { random, noise }
	}

	it('create (xo, yo, zo)', () => {
		const { noise } = setup()

		expect(noise.xo).closeTo(184.55927643985504, DELTA)
		expect(noise.yo).closeTo(58.75425464225128, DELTA)
		expect(noise.zo).closeTo(130.74653150081576, DELTA)
	})

	it('create (p)', () => {
		const { noise } = setup()

		expect(noise.p.slice(0, 10)).deep.equal([42, 8, 98, 215, 246, 183, 100, 180, 39, 79])
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, 0)).closeTo(0, DELTA)
		expect(noise.sample(0.5, 4, -2)).closeTo(-0.5641691358024689, DELTA)
		expect(noise.sample(0.5, 5, -2)).closeTo(0.050444444444444535, DELTA)
		expect(noise.sample(-204, 28, 12)).closeTo(-3.2404994462807675E-14, DELTA)
	})

	it('sample2D', () => {
		const { noise } = setup()

		expect(noise.sample2D(0, 0)).closeTo(0, DELTA)
		expect(noise.sample2D(0.5, 4)).closeTo(-0.647057742960899, DELTA)
		expect(noise.sample2D(0.5, 5)).closeTo(-0.22600696858784494, DELTA)
		expect(noise.sample2D(-204, 28)).closeTo(0.2262631529249181, DELTA)
	})
})
