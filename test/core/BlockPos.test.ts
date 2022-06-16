import { describe, expect, it } from 'vitest'
import { BlockPos, Direction } from '../../src/core/index.js'

describe('BlockPos', () => {
	it('create', () => {
		const pos = BlockPos.create(1, 2, 3)
		expect(pos).toEqual([1, 2, 3])
	})
	it('offset', () => {
		const posA = BlockPos.create(1, 2, 3)
		const posB = BlockPos.offset(posA, 2, 0, -5)
		expect(posB).toEqual([3, 2, -2])
	})
	it('towards', () => {
		const posA = BlockPos.create(1, 2, 3)
		const posB = BlockPos.towards(posA, Direction.NORTH)
		expect(posB).toEqual([1, 2, 2])
	})
})
