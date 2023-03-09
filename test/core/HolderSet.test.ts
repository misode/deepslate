import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Holder, HolderSet, Identifier, Registry } from '../../src/core/index.js'


describe('HolderSet', () => {
	const REGISTRY = new Registry<string>(Identifier.create('test_registry'))

	beforeEach(() => {
		REGISTRY.register(Identifier.create('test1'), 'value1')
		REGISTRY.register(Identifier.create('test2'), 'value2')
		REGISTRY.register(Identifier.create('test3'), 'value3')

		const holders = [Holder.reference(REGISTRY, Identifier.create('test1')), Holder.reference(REGISTRY, Identifier.create('test2'))]
		const set = new HolderSet(holders)
		REGISTRY.getTagRegistry().register(Identifier.create('tag1'), set)

	})

	afterEach(() => {
		REGISTRY.clear()
	})

	it('getBiomes simple', () => {
		const holders = [Holder.reference(REGISTRY, Identifier.create('test1')), Holder.reference(REGISTRY, Identifier.create('test2'))]
		const set = new HolderSet(holders)

		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes).toContain('minecraft:test1')
		expect(biomes).toContain('minecraft:test2')
	})

	it('getBiomes nested', () => {

		const holders = [Holder.reference(REGISTRY, Identifier.create('test3')), Holder.reference(REGISTRY.getTagRegistry(), Identifier.create('tag1'))]
		const set = new HolderSet(holders)

		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(3)
		expect(biomes).toContain('minecraft:test1')
		expect(biomes).toContain('minecraft:test2')
		expect(biomes).toContain('minecraft:test3')
	})

	it('direct', () => {
		const set = HolderSet.direct(REGISTRY, [
			'minecraft:test3',
			'#minecraft:tag1',
		])

		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(3)
		expect(biomes).toContain('minecraft:test1')
		expect(biomes).toContain('minecraft:test2')
		expect(biomes).toContain('minecraft:test3')
	})

	it('fromJson', () => {
		const set = HolderSet.fromJson(REGISTRY, {
			values: [
				'minecraft:test3',
				'#minecraft:tag1',
			],
		}, Identifier.create('tag2'))

		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(3)
		expect(biomes).toContain('minecraft:test1')
		expect(biomes).toContain('minecraft:test2')
		expect(biomes).toContain('minecraft:test3')
	})

	it('fromJson extend', () => {
		const set = HolderSet.fromJson(REGISTRY, {
			values: [
				'minecraft:test3',
			],
		}, Identifier.create('tag1'))

		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(3)
		expect(biomes).toContain('minecraft:test1')
		expect(biomes).toContain('minecraft:test2')
		expect(biomes).toContain('minecraft:test3')
	})

	it('fromJson replace', () => {
		const set = HolderSet.fromJson(REGISTRY, {
			replace: true,
			values: [
				'minecraft:test3',
			],
		}, Identifier.create('tag1'))

		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(1)
		expect(biomes).toContain('minecraft:test3')
	})

	it('parser single', () => {
		const parser = HolderSet.parser(REGISTRY)

		const set = parser('minecraft:test1').value()
		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(1)
		expect(biomes).toContain('minecraft:test1')
	})

	it('parser tag', () => {
		const parser = HolderSet.parser(REGISTRY)

		const set = parser('#minecraft:tag1').value()
		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(2)
		expect(biomes).toContain('minecraft:test1')
		expect(biomes).toContain('minecraft:test2')
	})

	it('parser direct', () => {
		const parser = HolderSet.parser(REGISTRY)

		const set = parser(['minecraft:test1', 'minecraft:test2']).value()
		const biomes = [...set.getBiomes()].map(b => b.key()?.toString())
		expect(biomes.length).toEqual(2)
		expect(biomes).toContain('minecraft:test1')
		expect(biomes).toContain('minecraft:test2')
	})

})
