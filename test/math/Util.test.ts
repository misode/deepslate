import { describe, expect, it } from 'vitest'
import { hashCode } from '../../src'

describe('Util', () => {
	it('hashCode', () => {
		expect(hashCode('octave_-6')).toEqual(440898200)
	})
})
