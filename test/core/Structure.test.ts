import { expect } from 'chai'
import { describe, it } from 'vitest'
import { BlockState, Identifier, Structure } from '../../src/core/index.js'
import type { NamedNbtTag } from '../../src/nbt/index.js'

describe('Structure', () => {
	it('getSize', () => {
		const structureA = new Structure([1, 2, 3])
		expect(structureA.getSize()).deep.equal([1, 2, 3])

		const structureB = new Structure([16, 30, 24])
		expect(structureB.getSize()).deep.equal([16, 30, 24])
	})

	it('addBlock', () => {
		const structure = new Structure([1, 1, 1])
		const addedBlock = structure.addBlock([0, 0, 0], 'stone')
		expect(addedBlock).an.instanceOf(Structure)
		expect(structure).equal(addedBlock)
	})

	it('addBlock (outside)', () => {
		const structure = new Structure([1, 1, 1])
		expect(() => structure.addBlock([2, 0, 0], 'stone')).throw()
		expect(() => structure.addBlock([0, -1, 0], 'stone')).throw()
	})

	it('getBlock', () => {
		const structure = new Structure([1, 2, 1])
			.addBlock([0, 0, 0], 'stone')

		const blockA = structure.getBlock([0, 1, 0])
		expect(blockA).null

		const blockB = structure.getBlock([0, 0, 0])
		expect(blockB).an('object').with.any.keys('pos', 'state')
		expect(blockB?.state).an.instanceOf(BlockState)
		expect(blockB?.state).deep.equal(new BlockState('stone'))
		expect(blockB?.pos).deep.equal([0, 0, 0])
	})

	it('getBlocks', () => {
		const structure = new Structure([1, 3, 1])
			.addBlock([0, 0, 0], 'stone')
			.addBlock([0, 1, 0], 'stone')
			.addBlock([0, 2, 0], 'jigsaw', { orientation: 'east_up' })

		const blocks = structure.getBlocks()
		expect(blocks).an('array').with.lengthOf(3)

		const blockNames = blocks.map(b => b.state.getName())
		expect(blockNames).deep.equal([Identifier.create('stone'), Identifier.create('stone'), Identifier.create('jigsaw')])
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

		expect(structureA).deep.equal(structureB)
	})

	it('fromNbt (simple)', () => {
		const nbt: NamedNbtTag = { name: '', value: {
			size: { type: 'list', value: { type: 'int', value: [1, 2, 1] } },
			palette: { type: 'list', value: { type: 'compound', value: [
				{
					Name: { type: 'string', value: 'jigsaw' },
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
			.addBlock([0, 0, 0], 'jigsaw', { orientation: 'east_up' })

		expect(structureA).deep.equal(structureB)
	})
})
