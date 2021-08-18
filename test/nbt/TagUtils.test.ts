import { expect } from 'chai'
import 'mocha'
import type { NbtValues } from '../../src/nbt'
import { getListTag, getOptional, getTag } from '../../src/nbt'

describe('TagUtils', () => {
	const data: NbtValues['compound'] = {
		foo: { type: 'int', value: 5 },
		bar: { type: 'string', value: 'hello' },
		baz: { type: 'list', value: {
			type: 'byte', value: [1, 3],
		} },
	}

	it('getTag', () => {
		expect(getTag(data, 'foo', 'int')).to.equal(5)
		expect(getTag(data, 'bar', 'string')).to.equal('hello')

		expect(() => getTag(data, 'foo', 'string')).to.throw()
		expect(() => getTag(data, 'invalid', 'string')).to.throw()
	})

	it('getListTag', () => {
		expect(getListTag(data, 'baz', 'byte')).to.deep.equal([1, 3])
		expect(() => getListTag(data, 'baz', 'byte', 2)).to.not.throw()
		expect(() => getListTag(data, 'baz', 'byte', 3)).to.throw()
		expect(() => getListTag(data, 'baz', 'int')).to.throw()
	})

	it('getOptional', () => {
		expect(getOptional(() => getTag(data, 'foo', 'int'), null)).to.equal(5)
		expect(getOptional(() => getTag(data, 'foo', 'string'), null)).to.be.null
		expect(getOptional(() => getTag(data, 'invalid', 'int'), null)).to.be.null
		expect(getOptional(() => getTag(data, 'invalid', 'int'), 4)).to.equal(4)
	})
})
