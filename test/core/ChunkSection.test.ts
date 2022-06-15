import { expect } from 'chai'
import { describe, it } from 'vitest'
import { BlockState, ChunkSection } from '../../src/core/index.js'

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
		expect(section.getBlockState(3, 1, 2)).deep.equal(BlockState.AIR)

		section.setBlockState(3, 1, 2, new BlockState('stone'))
		expect(section.getBlockState(3, 1, 2)).deep.equal(new BlockState('stone'))
		expect(section.getBlockState(5, 1, 2)).deep.equal(BlockState.AIR)
	})
})
