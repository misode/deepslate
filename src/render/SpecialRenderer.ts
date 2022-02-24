import { Direction, Identifier } from '../core'
import { BlockDefinition } from './BlockDefinition'
import { BlockModel } from './BlockModel'
import type { Cull } from './Cull'
import type { TextureAtlasProvider } from './TextureAtlas'

function dummy(name: Identifier, uvProvider: TextureAtlasProvider, offset: number, cull: Cull, model: BlockModel) {
	const definition = new BlockDefinition('', {'': { model: '' } }, undefined)
	const modelProvider = { getBlockModel: () => model }
	model.flatten(modelProvider)
	return definition.getBuffers(name, {}, uvProvider, modelProvider, offset, cull)
}

function liquidRenderer(type: string, index: number, level: number, uvProvider: TextureAtlasProvider, cull: Cull, tintindex?: number) {
	const y = cull['up'] ? 16 : [14.2, 12.5, 10.5, 9, 7, 5.3, 3.7, 1.9, 16, 16, 16, 16, 16, 16, 16, 16][level]
	return dummy(Identifier.create(type), uvProvider, index, cull, new BlockModel('', '', {
		still: `minecraft:block/${type}_still`,
		flow: `minecraft:block/${type}_flow`,
	}, [{
		from: [0, 0, 0],
		to: [16, y, 16],
		faces: {
			up: { texture: '#still', tintindex, cullface: Direction.UP },
			down: { texture: '#still', tintindex, cullface: Direction.DOWN },
			north: { texture: '#flow', tintindex, cullface: Direction.NORTH },
			east: { texture: '#flow', tintindex, cullface: Direction.EAST },
			south: { texture: '#flow', tintindex, cullface: Direction.SOUTH },
			west: { texture: '#flow', tintindex, cullface: Direction.WEST },
		},
	}]))
}

function chestRenderer(index: number, facing: string, type: string, uvProvider: TextureAtlasProvider) {
	return dummy(Identifier.create('chest'), uvProvider, index, {}, new BlockModel('', '', {
		0: 'minecraft:block/chest',
	}, [{
		from: [1, 0, 1],
		to: [15, 14, 15],
		faces: {
			up: { texture: '#0' },
			down: { texture: '#0' },
			north: { texture: '#0' },
			east: { texture: '#0' },
			south: { texture: '#0' },
			west: { texture: '#0' },
		},
	}]))
}

export const SpecialRenderer: {
	[key: string]: (index: number, props: { [key: string]: string }, uvProvider: TextureAtlasProvider, cull: Cull) => any,
} = {
	'minecraft:water': (index, props, uvProvider, cull) =>
		liquidRenderer('water', index, parseInt(props.level), uvProvider, cull, 0),
	'minecraft:lava': (index, props, uvProvider, cull) =>
		liquidRenderer('lava', index, parseInt(props.level), uvProvider, cull),
	'minecraft:chest': (index, props, uvProvider) =>
		chestRenderer(index, props.facing || 'south', props.type || 'single', uvProvider),
}

export const SpecialRenderers = new Set(Object.keys(SpecialRenderer))
