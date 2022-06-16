import { describe, expect, it } from 'vitest'
import type { NbtValues } from '../../src/nbt/index.js'
import { getListTag, getOptional, getTag } from '../../src/nbt/index.js'

describe('TagUtils', () => {
	const data: NbtValues['compound'] = {
		foo: { type: 'int', value: 5 },
		bar: { type: 'string', value: 'hello' },
		baz: { type: 'list', value: {
			type: 'byte', value: [1, 3],
		} },
	}

	it('getTag', () => {
		expect(getTag(data, 'foo', 'int')).toEqual(5)
		expect(getTag(data, 'bar', 'string')).toEqual('hello')

		expect(() => getTag(data, 'foo', 'string')).toThrow()
		expect(() => getTag(data, 'invalid', 'string')).toThrow()
	})

	it('getListTag', () => {
		expect(getListTag(data, 'baz', 'byte')).toEqual([1, 3])
		expect(() => getListTag(data, 'baz', 'byte', 2)).not.toThrow()
		expect(() => getListTag(data, 'baz', 'byte', 3)).toThrow()
		expect(() => getListTag(data, 'baz', 'int')).toThrow()
	})

	it('getOptional', () => {
		expect(getOptional(() => getTag(data, 'foo', 'int'), null)).toEqual(5)
		expect(getOptional(() => getTag(data, 'foo', 'string'), null)).toEqual(null)
		expect(getOptional(() => getTag(data, 'invalid', 'int'), null)).toEqual(null)
		expect(getOptional(() => getTag(data, 'invalid', 'int'), 4)).toEqual(4)
	})
})
