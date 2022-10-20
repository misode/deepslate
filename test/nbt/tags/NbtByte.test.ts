import { describe, expect, it } from 'vitest'
import { NbtByte, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

describe('NbtByte', () => {
	it('toString', () => {
		const str = new NbtByte(12).toString()
		expect(str).toBe('12b')
	})

	it('toJson', () => {
		const byte = new NbtByte(4)
		const json = byte.toJson()
		expect(json).toBe(4)
	})

	it('fromJson', () => {
		const json = 4
		const byte = NbtByte.fromJson(json)
		expect(byte).toStrictEqual(new NbtByte(4))
	})

	it('fromBytes', () => {
		const input = new RawDataInput([12])
		const byte = NbtByte.fromBytes(input)
		expect(byte).toStrictEqual(new NbtByte(12))
	})

	it('toBytes', () => {
		const output = new RawDataOutput()
		new NbtByte(12).toBytes(output)
		expect(output.getData()).toStrictEqual(new Uint8Array([12]))
	})
})
