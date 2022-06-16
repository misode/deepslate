import { describe, expect, it } from 'vitest'
import { LegacyRandom } from '../../../src/math/index.js'

describe('LegacyRandom', () => {
	it('nextInt', () => {
		const random = new LegacyRandom(BigInt(123))
		const actual = [...Array(10)].map(() => random.nextInt())
		const expected = [-1188957731, 1018954901, -39088943, 1295249578, 1087885590, -1829099982, -1680189627, 1111887674, -833784125, -1621910390]
		expect(actual).toEqual(expected)
	})

	it('nextInt (max)', () => {
		const random = new LegacyRandom(BigInt(123))

		expect(random.nextInt(256)).toEqual(185)
		expect(random.nextInt(255)).toEqual(200)
		expect(random.nextInt(254)).toEqual(74)
	})

	it ('nextFloat', () => {
		const random = new LegacyRandom(BigInt(123))
		const actual = [...Array(10)].map(() => random.nextFloat())
		const expected = [0.72317415, 0.23724389, 0.99089885, 0.30157375, 0.2532931, 0.57412946, 0.60880035, 0.2588815, 0.80586946, 0.6223695]
		actual.forEach((a, i) => {
			expect(a).toBeCloseTo(expected[i], 1e-7)
		})
	})

	it ('nextDouble', () => {
		const random = new LegacyRandom(BigInt(123))
		const actual = [...Array(10)].map(() => random.nextDouble())
		const expected = [0.7231742029971469, 0.9908988967772393,	0.25329310557439133,	0.6088003703785169,	0.8058695140834087,	0.8754127852514174,	0.7160485112997248,	0.07191702249367171,	0.7962609718390335,	0.5787169373422367]
		actual.forEach((a, i) => {
			expect(a).toBeCloseTo(expected[i], 1e-8)
		})
	})
})
