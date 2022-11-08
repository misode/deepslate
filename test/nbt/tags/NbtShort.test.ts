import { describe, expect, it } from 'vitest'
import { NbtShort, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

describe('NbtShort', () => {
	it('toString', () => {
		const str = new NbtShort(12).toString()
		expect(str).toEqual('12s')
	})

	it('toJson', () => {
		const short = new NbtShort(4)
		const json = short.toJson()
		expect(json).toEqual(4)
	})

	it('fromJson', () => {
		const json = 4
		const short = NbtShort.fromJson(json)
		expect(short).toEqual(new NbtShort(4))
	})

	it('toBytes', () => {
		const output = new RawDataOutput()
		new NbtShort(12).toBytes(output)
		expect(output.getData()).toEqual(new Uint8Array([0, 12]))
	})

	it('toBytes (little endian)', () => {
		const output = new RawDataOutput({ littleEndian: true })
		new NbtShort(12).toBytes(output)
		expect(output.getData()).toEqual(new Uint8Array([12, 0]))
	})

	it('fromBytes', () => {
		const input = new RawDataInput([0, 12])
		const short = NbtShort.fromBytes(input)
		expect(short).toEqual(new NbtShort(12))
	})

	it('fromBytes (little endian)', () => {
		const input = new RawDataInput([12, 0], { littleEndian: true })
		const short = NbtShort.fromBytes(input)
		expect(short).toEqual(new NbtShort(12))
	})
})
