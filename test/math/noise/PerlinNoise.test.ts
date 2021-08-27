import { expect } from 'chai'
import { PerlinNoise, Random } from '../../../src/math'

describe('PerlinNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new Random(BigInt(381))
		const noise = new PerlinNoise(random, -6, [1.0, 1.0])
		return { random, noise }
	}

	it('create (throw)', () => {
		const random = new Random(BigInt(381))

		expect(() => new PerlinNoise(random, -2, [1.0, 1.0, 1.0])).to.not.throw()
		expect(() => new PerlinNoise(random, -2, [1.0, 1.0, 1.0, 1.0])).to.throw()
	})

	it('lowestFreqInputFactor', () => {
		const { noise } = setup()

		expect(noise.lowestFreqInputFactor).to.equal(0.015625)
	})

	it('lowestFreqValueFactor', () => {
		const { noise } = setup()

		expect(noise.lowestFreqValueFactor).to.equal(0.6666666666666666)
	})

	it('getOctaveNoise', () => {
		const { noise } = setup()

		const a = noise.getOctaveNoise(0)
		expect(a?.xo).to.be.approximately(252.30428387947788, DELTA)
		expect(a?.yo).to.be.approximately(91.19418262226526, DELTA)
		expect(a?.zo).to.be.approximately(148.63521250782387, DELTA)

		const b = noise.getOctaveNoise(1)
		expect(b?.xo).to.be.approximately(154.37361734654647, DELTA)
		expect(b?.yo).to.be.approximately(121.98040481096697, DELTA)
		expect(b?.zo).to.be.approximately(177.4293497162652, DELTA)
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, 0)).to.be.approximately(0.02904968471563733, DELTA)
		expect(noise.sample(0.5, 4, -2)).to.be.approximately(-0.003498819899307167, DELTA)
		expect(noise.sample(-204, 28, 12)).to.be.approximately(0.19407799903721645, DELTA)
	})
})
