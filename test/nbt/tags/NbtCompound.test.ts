import { describe, expect, it } from 'vitest'
import { NbtByte, NbtCompound, NbtString, NbtTag, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

describe('NbtCompound', () => {
	it('toJson', () => {
		const compound = NbtCompound.create()
			.set('foo', new NbtString('Hello!'))
		const json = compound.toJson()
		expect(json).toEqual({ foo: { type: 8, value: 'Hello!' } })
	})

	it('fromJson', () => {
		const json = { foo: { type: 8, value: 'Hello!' } }
		const compound = NbtCompound.fromJson(json)
		expect(compound.isCompound()).toBeTruthy()
		expect(compound.size).toEqual(1)
		expect(compound.get('foo')).toEqual(new NbtString('Hello!'))
	})

	it('fromBytes', () => {
		const input = new RawDataInput([8, 0, 3, 102, 111, 111, 0, 6, 72, 101, 108, 108, 111, 33, 0])
		const compound = NbtCompound.fromBytes(input)
		expect(compound.isCompound()).toBeTruthy()
		expect(compound.size).toEqual(1)
		expect(compound.get('foo')).toEqual(new NbtString('Hello!'))
	})

	it('toBytes', () => {
		const compound = new NbtCompound()
			.set('foo', new NbtString('Hello!'))
		const output = new RawDataOutput()
		compound.toBytes(output)
		expect(output.getData()).toEqual(new Uint8Array([8, 0, 3, 102, 111, 111, 0, 6, 72, 101, 108, 108, 111, 33, 0]))
	})

	it('toBytes (empty compound)', () => {
		const compound = new NbtCompound()
		const output = new RawDataOutput()
		compound.toBytes(output)
		expect(output.getData()).toEqual(new Uint8Array([0]))
	})

	it('fromString', () => {
		const string = '{hello: 4b, foo :"world!" }'
		const tag = NbtTag.fromString(string)
		expect(tag).toEqual(new NbtCompound()
			.set('hello', new NbtByte(4))
			.set('foo', new NbtString('world!')))
	})

	it('fromString (quoted key)', () => {
		const string = '{"hello world": 4b}'
		const tag = NbtTag.fromString(string)
		expect(tag).toEqual(new NbtCompound()
			.set('hello world', new NbtByte(4)))
	})

	it('toString', () => {
		const compound = new NbtCompound()
			.set('hello', new NbtByte(4))
			.set('foo', new NbtString('world!'))
		const string = compound.toString()
		expect(string).toEqual('{hello:4b,foo:"world!"}')
	})

	it('toString (quoted key)', () => {
		const compound = new NbtCompound()
			.set('hello world', new NbtByte(4))
		const string = compound.toString()
		expect(string).toEqual('{"hello world":4b}')
	})

	it('toString (key escaping)', () => {
		const compound = new NbtCompound()
			.set('hello "world"', new NbtByte(4))
		const string = compound.toString()
		expect(string).toEqual('{"hello \\"world\\"":4b}')
	})

	it('toPrettyString (key escaping)', () => {
		const compound = new NbtCompound()
			.set('hello "world"', new NbtByte(4))
		const string = compound.toPrettyString()
		expect(string).toEqual('{\n  "hello \\"world\\"": 4b\n}')
	})

	it('toPrettyString (nested and quoted keys)', () => {
		const compound = new NbtCompound()
			.set('wrapper', new NbtCompound()
				.set('first', new NbtByte(3))
				.set('second key', new NbtString('hello world')))
		const string = compound.toPrettyString()
		expect(string).toEqual('{\n  wrapper: {\n    first: 3b,\n    "second key": "hello world"\n  }\n}')
	})
})
