import { BlockState, Identifier } from '@core'
import type { NamedNbtTag } from '@nbt'
import { expect } from 'chai'
import 'mocha'

describe('BlockState', () => {
	it('constructor', () => {
		const state = new BlockState('piston')
		expect(state).deep.equal(new BlockState(new Identifier('minecraft', 'piston')))
	})

	it('getName', () => {
		const state = new BlockState('jigsaw', { orientation: 'east_up' })
		const name = state.getName()
		expect(name).deep.equal(Identifier.create('jigsaw'))
	})

	it('getProperties', () => {
		const state = new BlockState('piston', { extended: 'false', facing: 'up' })
		const props = state.getProperties()
		expect(props).an('object').with.keys('extended', 'facing')
		expect(props['extended']).equal('false')
		expect(props['facing']).equal('up')
	})

	it('getProperty', () => {
		const state = new BlockState('piston', { extended: 'false', facing: 'up' })
		expect(state.getProperty('extended')).equal('false')
		expect(state.getProperty('facing')).equal('up')
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
		expect(state.toString()).equal('minecraft:piston[extended=false,facing=up]')
	})

	it('fromNbt (no properties)', () => {
		const nbt: NamedNbtTag = { name: '', value: {
			Name: { type: 'string', value: 'minecraft:stone' },
		} }
		const stateA = BlockState.fromNbt(nbt)
		const stateB = new BlockState('stone')

		expect(stateA).deep.equal(stateB)
	})

	it('fromNbt (properties)', () => {
		const nbt: NamedNbtTag = { name: '', value: {
			Name: { type: 'string', value: 'minecraft:piston' },
			Properties: { type: 'compound', value: {
				extended: { type: 'string', value: 'false' },
				facing: { type: 'string', value: 'up' },
			} },
		} }
		const stateA = BlockState.fromNbt(nbt)
		const stateB = new BlockState('piston', { extended: 'false', facing: 'up' })

		expect(stateA).deep.equal(stateB)
	})

	it('fromJson (no properties)', () => {
		const json = {
			Name: 'minecraft:stone',
		}
		const stateA = BlockState.fromJson(json)
		const stateB = new BlockState('stone')

		expect(stateA).deep.equal(stateB)
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

		expect(stateA).deep.equal(stateB)
	})
})
