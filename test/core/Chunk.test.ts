import { BlockState, Chunk, ChunkPos } from '@core'
import { expect } from 'chai'

describe('Chunk', () => {
	it('create', () => {
		const chunk = new Chunk(-16, 64, ChunkPos.create(4, 1))
		expect(chunk.minY).equal(-16)
		expect(chunk.height).equal(64)
		expect(chunk.maxY).equal(48)
		expect(chunk.minSection).equal(-1)
		expect(chunk.maxSection).equal(3)
		expect(chunk.sectionsCount).equal(4)
	})

	it('getSectionIndex', () => {
		const chunk = new Chunk(-16, 64, ChunkPos.create(4, 1))
		expect(chunk.getSectionIndex(-5)).equal(0)
		expect(chunk.getSectionIndex(0)).equal(1)
		expect(chunk.getSectionIndex(9)).equal(1)
		expect(chunk.getSectionIndex(41)).equal(3)
	})

	it('getBlockState & setBlockState', () => {
		const chunk = new Chunk(-16, 64, ChunkPos.create(4, 1))
		expect(chunk.getBlockState([3, 1, 2]).toString()).equal(BlockState.AIR.toString())

		chunk.setBlockState([3, 1, 2], new BlockState('minecraft:stone'))
		expect(chunk.getBlockState([3, 1, 2]).toString()).equal(new BlockState('minecraft:stone').toString())
		expect(chunk.getBlockState([5, 1, 2]).toString()).equal(BlockState.AIR.toString())
	})
})
