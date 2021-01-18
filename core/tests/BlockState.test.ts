import "mocha";
import { expect } from 'chai';
import { BlockState } from '../src/BlockState';
import { NamedNbtTag } from "@webmc/nbt";

describe('BlockState', () => {
  it('getName', () => {
    const state = new BlockState('minecraft:jigsaw', { orientation: 'east_up' })
    const name = state.getName()
    expect(name).to.be.a('string')
    expect(name).to.equal('minecraft:jigsaw')
  })

  it('getProperties', () => {
    const state = new BlockState('minecraft:piston', { extended: 'false', facing: 'up' })
    const props = state.getProperties()
    expect(props).to.be.an('object').with.keys('extended', 'facing')
    expect(props['extended']).to.equal('false')
    expect(props['facing']).to.equal('up')
  })

  it('getProperty', () => {
    const state = new BlockState('minecraft:piston', { extended: 'false', facing: 'up' })
    expect(state.getProperty('extended')).to.equal('false')
    expect(state.getProperty('facing')).to.equal('up')
  })

  it('equals', () => {
    const stateA = new BlockState('minecraft:piston', { extended: 'false', facing: 'up' })
    const stateB = new BlockState('minecraft:piston', { extended: 'false', facing: 'up' })
    expect(stateA.equals(stateB)).to.be.true
    const stateC = new BlockState('minecraft:sticky_piston', { extended: 'false', facing: 'up' })
    expect(!stateA.equals(stateC)).to.be.true
    const stateD = new BlockState('minecraft:piston', { facing: 'up' })
    expect(!stateA.equals(stateD)).to.be.true
    const stateE = new BlockState('minecraft:piston', { extended: 'false', facing: 'down' })
    expect(!stateA.equals(stateE)).to.be.true
  })

  it('toString', () => {
    const state = new BlockState('minecraft:piston', { extended: 'false', facing: 'up' })
    const string = state.toString()
    expect(string).to.equal('minecraft:piston[extended=false,facing=up]')
  })

  it('fromNbt (no properties)', () => {
    const nbt: NamedNbtTag = { name: '', value: {
      Name: { type: 'string', value: 'minecraft:stone' }
    } }
    const stateA = BlockState.fromNbt(nbt)
    const stateB = new BlockState('minecraft:stone')

    expect(stateA).to.deep.equal(stateB)
  })

  it('fromNbt (properties)', () => {
    const nbt: NamedNbtTag = { name: '', value: {
      Name: { type: 'string', value: 'minecraft:piston' },
      Properties: { type: 'compound', value: {
        extended: { type: 'string', value: 'false' },
        facing: { type: 'string', value: 'up' }
      } }
    } }
    const stateA = BlockState.fromNbt(nbt)
    const stateB = new BlockState('minecraft:piston', { extended: 'false', facing: 'up' })

    expect(stateA).to.deep.equal(stateB)
  })
})
