import md5 from 'md5'
import { describe, expect, it } from 'vitest'
import { XoroshiroRandom } from '../../../src/math/index.js'

describe('XoroshiroRandom', () => {
	it('seedUpgrade', () => {
		const seed = XoroshiroRandom.create(BigInt(1)).parityConfigString()
		const expected = 'seedLo: 5272463233947570727, seedHi: 1927618558350093866'
		expect(seed).toEqual(expected)
	})

	it('fork', () => {
		const seed = XoroshiroRandom.create(BigInt(1)).fork().parityConfigString()
		const expected = 'seedLo: 17413076366490032638, seedHi: 6451672561743293322'
		expect(seed).toEqual(expected)
	})

	it('md5Bytes', () => {
		expect(md5('dummy', { asBytes: true })).toEqual([39, 88, 118, 227, 76, 246, 9, 219, 17, 143, 61, 132, 183, 153, 167, 144])
	})

	it('nextLong', () => {
		const random = XoroshiroRandom.create(BigInt(1))
		const actual = [...Array(10)].map(() => random.nextLong())
		const expected = [BigInt('-1033667707219518978'), BigInt('6451672561743293322'), BigInt('-1821890263888393630'), BigInt('890086654470169703'), BigInt('8094835630745194324'), BigInt('2779418831538184155'), BigInt('-2153570570747265786'), BigInt('2631759950516672506'), BigInt('1341645417244425603'), BigInt('-2886123833362855573')]
		expect(actual).toEqual(expected)
	})

	it('nextInt', () => {
		const random = XoroshiroRandom.create(BigInt(1))
		const actual = [...Array(10)].map(() => random.nextInt())
		const expected = [1734564350, 836234122, 825264738, -1425890201, 767430484, -2015535141, -606094074, 950360058, 224558467, 916343147]
		expect(actual).toEqual(expected)
	})

	it('nextInt (max)', () => {
		const random = XoroshiroRandom.create(BigInt(1))

		expect(random.nextInt(25)).toEqual(10)
		expect(random.nextInt(256)).toEqual(49)
		expect(random.nextInt(255)).toEqual(48)
		expect(random.nextInt(254)).toEqual(169)
		expect(random.nextInt(0x7FFFFFFF)).toEqual(383715241)
	})

	it ('nextFloat', () => {
		const random = XoroshiroRandom.create(BigInt(1))
		const actual = [...Array(10)].map(() => random.nextFloat())
		const expected = [0.9439647, 0.34974587, 0.9012351, 0.04825169, 0.4388219, 0.15067255, 0.88325465, 0.14266795, 0.07273072, 0.8435429]
		actual.forEach((a, i) => {
			expect(a).toBeCloseTo(expected[i], 1e-7)
		})
	})

	it ('nextDouble', () => {
		const random = XoroshiroRandom.create(BigInt(1))
		const actual = [...Array(10)].map(() => random.nextDouble())
		const expected = [0.9439647613102243, 0.34974587038035987, 0.9012351308931007, 0.048251694223845565, 0.4388219188383503, 0.15067259677004097, 0.8832547054297483, 0.1426679927905259, 0.07273074380408129, 0.84354291349029] 
		actual.forEach((a, i) => {
			expect(a).toBeCloseTo(expected[i], 1e-8)
		})
	})
})
