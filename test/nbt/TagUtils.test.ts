import { expect } from 'chai'
import { describe, it } from 'vitest'
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
		expect(getTag(data, 'foo', 'int')).equal(5)
		expect(getTag(data, 'bar', 'string')).equal('hello')

		expect(() => getTag(data, 'foo', 'string')).throw()
		expect(() => getTag(data, 'invalid', 'string')).throw()
	})

	it('getListTag', () => {
		expect(getListTag(data, 'baz', 'byte')).deep.equal([1, 3])
		expect(() => getListTag(data, 'baz', 'byte', 2)).not.throw()
		expect(() => getListTag(data, 'baz', 'byte', 3)).throw()
		expect(() => getListTag(data, 'baz', 'int')).throw()
	})

	it('getOptional', () => {
		expect(getOptional(() => getTag(data, 'foo', 'int'), null)).equal(5)
		expect(getOptional(() => getTag(data, 'foo', 'string'), null)).null
		expect(getOptional(() => getTag(data, 'invalid', 'int'), null)).null
		expect(getOptional(() => getTag(data, 'invalid', 'int'), 4)).equal(4)
	})
})
