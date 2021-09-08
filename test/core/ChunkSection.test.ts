import { expect } from 'chai'
import { BlockState, ChunkSection } from '../../src/core'

describe('ChunkSection', () => {
	it('create', () => {
		const section = new ChunkSection(0)
		expect(section.minY).equal(0)
		expect(section['storage']).lengthOf(4096)
		
		const section2 = new ChunkSection(3)
		expect(section2.minY).equal(3)
	})

	it('getBlockState & setBlockState', () => {
		const section = new ChunkSection(0)
		expect(section.getBlockState(3, 1, 2).toString()).equal(BlockState.AIR.toString())

		section.setBlockState(3, 1, 2, new BlockState('minecraft:stone'))
		expect(section.getBlockState(3, 1, 2).toString()).equal(new BlockState('minecraft:stone').toString())
		expect(section.getBlockState(5, 1, 2).toString()).equal(BlockState.AIR.toString())
	})
})
