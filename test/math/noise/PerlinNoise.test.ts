import { describe, expect, it } from 'vitest'
import { LegacyRandom, PerlinNoise } from '../../../src/math/index.js'

describe('PerlinNoise', () => {
	const DELTA = 1e-5
	const setup = () => {
		const random = new LegacyRandom(BigInt(381))
		const noise = new PerlinNoise(random, -6, [1.0, 1.0])
		return { random, noise }
	}

	it('create (throw)', () => {
		const random = new LegacyRandom(BigInt(381))

		expect(() => new PerlinNoise(random, -2, [1.0, 1.0, 1.0])).not.toThrow()
		expect(() => new PerlinNoise(random, -2, [1.0, 1.0, 1.0, 1.0])).toThrow()
	})

	it('lowestFreqInputFactor', () => {
		const { noise } = setup()

		expect(noise.lowestFreqInputFactor).toEqual(0.015625)
	})

	it('lowestFreqValueFactor', () => {
		const { noise } = setup()

		expect(noise.lowestFreqValueFactor).toEqual(0.6666666666666666)
	})

	it('getOctaveNoise', () => {
		const { noise } = setup()

		const a = noise.getOctaveNoise(0)
		expect(a?.xo).toBeCloseTo(252.30428387947788, DELTA)
		expect(a?.yo).toBeCloseTo(91.19418262226526, DELTA)
		expect(a?.zo).toBeCloseTo(148.63521250782387, DELTA)

		const b = noise.getOctaveNoise(1)
		expect(b?.xo).toBeCloseTo(154.37361734654647, DELTA)
		expect(b?.yo).toBeCloseTo(121.98040481096697, DELTA)
		expect(b?.zo).toBeCloseTo(177.4293497162652, DELTA)
	})

	it('sample', () => {
		const { noise } = setup()

		expect(noise.sample(0, 0, 0)).toBeCloseTo(0.02904968471563733, DELTA)
		expect(noise.sample(0.5, 4, -2)).toBeCloseTo(-0.003498819899307167, DELTA)
		expect(noise.sample(-204, 28, 12)).toBeCloseTo(0.19407799903721645, DELTA)
	})
})
