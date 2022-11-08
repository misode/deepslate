import { describe, expect, it } from 'vitest'
import { NbtByte, NbtCompound, NbtInt, NbtIntArray, NbtList, NbtLong, NbtShort, NbtString, NbtTag, RawDataInput, RawDataOutput } from '../../src/nbt'

describe('Roundtrip', () => {
	const TAGS: NbtTag[] = [
		new NbtByte(4),
		new NbtShort(400),
		new NbtInt(400000),
		new NbtLong([6024, 269300]),
		NbtList.make(NbtInt, [40, 14, 560, 12348]),
		new NbtList([
			new NbtCompound().set('foo', new NbtString('bar')).set('baz', new NbtByte(-5)),
			new NbtCompound().set('edrusw', new NbtLong([0, 23454])),
		]),
		new NbtCompound()
			.set('foo', new NbtInt(5))
			.set('bar', new NbtString('hello'))
			.set('baz', NbtList.make(NbtByte, [1, 3])),
		new NbtCompound()
			.set('foo', new NbtIntArray([4, 123, 6027, 153971, 359813, 2148902, 32483, 12938]))
			.set('bar', new NbtString('hello!!'))
			.set('bzzz', new NbtList([
				new NbtCompound()
					.set('blah', new NbtShort(12345))
					.set('AedrfjA', new NbtString('5giojihs')),
			])),
	]

	it.each(TAGS.map(t => [t]))('toBytes/fromBytes', tag => {
		const output = new RawDataOutput()
		tag.toBytes(output)
		const bytes = output.getData()
		const input = new RawDataInput(bytes)
		const tag2 = NbtTag.fromBytes(input, tag.getId())
		expect(tag2).toStrictEqual(tag)

		const output2 = new RawDataOutput()
		tag2.toBytes(output2)
		const bytes2 = output2.getData()
		expect(bytes2).toStrictEqual(bytes)
	})

	it.each(TAGS.map(t => [t]))('toJson/fromJson', tag => {
		const json = tag.toJson()
		const tag2 = NbtTag.fromJson(json, tag.getId())
		expect(tag2).toStrictEqual(tag)

		const json2 = tag2.toJson()
		expect(json2).toStrictEqual(json)
	})

	it.each(TAGS.map(t => [t]))('toJsonWithId/fromJsonWithId', tag => {
		const json = tag.toJsonWithId()
		const tag2 = NbtTag.fromJsonWithId(json)
		expect(tag2).toStrictEqual(tag)

		const json2 = tag2.toJsonWithId()
		expect(json2).toStrictEqual(json)
	})

	it.each(TAGS.map(t => [t]))('toString/fromString', tag => {
		const string = tag.toString()
		const tag2 = NbtTag.fromString(string)
		expect(tag2).toStrictEqual(tag)

		const string2 = tag2.toString()
		expect(string2).toStrictEqual(string)
	})

	it.each(TAGS.map(t => [t]))('toPrettyString/fromString', tag => {
		const string = tag.toPrettyString()
		const tag2 = NbtTag.fromString(string)
		expect(tag2).toStrictEqual(tag)

		const string2 = tag2.toPrettyString()
		expect(string2).toStrictEqual(string)
	})
})
