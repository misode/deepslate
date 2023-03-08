import { describe, expect, it } from 'vitest'
import { NbtFloat } from '../../../src/nbt/index.js'

describe('NbtFloat', () => {
	it('toString', () => {
		expect(new NbtFloat(4).toString()).toEqual('4f')

		expect(new NbtFloat(2.35).toString()).toEqual('2.35f')
	})
})
