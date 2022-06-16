import { describe, expect, it } from 'vitest'
import { NbtReader } from '../../src/nbt/index.js'

function Reader(data: number[]) {
	return new NbtReader(new Uint8Array(data))
}

describe('Reader', () => {
	it('end', () => {
		const reader = Reader([])
		expect(reader.end()).null
	})

	it('byte', () => {
		const reader = Reader([4])
		expect(reader.byte()).toEqual(4)
	})

	it('short', () => {
		const reader = Reader([1, 144])
		expect(reader.short()).toEqual(400)
	})

	it('int', () => {
		const reader = Reader([0, 6, 26, 128])
		expect(reader.int()).toEqual(400000)
	})

	it('float', () => {
		const reader = Reader([64, 73, 15, 219])
		expect(reader.float()).toBeCloseTo(Math.PI, 1e-7)
	})

	it('double', () => {
		const reader = Reader([64, 9, 33, 251, 84, 68, 45, 24])
		expect(reader.double()).toEqual(Math.PI)
	})

	it('long', () => {
		const reader = Reader([92, 42, 44, 72, 105, 31, 65, 20])
		expect(reader.long()).toEqual([1546267720, 1763655956])
	})

	it('byteArray', () => {
		const reader = Reader([0, 0, 0, 2, 1, 3])
		expect(reader.byteArray()).toEqual([1, 3])
	})

	it('intArray', () => {
		const reader = Reader([0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 3])
		expect(reader.intArray()).toEqual([1, 3])
	})

	it('longArray', () => {
		const reader = Reader([0, 0, 0, 1, 92, 42, 44, 72, 105, 31, 65, 20])
		expect(reader.longArray()).toEqual([[1546267720, 1763655956]])
	})

	it('string', () => {
		const reader = Reader([0, 5, 104, 101, 108, 108, 111])
		expect(reader.string()).toEqual('hello')
	})

	it('string (large)', () => {
		const reader = Reader([19, 136, ...Array(5000).fill(97)])
		expect(reader.string()).toEqual('a'.repeat(5000))
	})

	it('list', () => {
		const reader = Reader([1, 0, 0, 0, 2, 1, 3])
		expect(reader.list()).toEqual({ type: 'byte', value: [1, 3] })

		const reader2 = Reader([0, 0, 0, 0, 0])
		expect(reader2.list()).toEqual({ type: 'end', value: [] })
	})

	it('compound', () => {
		const reader = Reader([1, 0, 3, 102, 111, 111, 4, 0])
		expect(reader.compound()).toEqual({ foo: { type: 'byte', value: 4 } })

		const reader2 = Reader([0])
		expect(reader2.compound()).toEqual({})
	})

	it('offset', () => {
		const reader = Reader([0, 0, 4])
		reader.offset = 2
		expect(reader.byte()).toEqual(4)
	})
})
