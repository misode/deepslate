import { expect } from 'chai'
import { describe, it } from 'vitest'
import { BlockPos, Direction } from '../../src/core/index.js'

describe('BlockPos', () => {
	it('create', () => {
		const pos = BlockPos.create(1, 2, 3)
		expect(pos).deep.equal([1, 2, 3])
	})
	it('offset', () => {
		const posA = BlockPos.create(1, 2, 3)
		const posB = BlockPos.offset(posA, 2, 0, -5)
		expect(posB).deep.equal([3, 2, -2])
	})
	it('towards', () => {
		const posA = BlockPos.create(1, 2, 3)
		const posB = BlockPos.towards(posA, Direction.NORTH)
		expect(posB).deep.equal([1, 2, 2])
	})
})
