import { expect } from 'chai'
import { Random, SimplexNoise } from '../../../src/math'

describe('SimplexNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new Random(BigInt(912))
		const noise = new SimplexNoise(random)
		return { random, noise }
	}

	it('create (xo, yo, zo)', () => {
		const { noise } = setup()

		expect(noise.xo).to.be.approximately(184.55927643985504, DELTA)
		expect(noise.yo).to.be.approximately(58.75425464225128, DELTA)
		expect(noise.zo).to.be.approximately(130.74653150081576, DELTA)
	})

	it('create (p)', () => {
		const { noise } = setup()

		expect(noise.p.slice(0, 10)).to.deep.equal([42, 8, 98, 215, 246, 183, 100, 180, 39, 79])
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, 0)).to.be.approximately(0, DELTA)
		expect(noise.sample(0.5, 4, -2)).to.be.approximately(-0.5641691358024689, DELTA)
		expect(noise.sample(0.5, 5, -2)).to.be.approximately(0.050444444444444535, DELTA)
		expect(noise.sample(-204, 28, 12)).to.be.approximately(-3.2404994462807675E-14, DELTA)
	})

	it('sample2D', () => {
		const { noise } = setup()

		expect(noise.sample2D(0, 0)).to.be.approximately(0, DELTA)
		expect(noise.sample2D(0.5, 4)).to.be.approximately(-0.647057742960899, DELTA)
		expect(noise.sample2D(0.5, 5)).to.be.approximately(-0.22600696858784494, DELTA)
		expect(noise.sample2D(-204, 28)).to.be.approximately(0.2262631529249181, DELTA)
	})
})
