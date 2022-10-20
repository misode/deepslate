import { describe, expect, it } from 'vitest'
import { NbtByte, NbtList, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

describe('NbtTags', () => {
	it('toString', () => {
		const str = new NbtList([new NbtByte(12), new NbtByte(3)]).toString()
		expect(str).toBe('[12b,3b]')
	})

	it('fromBytes', () => {
		const input = new RawDataInput([1,0,0,0,2,12,3])
		const list = NbtList.fromBytes(input)
		expect(list.getType()).toBe(1)
		expect(list.length).toBe(2)
		expect(list.getNumber(0)).toBe(12)
		expect(list.getNumber(1)).toBe(3)
	})

	it('toBytes', () => {
		const output = new RawDataOutput()
		new NbtList([new NbtByte(12), new NbtByte(3)]).toBytes(output)
		expect(output.getData()).toStrictEqual(new Uint8Array([1,0,0,0,2,12,3]))
	})
})
