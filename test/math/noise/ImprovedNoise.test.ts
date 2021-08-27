import { expect } from 'chai'
import { ImprovedNoise, Random } from '../../../src/math'

describe('ImprovedNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new Random(BigInt(845))
		const noise = new ImprovedNoise(random)
		return { random, noise }
	}

	it('create (xo, yo, zo)', () => {
		const { noise } = setup()

		expect(noise.xo).to.be.approximately(179.49112098377014, DELTA)
		expect(noise.yo).to.be.approximately(178.89801548324886, DELTA)
		expect(noise.zo).to.be.approximately(139.89344963681773, DELTA)
	})

	it('create (p)', () => {
		const { noise } = setup()

		expect(noise.p.slice(0, 10)).to.deep.equal([12, -96, -12, -36, -104, 102, 106, 117, -105, -119])
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, 0)).to.be.approximately(0.009862268437005883, DELTA)
		expect(noise.sample(0.5, 4, -2)).to.be.approximately(-0.11885865493740287, DELTA)
		expect(noise.sample(-204, 28, 12)).to.be.approximately(-0.589681280485348, DELTA)
	})
})
