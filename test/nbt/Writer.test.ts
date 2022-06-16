import { describe, expect, it } from 'vitest'
import { NbtWriter } from '../../src/nbt/index.js'

function matches(writer: NbtWriter, data: number[]) {
	expect(writer.getData()).toEqual(new Uint8Array(data))
}

describe('Writer', () => {
	it('end', () => {
		const writer = new NbtWriter()
		writer.end()
		matches(writer, [])
	})

	it('byte', () => {
		const writer = new NbtWriter()
		writer.byte(4)
		matches(writer, [4])
	})

	it('short', () => {
		const writer = new NbtWriter()
		writer.short(400)
		matches(writer, [1, 144])
	})

	it('int', () => {
		const writer = new NbtWriter()
		writer.int(400000)
		matches(writer, [0, 6, 26, 128])
	})

	it('float', () => {
		const writer = new NbtWriter()
		writer.float(Math.PI)
		matches(writer, [64, 73, 15, 219])
	})

	it('double', () => {
		const writer = new NbtWriter()
		writer.double(Math.PI)
		matches(writer, [64, 9, 33, 251, 84, 68, 45, 24])
	})

	it('long', () => {
		const writer = new NbtWriter()
		writer.long([1546267720, 1763655956])
		matches(writer, [92, 42, 44, 72, 105, 31, 65, 20])
	})

	it('byteArray', () => {
		const writer = new NbtWriter()
		writer.byteArray([1, 3])
		matches(writer, [0, 0, 0, 2, 1, 3])
	})

	it('intArray', () => {
		const writer = new NbtWriter()
		writer.intArray([1, 3])
		matches(writer, [0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 3])
	})

	it('longArray', () => {
		const writer = new NbtWriter()
		writer.longArray([[1546267720, 1763655956]])
		matches(writer, [0, 0, 0, 1, 92, 42, 44, 72, 105, 31, 65, 20])
	})

	it('string', () => {
		const writer = new NbtWriter()
		writer.string('hello')
		matches(writer, [0, 5, 104, 101, 108, 108, 111])
	})

	it('string (large)', () => {
		const writer = new NbtWriter()
		writer.string('a'.repeat(5000))
		matches(writer, [19, 136, ...Array(5000).fill(97)])
	})

	it('list', () => {
		const writer = new NbtWriter()
		writer.list({ type: 'byte', value: [1, 3] })
		matches(writer, [1, 0, 0, 0, 2, 1, 3])

		const writer2 = new NbtWriter()
		writer2.list({ type: 'end', value: [] })
		matches(writer2, [0, 0, 0, 0, 0])
	})

	it('compound', () => {
		const writer = new NbtWriter()
		writer.compound({ foo: { type: 'byte', value: 4 } })
		matches(writer, [1, 0, 3, 102, 111, 111, 4, 0])

		const writer2 = new NbtWriter()
		writer2.compound({})
		matches(writer2, [0])
	})

	it('offset', () => {
		const writer = new NbtWriter()
		writer.offset = 2
		writer.byte(4)
		matches(writer, [0, 0, 4])
	})

	it('offset (outside buffer)', () => {
		const writer = new NbtWriter()
		writer.offset = 2000
		writer.byte(4)
		matches(writer, [...Array(2000).fill(0), 4])
	})
})
