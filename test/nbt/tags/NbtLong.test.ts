import { describe, expect, it } from 'vitest'
import { NbtLong, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

describe('NbtLong', () => {
	it('toString', () => {
		const str = new NbtLong([0, 12]).toString()
		expect(str).toEqual('12L')
	})

	it('toJson', () => {
		const byte = new NbtLong([0, 4])
		const json = byte.toJson()
		expect(json).toEqual([0, 4])
	})

	it('fromJson', () => {
		const json = [0, 4]
		const byte = NbtLong.fromJson(json)
		expect(byte).toEqual(new NbtLong([0, 4]))
	})

	it('toBytes', () => {
		const output = new RawDataOutput()
		new NbtLong([0, 12]).toBytes(output)
		expect(output.getData()).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 12]))
	})

	it('fromBytes', () => {
		const input = new RawDataInput([0, 0, 0, 0, 0, 0, 0, 12])
		const byte = NbtLong.fromBytes(input)
		expect(byte).toEqual(new NbtLong([0, 12]))
	})

	it('bigintToPair', () => {
		expect(NbtLong.bigintToPair(4294967296n)).toEqual([1, 0])
		expect(NbtLong.bigintToPair(25872883260404n)).toEqual([6024, 269300])
	})

	it('pairToBigint', () => {
		expect(NbtLong.pairToBigint([1, 0])).toEqual(4294967296n)
		expect(NbtLong.pairToBigint([6024, 269300])).toEqual(25872883260404n)
	})

	it('pairToString', () => {
		expect(NbtLong.pairToString([1, 0])).toEqual('4294967296')
		expect(NbtLong.pairToString([6024, 269300])).toEqual('25872883260404')
	})
})
