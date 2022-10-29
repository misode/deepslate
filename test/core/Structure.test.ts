import { describe, expect, it } from 'vitest'
import { BlockState, Identifier, Structure } from '../../src/core/index.js'
import { NbtCompound, NbtInt, NbtList, NbtString } from '../../src/nbt/index.js'

describe('Structure', () => {
	it('getSize', () => {
		const structureA = new Structure([1, 2, 3])
		expect(structureA.getSize()).toEqual([1, 2, 3])

		const structureB = new Structure([16, 30, 24])
		expect(structureB.getSize()).toEqual([16, 30, 24])
	})

	it('addBlock', () => {
		const structure = new Structure([1, 1, 1])
		const addedBlock = structure.addBlock([0, 0, 0], 'stone')
		expect(addedBlock).an.instanceOf(Structure)
		expect(structure).toEqual(addedBlock)
	})

	it('addBlock (outside)', () => {
		const structure = new Structure([1, 1, 1])
		expect(() => structure.addBlock([2, 0, 0], 'stone')).toThrow()
		expect(() => structure.addBlock([0, -1, 0], 'stone')).toThrow()
	})

	it('getBlock', () => {
		const structure = new Structure([1, 2, 1])
			.addBlock([0, 0, 0], 'stone')

		const blockA = structure.getBlock([0, 1, 0])
		expect(blockA).null

		const blockB = structure.getBlock([0, 0, 0])
		expect(blockB).an('object').with.any.keys('pos', 'state')
		expect(blockB?.state).an.instanceOf(BlockState)
		expect(blockB?.state).toEqual(new BlockState('stone'))
		expect(blockB?.pos).toEqual([0, 0, 0])
	})

	it('getBlocks', () => {
		const structure = new Structure([1, 3, 1])
			.addBlock([0, 0, 0], 'stone')
			.addBlock([0, 1, 0], 'stone')
			.addBlock([0, 2, 0], 'jigsaw', { orientation: 'east_up' })

		const blocks = structure.getBlocks()
		expect(blocks).an('array').with.lengthOf(3)

		const blockNames = blocks.map(b => b.state.getName())
		expect(blockNames).toEqual([Identifier.create('stone'), Identifier.create('stone'), Identifier.create('jigsaw')])
	})

	it('fromNbt (empty)', () => {
		const nbt = new NbtCompound()
			.set('size', new NbtList([new NbtInt(0), new NbtInt(0), new NbtInt(0)]))
			.set('palette', new NbtList())
			.set('entities', new NbtList())
			.set('blocks', new NbtList())
		const structure = Structure.fromNbt(nbt)
		expect(structure).toEqual(new Structure([0, 0, 0]))
	})

	it('fromNbt (simple)', () => {
		const nbt = new NbtCompound()
			.set('size', new NbtList([new NbtInt(1), new NbtInt(2), new NbtInt(1)]))
			.set('palette', new NbtList([
				new NbtCompound()
					.set('Name', new NbtString('jigsaw'))
					.set('Properties', new NbtCompound().set('orientation', new NbtString('east_up'))),
			]))
			.set('entities', new NbtList())
			.set('blocks', new NbtList([
				new NbtCompound()
					.set('pos', new NbtList([new NbtInt(0), new NbtInt(0), new NbtInt(0)]))
					.set('state', new NbtInt(0)),
			]))
		const structureA = Structure.fromNbt(nbt)
		const structureB = new Structure([1, 2, 1])
			.addBlock([0, 0, 0], 'jigsaw', { orientation: 'east_up' })
		expect(structureA).toEqual(structureB)
	})
})
