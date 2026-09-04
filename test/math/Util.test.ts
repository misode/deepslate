import { describe, expect, it } from 'vitest'
import { getSeed, hashCode } from '../../src'

describe('Util', () => {
	it('hashCode', () => {
		expect(hashCode('octave_-6')).toEqual(440898200)
		expect(hashCode('minecraft:deepslate')).toEqual(-112689504)
	})

	it('getSeed', () => {
		expect(getSeed(15, 8, 0)).toEqual(106379689997262n)
	})
})
