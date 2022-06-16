import { describe, expect, it } from 'vitest'
import { BlockState, Chunk, ChunkPos } from '../../src/core/index.js'

describe('Chunk', () => {
	it('create', () => {
		const chunk = new Chunk(-16, 64, ChunkPos.create(4, 1))
		expect(chunk.minY).toEqual(-16)
		expect(chunk.height).toEqual(64)
		expect(chunk.maxY).toEqual(48)
		expect(chunk.minSection).toEqual(-1)
		expect(chunk.maxSection).toEqual(3)
		expect(chunk.sectionsCount).toEqual(4)
	})

	it('getSectionIndex', () => {
		const chunk = new Chunk(-16, 64, ChunkPos.create(4, 1))
		expect(chunk.getSectionIndex(-5)).toEqual(0)
		expect(chunk.getSectionIndex(0)).toEqual(1)
		expect(chunk.getSectionIndex(9)).toEqual(1)
		expect(chunk.getSectionIndex(41)).toEqual(3)
	})

	it('getBlockState & setBlockState', () => {
		const chunk = new Chunk(-16, 64, ChunkPos.create(4, 1))
		expect(chunk.getBlockState([3, 1, 2]).toString()).toEqual(BlockState.AIR.toString())

		chunk.setBlockState([3, 1, 2], new BlockState('minecraft:stone'))
		expect(chunk.getBlockState([3, 1, 2]).toString()).toEqual(new BlockState('minecraft:stone').toString())
		expect(chunk.getBlockState([5, 1, 2]).toString()).toEqual(BlockState.AIR.toString())
	})
})
