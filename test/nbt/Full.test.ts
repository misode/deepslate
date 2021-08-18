import { expect } from 'chai'
import 'mocha'
import type { NbtValues, tagTypes } from '../../src/nbt'
import { NbtReader, NbtWriter } from '../../src/nbt'

function test<T extends keyof typeof tagTypes>(type: T, data: NbtValues[T]) {
	const writer = new NbtWriter()
	// @ts-ignore
	writer[type](data)
	const raw = writer.getData()
	expect(raw).to.be.instanceOf(Uint8Array)

	const reader = new NbtReader(raw)
	// @ts-ignore
	const data2 = reader[type]()
	expect(data2).to.deep.equal(data)

	const writer2 = new NbtWriter()
	// @ts-ignore
	writer2[type](data2)
	const raw2 = writer2.getData()
	expect(raw2).to.deep.equal(raw)
}

describe('Full', () => {
	it('primitives', () => {
		test('byte', 4)
		test('short', 400)
		test('int', 400000)
		test('long', [6024, 269300])
	})

	it('lists', () => {
		test('list', { type: 'int', value: [
			40, 14, 560, 12348,
		]})
		test('list', { type: 'compound', value: [
			{ foo: { type: 'string', value: 'bar' }, baz: { type: 'byte', value: -5 } },
			{ edrusw: { type: 'long', value: [0, 23454] } },
		]})
	})

	it('nested compound', () => {
		test('compound', {
			foo: { type: 'int', value: 5 },
			bar: { type: 'string', value: 'hello' },
			baz: { type: 'list', value: {
				type: 'byte', value: [1, 3],
			} },
		})
	})

	it('complex', () => {
		test('compound', {
			foo: { type: 'intArray', value: [
				4, 123, 6027, 153971, 359813, 2148902, 32483, 12938,
			] },
			bar: { type: 'string', value: 'hello' },
			baz: { type: 'list', value: { type: 'compound', value: [
				{
					blah: { type: 'short', value: 12345 },
					AedrfjA: { type: 'string', value: '5giojihs' },
				},
			] } },
		})
	})
})
