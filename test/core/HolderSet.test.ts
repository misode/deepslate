import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Holder, HolderSet, Identifier, Registry } from '../../src/core/index.js'
import { Json } from '../../src/util/index.js'


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

		const entries = [...set.getEntries()].map(b => b.key()?.toString())
		expect(entries).toContain('minecraft:test1')
		expect(entries).toContain('minecraft:test2')
	})

	it('getBiomes nested', () => {

		const holders = [Holder.reference(REGISTRY, Identifier.create('test3')), Holder.reference(REGISTRY.getTagRegistry(), Identifier.create('tag1'))]
		const set = new HolderSet(holders)

		const entries = [...set.getEntries()].map(b => b.key()?.toString())
		expect(entries.length).toEqual(3)
		expect(entries).toContain('minecraft:test1')
		expect(entries).toContain('minecraft:test2')
		expect(entries).toContain('minecraft:test3')
	})

	it('fromJson', () => {
		const set = HolderSet.fromJson(REGISTRY, {
			values: [
				'minecraft:test3',
				'#minecraft:tag1',
			],
		}, Identifier.create('tag2'))

		const entries = [...set.getEntries()].map(b => b.key()?.toString())
		expect(entries.length).toEqual(3)
		expect(entries).toContain('minecraft:test1')
		expect(entries).toContain('minecraft:test2')
		expect(entries).toContain('minecraft:test3')
	})

	it('fromJson extend', () => {
		const set = HolderSet.fromJson(REGISTRY, {
			values: [
				'minecraft:test3',
			],
		}, Identifier.create('tag1'))

		const entries = [...set.getEntries()].map(b => b.key()?.toString())
		expect(entries.length).toEqual(3)
		expect(entries).toContain('minecraft:test1')
		expect(entries).toContain('minecraft:test2')
		expect(entries).toContain('minecraft:test3')
	})

	it('fromJson replace', () => {
		const set = HolderSet.fromJson(REGISTRY, {
			replace: true,
			values: [
				'minecraft:test3',
			],
		}, Identifier.create('tag1'))

		const entries = [...set.getEntries()].map(b => b.key()?.toString())
		expect(entries.length).toEqual(1)
		expect(entries).toContain('minecraft:test3')
	})

	it('parser tag', () => {
		const parser = HolderSet.parser(REGISTRY)

		const set = parser('#minecraft:tag1').value()
		const entries = [...set.getEntries()].map(b => b.key()?.toString())
		expect(entries.length).toEqual(2)
		expect(entries).toContain('minecraft:test1')
		expect(entries).toContain('minecraft:test2')
	})

	it('parser list', () => {
		const parser = HolderSet.parser(REGISTRY)

		const set = parser(['minecraft:test1', 'minecraft:test2']).value()
		const entries = [...set.getEntries()].map(b => b.key()?.toString())
		expect(entries.length).toEqual(2)
		expect(entries).toContain('minecraft:test1')
		expect(entries).toContain('minecraft:test2')
	})

	it('parser list valueParser', () => {
		const valueParser = Holder.parser(REGISTRY, obj => `integer: ${Json.readInt(obj) ?? 0}`)
		const parser = HolderSet.parser(REGISTRY, valueParser)

		const set = parser(['minecraft:test1', 4, 'minecraft:test2']).value()
		const entries = [...set.getEntries()].map(b => b.value())
		expect(entries.length).toEqual(3)
		expect(entries).toContain('value1')
		expect(entries).toContain('integer: 4')
		expect(entries).toContain('value2')
	})


})
