import { mat4 } from 'gl-matrix'
import { Direction, Identifier } from '../core/index.js'
import { BlockDefinition } from './BlockDefinition.js'
import { BlockModel } from './BlockModel.js'
import type { Cull } from './Cull.js'
import { Mesh } from './Mesh.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

function dummy(id: Identifier, uvProvider: TextureAtlasProvider, cull: Cull, model: BlockModel) {
	const definition = new BlockDefinition(id, {'': { model: 'dummy' } }, undefined)
	const modelProvider = { getBlockModel: () => model }
	model.flatten(modelProvider)
	return definition.getMesh(id, {}, uvProvider, modelProvider, cull)
}

function liquidRenderer(type: string, level: number, uvProvider: TextureAtlasProvider, cull: Cull, tintindex?: number) {
	const y = cull['up'] ? 16 : [14.2, 12.5, 10.5, 9, 7, 5.3, 3.7, 1.9, 16, 16, 16, 16, 16, 16, 16, 16][level]
	const id = Identifier.create(type)
	return dummy(id, uvProvider, cull, new BlockModel(id, undefined, {
		still: `block/${type}_still`,
		flow: `block/${type}_flow`,
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

function chestRenderer(facing: string, type: string, uvProvider: TextureAtlasProvider) {
	const rotation = mat4.create()
	mat4.translate(rotation, rotation, [0.5, 0.5, 0.5])
	mat4.rotateY(rotation, rotation, facing === 'west' ? Math.PI / 2 : facing === 'south' ? Math.PI : facing === 'east' ? Math.PI * 3 / 2 : 0)
	mat4.translate(rotation, rotation, [-0.5, -0.5, -0.5])
	const id = Identifier.create('chest')
	return dummy(id, uvProvider, {}, new BlockModel(id, undefined, {
		0: 'entity/chest/normal',
	}, [
		{
			from: [1, 0, 1],
			to: [15, 10, 15],
			faces: {
				north: {uv: [10.5, 8.25, 14, 10.75], rotation: 180, texture: '#0'},
				east: {uv: [7, 8.25, 10.5, 10.75], rotation: 180, texture: '#0'},
				south: {uv: [3.5, 8.25, 7, 10.75], rotation: 180, texture: '#0'},
				west: {uv: [0, 8.25, 3.5, 10.75], rotation: 180, texture: '#0'},
				up: {uv: [7, 4.75, 10.5, 8.25], texture: '#0'},
				down: {uv: [3.5, 4.75, 7, 8.25], texture: '#0'},
			},
		},
		{
			from: [1, 10, 1],
			to: [15, 14, 15],
			faces: {
				north: {uv: [10.5, 3.75, 14, 4.75], rotation: 180, texture: '#0'},
				east: {uv: [7, 3.75, 10.5, 4.75], rotation: 180, texture: '#0'},
				south: {uv: [3.5, 3.75, 7, 4.75], rotation: 180, texture: '#0'},
				west: {uv: [0, 3.75, 3.5, 4.75], rotation: 180, texture: '#0'},
				up: {uv: [7, 0, 10.5, 3.5], texture: '#0'},
				down: {uv: [3.5, 0, 7, 3.5], texture: '#0'},
			},
		},
		{
			from: [7, 8, 0],
			to: [9, 12, 2],
			faces: {
				north: {uv: [0.25, 0.25, 0.75, 1.25], rotation: 180, texture: '#0'},
				east: {uv: [0, 0.25, 0.25, 1.25], rotation: 180, texture: '#0'},
				south: {uv: [1, 0.25, 1.5, 1.25], rotation: 180, texture: '#0'},
				west: {uv: [0.75, 0.25, 1, 1.25], rotation: 180, texture: '#0'},
				up: {uv: [0.25, 0, 0.75, 0.25], rotation: 180, texture: '#0'},
				down: {uv: [0.75, 0, 1.25, 0.25], rotation: 180, texture: '#0'},
			},
		},
	])).transform(rotation)
}

function decoratedPotRenderer(uvProvider: TextureAtlasProvider){
	const id = Identifier.create('decorated_pot')
	return dummy(id, uvProvider, {}, new BlockModel(id, undefined, {
		0: 'entity/decorated_pot/decorated_pot_side',
		1: 'entity/decorated_pot/decorated_pot_base',
	}, [
		{
			from: [1, 0, 1],
			to: [15, 16, 15],
			faces: {
				north: {uv: [1, 0, 15, 16], texture: '#0'},
				east: {uv: [1, 0, 15, 16], texture: '#0'},
				south: {uv: [1, 0, 15, 16], texture: '#0'},
				west: {uv: [1, 0, 15, 16], texture: '#0'},
				up: {uv: [0, 6.5, 7, 13.5], texture: '#1'},
				down: {uv: [7, 6.5, 14, 13.5], texture: '#1'},
			},
		},
		{
			from: [5, 16, 5],
			to: [11, 17, 11],
			faces: {
				north: {uv: [0, 5.5, 3, 6], texture: '#1'},
				east: {uv: [3, 5.5, 6, 6], texture: '#1'},
				south: {uv: [6, 5.5, 9, 6], texture: '#1'},
				west: {uv: [9, 5.5, 12, 6], texture: '#1'},
			},
		},
		{
			from: [4, 17, 4],
			to: [12, 20, 12],
			faces: {
				north: {uv: [0, 4, 4, 5.5], texture: '#1'},
				east: {uv: [4, 4, 8, 5.5], texture: '#1'},
				south: {uv: [8, 4, 12, 5.5], texture: '#1'},
				west: {uv: [12, 4, 16, 5.5], texture: '#1'},
				up: {uv: [4, 0, 8, 4], texture: '#1'},
				down: {uv: [8, 0, 12, 4], texture: '#1'},
			},
		},
	]))
}

const RENDERERS: {
	[key: string]: (props: { [key: string]: string }, uvProvider: TextureAtlasProvider, cull: Cull) => Mesh,
} = {
	'minecraft:water': (props, uvProvider, cull) =>
		liquidRenderer('water', parseInt(props.level), uvProvider, cull, 0),
	'minecraft:lava': (props, uvProvider, cull) =>
		liquidRenderer('lava', parseInt(props.level), uvProvider, cull),
	'minecraft:chest': (props, uvProvider) =>
		chestRenderer(props.facing || 'south', props.type || 'single', uvProvider),
	'minecraft:decorated_pot': (_, uvProvider) =>
		decoratedPotRenderer(uvProvider),
}

export namespace SpecialRenderers {
	export function has(id: string, props: { [key: string]: string }): boolean {
		return id in RENDERERS || props['waterlogged'] === 'true'
	}

	export function getMesh(id: string, props: { [key: string]: string }, uvProvider: TextureAtlasProvider, cull: Cull): Mesh {
		const result = new Mesh()
		if (id in RENDERERS) {
			result.merge(RENDERERS[id](props, uvProvider, cull))
		}
		if (props['waterlogged'] === 'true') {
			result.merge(liquidRenderer('water', 0, uvProvider, cull, 0))
		}
		return result
	}
}
