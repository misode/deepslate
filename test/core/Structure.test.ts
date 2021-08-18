import { expect } from 'chai'
import 'mocha'
import { BlockState, Structure } from '../../src/core'
import type { NamedNbtTag } from '../../src/nbt'

describe('Structure', () => {
	it('getSize', () => {
		const structureA = new Structure([1, 2, 3])
		expect(structureA.getSize()).to.deep.equal([1, 2, 3])

		const structureB = new Structure([16, 30, 24])
		expect(structureB.getSize()).to.deep.equal([16, 30, 24])
	})

	it('addBlock', () => {
		const structure = new Structure([1, 1, 1])
		const addedBlock = structure.addBlock([0, 0, 0], 'minecraft:stone')
		expect(addedBlock).to.be.an.instanceOf(Structure)
		expect(structure).to.equal(addedBlock)
	})

	it('getBlock', () => {
		const structure = new Structure([1, 2, 1])
			.addBlock([0, 0, 0], 'minecraft:stone')

		const blockA = structure.getBlock([0, 1, 0])
		expect(blockA).to.be.null

		const blockB = structure.getBlock([0, 0, 0])
		expect(blockB).to.be.an('object').with.any.keys('pos', 'state')
		expect(blockB?.state).to.be.an.instanceOf(BlockState)
		expect(blockB?.state).to.deep.equal(new BlockState('minecraft:stone'))
		expect(blockB?.pos).to.deep.equal([0, 0, 0])
	})

	it('getBlocks', () => {
		const structure = new Structure([1, 3, 1])
			.addBlock([0, 0, 0], 'minecraft:stone')
			.addBlock([0, 1, 0], 'minecraft:stone')
			.addBlock([0, 2, 0], 'minecraft:jigsaw', { orientation: 'east_up' })

		const blocks = structure.getBlocks()
		expect(blocks).to.be.an('array').with.lengthOf(3)

		const blockNames = blocks.map(b => b.state.getName())
		expect(blockNames).to.deep.equal(['minecraft:stone', 'minecraft:stone', 'minecraft:jigsaw'])
	})

	it('fromNbt (empty)', () => {
		const nbt: NamedNbtTag = { name: '', value: {
			size: { type: 'list', value: { type: 'int', value: [0, 0, 0] } },
			palette: { type: 'list', value: { type: 'compound', value: [] } },
			entities: { type: 'list', value: { type: 'compound', value: [] } },
			blocks: { type: 'list', value: { type: 'compound', value: [] } },
		} }
		const structureA = Structure.fromNbt(nbt)
		const structureB = new Structure([0, 0, 0])

		expect(structureA).to.deep.equal(structureB)
	})

	it('fromNbt (simple)', () => {
		const nbt: NamedNbtTag = { name: '', value: {
			size: { type: 'list', value: { type: 'int', value: [1, 2, 1] } },
			palette: { type: 'list', value: { type: 'compound', value: [
				{
					Name: { type: 'string', value: 'minecraft:jigsaw' },
					Properties: { type: 'compound', value: {
						orientation: { type: 'string', value: 'east_up' },
					} },
				},
			] } },
			entities: { type: 'list', value: { type: 'compound', value: [] } },
			blocks: { type: 'list', value: { type: 'compound', value: [
				{
					pos: { type: 'list', value: { type: 'int', value: [0, 0, 0] } },
					state: { type: 'int', value: 0 },
				},
			] } },
		} }
		const structureA = Structure.fromNbt(nbt)
		const structureB = new Structure([1, 2, 1])
			.addBlock([0, 0, 0], 'minecraft:jigsaw', { orientation: 'east_up' })

		expect(structureA).to.deep.equal(structureB)
	})
})
