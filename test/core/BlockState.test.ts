import { describe, expect, it } from 'vitest'
import { BlockState, Identifier } from '../../src/core/index.js'
import { NbtCompound, NbtString } from '../../src/nbt/index.js'

describe('BlockState', () => {
	it('constructor', () => {
		const state = new BlockState('piston')
		expect(state).toEqual(new BlockState(new Identifier('minecraft', 'piston')))
	})

	it('getName', () => {
		const state = new BlockState('jigsaw', { orientation: 'east_up' })
		const name = state.getName()
		expect(name).toEqual(Identifier.create('jigsaw'))
	})

	it('getProperties', () => {
		const state = new BlockState('piston', { extended: 'false', facing: 'up' })
		const props = state.getProperties()
		expect(props).an('object').with.keys('extended', 'facing')
		expect(props['extended']).toEqual('false')
		expect(props['facing']).toEqual('up')
	})

	it('getProperty', () => {
		const state = new BlockState('piston', { extended: 'false', facing: 'up' })
		expect(state.getProperty('extended')).toEqual('false')
		expect(state.getProperty('facing')).toEqual('up')
	})

	it('equals', () => {
		const stateA = new BlockState('piston', { extended: 'false', facing: 'up' })
		const stateB = new BlockState('piston', { extended: 'false', facing: 'up' })
		expect(stateA.equals(stateB)).true
		const stateC = new BlockState('sticky_piston', { extended: 'false', facing: 'up' })
		expect(!stateA.equals(stateC)).true
		const stateD = new BlockState('piston', { facing: 'up' })
		expect(!stateA.equals(stateD)).true
		const stateE = new BlockState('piston', { extended: 'false', facing: 'down' })
		expect(!stateA.equals(stateE)).true
	})

	it('toString', () => {
		const state = new BlockState('piston', { extended: 'false', facing: 'up' })
		expect(state.toString()).toEqual('minecraft:piston[extended=false,facing=up]')
	})

	it('fromNbt (no properties)', () => {
		const nbt = new NbtCompound()
			.set('Name', new NbtString('minecraft:stone'))
		const stateA = BlockState.fromNbt(nbt)
		const stateB = new BlockState('stone')

		expect(stateA).toEqual(stateB)
	})

	it('fromNbt (properties)', () => {
		const nbt = new NbtCompound()
			.set('Name', new NbtString('minecraft:piston'))
			.set('Properties', new NbtCompound()
				.set('extended', new NbtString('false'))
				.set('facing', new NbtString('up')))
		const stateA = BlockState.fromNbt(nbt)
		const stateB = new BlockState('piston', { extended: 'false', facing: 'up' })

		expect(stateA).toEqual(stateB)
	})

	it('fromJson (no properties)', () => {
		const json = {
			Name: 'minecraft:stone',
		}
		const stateA = BlockState.fromJson(json)
		const stateB = new BlockState('stone')

		expect(stateA).toEqual(stateB)
	})

	it('fromJson (properties)', () => {
		const json = {
			Name: 'minecraft:piston',
			Properties: {
				extended: 'false',
				facing: 'up',
			},
		}
		const stateA = BlockState.fromJson(json)
		const stateB = new BlockState('piston', { extended: 'false', facing: 'up' })

		expect(stateA).toEqual(stateB)
	})
})
