import { describe, expect, it } from 'vitest'
import { NbtDouble } from '../../../src/nbt/index.js'

describe('NbtDouble', () => {
	it('toString', () => {
		const str = new NbtDouble(4).toString()
		expect(str).toEqual('4.0')

		const str2 = new NbtDouble(2.35).toString()
		expect(str2).toEqual('2.35')
	})
})
