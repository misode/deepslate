import { describe, expect, it } from 'vitest'
import { NbtByte, NbtList, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

describe('NbtTags', () => {
	it('toString', () => {
		const str = new NbtList([new NbtByte(12), new NbtByte(3)]).toString()
		expect(str).toEqual('[12b,3b]')
	})

	it('toBytes', () => {
		const output = new RawDataOutput()
		new NbtList([new NbtByte(12), new NbtByte(3)]).toBytes(output)
		expect(output.getData()).toEqual(new Uint8Array([1,0,0,0,2,12,3]))
	})

	it('fromBytes', () => {
		const input = new RawDataInput([1,0,0,0,2,12,3])
		const list = NbtList.fromBytes(input)
		expect(list.getType()).toEqual(1)
		expect(list.length).toEqual(2)
		expect(list.getNumber(0)).toEqual(12)
		expect(list.getNumber(1)).toEqual(3)
	})

	it('fromBytes (zeroes)', () => {
		const input = new RawDataInput([1,0,0,0,3,0,0,1])
		const list = NbtList.fromBytes(input)
		expect(list.getType()).toEqual(1)
		expect(list.length).toEqual(3)
		expect(list.getNumber(0)).toEqual(0)
		expect(list.getNumber(1)).toEqual(0)
		expect(list.getNumber(2)).toEqual(1)
	})
})
