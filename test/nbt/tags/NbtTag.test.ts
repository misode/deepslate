import { describe, expect, it } from 'vitest'
import { NbtString, NbtTag, RawDataInput } from '../../../src/nbt/index.js'


describe('NbtTag', () => {
	it('fromBytes', () => {
		const input = new RawDataInput(new Uint8Array([8, 0, 3, 102, 111, 111, 0, 6, 72, 101, 108, 108, 111, 33, 0]))
		const nbt = NbtTag.fromBytes(input)
		expect(nbt.isCompound()).toBeTruthy()
		if (nbt.isCompound()) {
			expect(nbt.size).toEqual(1)
			expect(nbt.get('foo')).toEqual(new NbtString('Hello!'))
		}
	})
})
