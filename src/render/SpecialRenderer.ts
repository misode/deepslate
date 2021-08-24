import { BlockDefinition } from './BlockDefinition'
import type { Cull } from './BlockModel'
import { BlockModel } from './BlockModel'
import type { TextureAtlasProvider } from './TextureAtlas'

function dummy(name: string, uvProvider: TextureAtlasProvider, offset: number, cull: Cull, model: BlockModel) {
	const definition = new BlockDefinition('', {'': { model: '' } }, undefined)
	const modelProvider = { getBlockModel: () => model }
	model.flatten(modelProvider)
	return definition.getBuffers(name, {}, uvProvider, modelProvider, offset, cull)
}

function liquidRenderer(type: string, index: number, level: number, uvProvider: TextureAtlasProvider, cull: Cull, tintindex?: number) {
	const y = cull['up'] ? 16 : [14.2, 12.5, 10.5, 9, 7, 5.3, 3.7, 1.9, 16, 16, 16, 16, 16, 16, 16, 16][level]
	return dummy(`minecraft:${type}`, uvProvider, index, cull, new BlockModel('', '', {
		still: `minecraft:block/${type}_still`,
		flow: `minecraft:block/${type}_flow`,
	}, [{
		from: [0, 0, 0],
		to: [16, y, 16],
		faces: {
			up: { texture: '#still', tintindex, cullface: 'up' },
			down: { texture: '#still', tintindex, cullface: 'down' },
			north: { texture: '#flow', tintindex, cullface: 'north' },
			east: { texture: '#flow', tintindex, cullface: 'east' },
			south: { texture: '#flow', tintindex, cullface: 'south' },
			west: { texture: '#flow', tintindex, cullface: 'west' },
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
}

export const SpecialRenderers = new Set(Object.keys(SpecialRenderer))
