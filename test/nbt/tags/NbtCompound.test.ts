import { describe, expect, it } from 'vitest'
import { NbtCompound, NbtString, RawDataInput } from '../../../src/nbt/index.js'

describe('NbtCompound', () => {
	it('toJson', () => {
		const compound = NbtCompound.create()
			.set('foo', new NbtString('Hello!'))
		const json = compound.toJson()
		expect(json).toStrictEqual({ foo: { type: 8, value: 'Hello!' } })
	})

	it('fromJson', () => {
		const json = { foo: { type: 8, value: 'Hello!' } }
		const compound = NbtCompound.fromJson(json)
		expect(compound.isCompound()).toBeTruthy()
		expect(compound.size).toBe(1)
		expect(compound.get('foo')).toStrictEqual(new NbtString('Hello!'))
	})

	it('fromBytes', () => {
		const input = new RawDataInput([8, 0, 3, 102, 111, 111, 0, 6, 72, 101, 108, 108, 111, 33, 0])
		const compound = NbtCompound.fromBytes(input)
		expect(compound.isCompound()).toBeTruthy()
		expect(compound.size).toBe(1)
		expect(compound.get('foo')).toStrictEqual(new NbtString('Hello!'))
	})
})
