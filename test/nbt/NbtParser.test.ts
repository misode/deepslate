import { describe, expect, it } from 'vitest'
import type { NbtTag } from '../../src/nbt'
import { NbtByte, NbtByteArray, NbtCompound, NbtDouble, NbtFloat, NbtInt, NbtIntArray, NbtList, NbtLong, NbtLongArray, NbtString } from '../../src/nbt'
import { NbtParser } from '../../src/nbt/NbtParser'
import { StringReader } from '../../src/util'

describe('NbtParser', () => {
	const suites: [string, NbtTag][] = [
		['false', new NbtByte(0)],
		['true', new NbtByte(1)],
		['nottrue', new NbtString('nottrue')],
		['3b', new NbtByte(3)],
		['2f', new NbtFloat(2)],
		['2.5', new NbtDouble(2.5)],
		['63', new NbtInt(63)],
		['1024L', new NbtLong([0, 1024])],
		['1024l', new NbtLong([0, 1024])],
		['[4 ,  2 ]', new NbtList([new NbtInt(4), new NbtInt(2)])],
		['5000.22.2', new NbtString('5000.22.2')],
		['{ id: 12, What: "bar"}', new NbtCompound()
			.set('id', new NbtInt(12))
			.set('What', new NbtString('bar'))],
		['{WhAt:bar}', new NbtCompound()
			.set('WhAt', new NbtString('bar'))],
		['{ this: { foo: [] } }', new NbtCompound()
			.set('this', new NbtCompound()
				.set('foo', new NbtList()))],
		['[B; 4b,  2b]', new NbtByteArray([4, 2])],
		['[B;]', new NbtByteArray()],
		['[I; 4]', new NbtIntArray([4])],
		['[L; 4l]', new NbtLongArray([[0, 4]])],
	]

	suites.forEach(([source, expected]) => {
		it(source, () => {
			const tag = NbtParser.readTag(new StringReader(source))
			expect(tag).toStrictEqual(expected)
		})
	})

	const invalidSuites: [string, string][] = [
		['{hello:', 'Expected value at position 7: {hello:<--[HERE]'],
		['"1abc', 'Unclosed quoted string at position 5: "1abc<--[HERE]'],
		['[what, ,]', 'Expected value at position 7: [what, <--[HERE]'],
		['[}]', 'Expected value at position 1: [<--[HERE]'],
		['[E; 5]', 'Invalid array type \'E\' at position 1: [<--[HERE]'],
		['{: bah}', 'Expected key at position 1: {<--[HERE]'],
		['{WhA*s: bah}', 'Expected \':\' at position 4: {WhA<--[HERE]'],
		['{thisisaverylongkey: 1', 'Expected \'}\' at position 22: ...longkey: 1<--[HERE]'],
		['[1, 4b]', 'Can\'t insert Byte into list of Int at position 4: [1, <--[HERE]'],
	]

	invalidSuites.forEach(([source, error]) => {
		it(source, () => {
			expect(() => {
				NbtParser.readTag(new StringReader(source))
			}).toThrow(error)
		})
	})
})
