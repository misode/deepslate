import { describe, expect, it } from 'vitest'
import { NbtCompound, NbtString, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

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
})
