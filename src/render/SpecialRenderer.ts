import { mat4 } from 'gl-matrix'
import type { ItemStack } from '../core/index.js'
import { BlockState, Direction, Identifier } from '../core/index.js'
import { BlockDefinition } from './BlockDefinition.js'
import { BlockModel } from './BlockModel.js'
import { Cull } from './Cull.js'
import { Mesh } from './Mesh.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

function dummy(id: Identifier, atlas: TextureAtlasProvider, cull: Cull, model: BlockModel) {
	const definition = new BlockDefinition(id, {'': { model: 'dummy' } }, undefined)
	const modelProvider = { getBlockModel: () => model }
	model.flatten(modelProvider)
	return definition.getMesh(id, {}, atlas, modelProvider, cull)
}

function liquidRenderer(type: string, level: number, atlas: TextureAtlasProvider, cull: Cull, tintindex?: number) {
	const y = cull['up'] ? 16 : [14.2, 12.5, 10.5, 9, 7, 5.3, 3.7, 1.9, 16, 16, 16, 16, 16, 16, 16, 16][level]
	const id = Identifier.create(type)
	return dummy(id, atlas, cull, new BlockModel(id, undefined, {
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

function chestRenderer(type: string) {
	return (atlas: TextureAtlasProvider) => {
		const id = Identifier.create('chest')
		return dummy(id, atlas, {}, new BlockModel(id, undefined, {
			0: `entity/chest/${type}`,
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
				from: [7, 7, 0],
				to: [9, 11, 2],
				faces: {
					north: {uv: [0.25, 0.25, 0.75, 1.25], rotation: 180, texture: '#0'},
					east: {uv: [0, 0.25, 0.25, 1.25], rotation: 180, texture: '#0'},
					south: {uv: [1, 0.25, 1.5, 1.25], rotation: 180, texture: '#0'},
					west: {uv: [0.75, 0.25, 1, 1.25], rotation: 180, texture: '#0'},
					up: {uv: [0.25, 0, 0.75, 0.25], rotation: 180, texture: '#0'},
					down: {uv: [0.75, 0, 1.25, 0.25], rotation: 180, texture: '#0'},
				},
			},
		]))
	}
}

function decoratedPotRenderer(atlas: TextureAtlasProvider){
	const id = Identifier.create('decorated_pot')
	return dummy(id, atlas, {}, new BlockModel(id, undefined, {
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

function shieldRenderer(atlas: TextureAtlasProvider) {
	const id = Identifier.create('shield')
	return dummy(id, atlas, {}, new BlockModel(id, undefined, {
		0: 'entity/shield_base_nopattern',
	}, [
		{
			from: [-6, -11, -2],
			to: [6, 11, -1],
			faces: {
				north: {uv: [3.5, 0.25, 6.5, 5.75], texture: '#0'},
				east: {uv: [3.25, 0.25, 3.5, 5.75], texture: '#0'},
				south: {uv: [0.25, 0.25, 3.25, 5.75], texture: '#0'},
				west: {uv: [0, 0.25, 0.25, 5.75], texture: '#0'},
				up: {uv: [0.25, 0, 3.25, 0.25], texture: '#0'},
				down: {uv: [3.25, 0, 6.25, 0.25], texture: '#0'},
			},
		},
	]))
}

function skullRenderer(texture: string, n: number) {
	return (atlas: TextureAtlasProvider) => {
		const id = Identifier.create('skull')
		return dummy(id, atlas, {}, new BlockModel(id, undefined, {
			0: `entity/${texture}`,
		}, [
			{
				from: [4, 0, 4],
				to: [12, 8, 12],
				faces: {
					north: {uv: [6, 2*n, 8, 4*n], texture: '#0'},
					east: {uv: [2, 2*n, 0, 4*n], texture: '#0'},
					south: {uv: [2, 2*n, 4, 4*n], texture: '#0'},
					west: {uv: [6, 2*n, 4, 4*n], texture: '#0'},
					up: {uv: [2, 0*n, 4, 2*n], texture: '#0'},
					down: {uv: [4, 0*n, 6, 2*n], texture: '#0'},
				},
			},
		]))
	}
}

function dragonHead(atlas: TextureAtlasProvider) {
	const id = Identifier.create('dragon_head')
	const transformation = mat4.create()
	mat4.translate(transformation, transformation, [0.5, 0.5, 0.5])
	mat4.scale(transformation, transformation, [0.75, 0.75, 0.75])
	mat4.rotateY(transformation, transformation, Math.PI)
	mat4.translate(transformation, transformation, [-0.5, -0.7, -0.5])
	return dummy(id, atlas, {}, new BlockModel(id, undefined, {
		0: 'entity/enderdragon/dragon',
	}, [
		// TODO: add scales and nostrils
		{
			from: [2, 4, -16],
			to: [14, 9, 0],
			rotation: {angle: 0, axis: 'y', origin: [0, -3, 0]},
			faces: {
				north: {uv: [12, 3.75, 12.75, 4.0625], texture: '#0'},
				east: {uv: [11, 3.75, 12, 4.0625], texture: '#0'},
				south: {uv: [13.75, 3.75, 14.5, 4.0625], texture: '#0'},
				west: {uv: [12.75, 3.75, 13.75, 4.0625], texture: '#0'},
				up: {uv: [12.75, 3.75, 12, 2.75], texture: '#0'},
				down: {uv: [13.5, 2.75, 12.75, 3.75], texture: '#0'},
			},
		},
		{
			from: [0, 0, -2],
			to: [16, 16, 14],
			faces: {
				north: {uv: [8, 2.875, 9, 3.875], texture: '#0'},
				east: {uv: [7, 2.875, 8, 3.875], texture: '#0'},
				south: {uv: [10, 2.875, 11, 3.875], texture: '#0'},
				west: {uv: [9, 2.875, 10, 3.875], texture: '#0'},
				up: {uv: [9, 2.875, 8, 1.875], texture: '#0'},
				down: {uv: [10, 1.875, 9, 2.875], texture: '#0'},
			},
		},
		{
			from: [2, 0, -16],
			to: [14, 4, 0],
			rotation: {angle: -0.2 * 180 / Math.PI, axis: 'x', origin: [8, 4, -2]},
			faces: {
				north: {uv: [12, 5.0625, 12.75, 5.3125], texture: '#0'},
				east: {uv: [11, 5.0625, 12, 5.3125], texture: '#0'},
				south: {uv: [13.75, 5.0625, 14.5, 5.3125], texture: '#0'},
				west: {uv: [12.75, 5.0625, 13.75, 5.3125], texture: '#0'},
				up: {uv: [12.75, 5.0625, 12, 4.0625], texture: '#0'},
				down: {uv: [13.5, 4.0625, 12.75, 5.0625], texture: '#0'},
			},
		},
	]).withUvEpsilon(1/256)).transform(transformation)
}

function piglinHead(atlas: TextureAtlasProvider) {
	const id = Identifier.create('piglin_head')
	return dummy(id, atlas, {}, new BlockModel(id, undefined, {
		0: 'entity/piglin/piglin',
	}, [
		{
			from: [3, 0, 4],
			to: [13, 8, 12],
			faces: {
				north: {uv: [6.5, 2, 9, 4], texture: '#0'},
				east: {uv: [2, 2, 0, 4], texture: '#0'},
				south: {uv: [2, 2, 4.5, 4], texture: '#0'},
				west: {uv: [6.5, 2, 4.5, 4], texture: '#0'},
				up: {uv: [2, 0, 4.5, 2], texture: '#0'},
				down: {uv: [4.5, 0, 7, 2], texture: '#0'},
			},
		},
		{
			from: [6, 0, 12],
			to: [10, 4, 13],
			faces: {
				north: {uv: [9.25, 0.5, 10.25, 1.5], texture: '#0'},
				east: {uv: [7.75, 0.5, 8, 1.5], texture: '#0'},
				south: {uv: [8, 0.5, 9, 1.5], texture: '#0'},
				west: {uv: [9, 0.5, 9.25, 1.5], texture: '#0'},
				up: {uv: [8, 0.25, 9, 0.5], texture: '#0'},
				down: {uv: [9, 0.25, 10, 0.5], texture: '#0'},
			},
		},
		{
			from: [5, 0, 12],
			to: [6, 2, 13],
			faces: {
				north: {uv: [1.25, 0.25, 1.5, 0.75], texture: '#0'},
				east: {uv: [0.5, 0.25, 0.75, 0.75], texture: '#0'},
				south: {uv: [0.75, 0.25, 1, 0.75], texture: '#0'},
				west: {uv: [1, 0.25, 1.25, 0.75], texture: '#0'},
				up: {uv: [0.75, 0, 1, 0.25], texture: '#0'},
				down: {uv: [1, 0, 1.25, 0.25], texture: '#0'},
			},
		},
		{
			from: [10, 0, 12],
			to: [11, 2, 13],
			faces: {
				north: {uv: [1.25, 1.25, 1.5, 1.75], texture: '#0'},
				east: {uv: [0.5, 1.25, 0.75, 1.75], texture: '#0'},
				south: {uv: [0.75, 1.25, 1, 1.75], texture: '#0'},
				west: {uv: [1, 1.25, 1.25, 1.75], texture: '#0'},
				up: {uv: [0.75, 1, 1, 1.25], texture: '#0'},
				down: {uv: [1, 1, 1.25, 1.25], texture: '#0'},
			},
		},
		{
			from: [2.5, 1.5, 6],
			to: [3.5, 6.5, 10],
			rotation: {angle: -30, axis: 'z', origin: [3, 7, 8]},
			faces: {
				north: {uv: [12, 2.5, 12.25, 3.75], texture: '#0'},
				east: {uv: [9.75, 2.5, 10.75, 3.75], texture: '#0'},
				south: {uv: [10.75, 2.5, 11, 3.75], texture: '#0'},
				west: {uv: [11, 2.5, 12, 3.75], texture: '#0'},
				up: {uv: [10.75, 1.5, 11, 2.5], texture: '#0'},
				down: {uv: [11, 1.5, 11.25, 2.5], texture: '#0'},
			},
		},
		{
			from: [12.5, 1.5, 6],
			to: [13.5, 6.5, 10],
			rotation: {angle: 30, axis: 'z', origin: [13, 7, 8]},
			faces: {
				north: {uv: [15.25, 2.5, 15, 3.75], texture: '#0'},
				east: {uv: [15, 2.5, 14, 3.75], texture: '#0'},
				south: {uv: [14, 2.5, 13.75, 3.75], texture: '#0'},
				west: {uv: [13.75, 2.5, 12.75, 3.75], texture: '#0'},
				up: {uv: [14, 1.5, 13.75, 2.5], texture: '#0'},
				down: {uv: [14.25, 1.5, 14, 2.5], texture: '#0'},
			},
		},
	]).withUvEpsilon(1/128))
}

function getStr(block: BlockState, key: string, fallback = '') {
	return block.getProperty(key) ?? fallback
}

function getInt(block: BlockState, key: string, fallback = '0') {
	return parseInt(block.getProperty(key) ?? fallback)
}

const ChestRenderers = new Map(Object.entries({
	'minecraft:chest': chestRenderer('normal'),
	'minecraft:ender_chest': chestRenderer('ender'),
	'minecraft:trapped_chest': chestRenderer('trapped'),
}))

const SkullRenderers = new Map(Object.entries({
	'minecraft:skeleton_skull': skullRenderer('skeleton/skeleton', 2),
	'minecraft:wither_skeleton_skull': skullRenderer('skeleton/wither_skeleton_skull', 2),
	'minecraft:zombie_head': skullRenderer('zombie/zombie', 1),
	'minecraft:creeper_head': skullRenderer('creeper/creeper', 2),
	'minecraft:dragon_head': dragonHead,
	'minecraft:piglin_head': piglinHead,
	'minecraft:player_head': skullRenderer('player/wide/steve', 1), // TODO: fix texture
}))

export namespace SpecialRenderers {
	export function getBlockMesh(block: BlockState, atlas: TextureAtlasProvider, cull: Cull): Mesh {
		if (block.is('water')) {
			return liquidRenderer('water', getInt(block, 'level'), atlas, cull, 0)
		}
		if (block.is('lava')) {
			return liquidRenderer('lava', getInt(block, 'level'), atlas, cull)
		}
		const mesh = new Mesh()
		const chestRenderer = ChestRenderers.get(block.getName().toString())
		if (chestRenderer !== undefined) {
			const chestMesh = chestRenderer(atlas)
			const facing = getStr(block, 'facing', 'south')
			const t = mat4.create()
			mat4.translate(t, t, [0.5, 0.5, 0.5])
			mat4.rotateY(t, t, facing === 'west' ? Math.PI / 2 : facing === 'south' ? Math.PI : facing === 'east' ? Math.PI * 3 / 2 : 0)
			mat4.translate(t, t, [-0.5, -0.5, -0.5])
			mesh.merge(chestMesh.transform(t))
		}
		if (block.is('decorated_pot')) {
			mesh.merge(decoratedPotRenderer(atlas))
		}
		const skullRenderer = SkullRenderers.get(block.getName().toString())
		if (skullRenderer !== undefined) {
			const skullMesh = skullRenderer(atlas)
			const rotation = getInt(block, 'rotation') / 16 * Math.PI * 2
			const t = mat4.create()
			mat4.translate(t, t, [0.5, 0.5, 0.5])
			mat4.rotateY(t, t, rotation)
			mat4.translate(t, t, [-0.5, -0.5, -0.5])
			mesh.merge(skullMesh.transform(t))
		}

		if (block.getProperties()['waterlogged'] === 'true') {
			mesh.merge(liquidRenderer('water', 0, atlas, cull, 0))
		}
		return mesh
	}

	export function getItemMesh(item: ItemStack, atlas: TextureAtlasProvider): Mesh {
		if (item.is('shield')) {
			const shieldMesh = shieldRenderer(atlas)
			const t = mat4.create()
			mat4.translate(t, t, [-3, 1, 0])
			mat4.rotateX(t, t, -10 * Math.PI/180)
			mat4.rotateY(t, t, -10 * Math.PI/180)
			mat4.rotateZ(t, t, -5 * Math.PI/180)
			mat4.scale(t, t, [16, 16, 16])
			return shieldMesh.transform(t)
		}

		// Assumes block and item ID are the same
		const blockMesh = getBlockMesh(new BlockState(item.id, {}), atlas, Cull.none())
		const t = mat4.create()
		mat4.scale(t, t, [16, 16, 16])
		return blockMesh.transform(t)
	}
}
