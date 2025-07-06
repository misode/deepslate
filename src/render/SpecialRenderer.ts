import { mat4 } from 'gl-matrix'
import type { BlockState } from '../core/index.js'
import { Direction, Identifier } from '../core/index.js'
import type { NbtCompound, NbtList } from '../nbt/index.js'
import { NbtType } from '../nbt/index.js'
import { Color } from '../util/index.js'
import { BlockColors } from './BlockColors.js'
import { BlockModel } from './BlockModel.js'
import { Cull } from './Cull.js'
import { Mesh } from './Mesh.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

function liquidRenderer(type: string, level: number, atlas: TextureAtlasProvider, cull: Cull, tintindex?: number) {
	const y = cull['up'] ? 16 : [14.2, 12.5, 10.5, 9, 7, 5.3, 3.7, 1.9, 16, 16, 16, 16, 16, 16, 16, 16][level]
	return new BlockModel(undefined, {
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
	}]).getMesh(atlas, cull, BlockColors[type]?.({}))
}

const DyeColors: Record<string, Color> = {
	white: Color.intToRgb(16383998),
	orange: Color.intToRgb(16351261),
	magenta: Color.intToRgb(13061821),
	light_blue: Color.intToRgb(3847130),
	yellow: Color.intToRgb(16701501),
	lime: Color.intToRgb(8439583),
	pink: Color.intToRgb(15961002),
	gray: Color.intToRgb(4673362),
	light_gray: Color.intToRgb(10329495),
	cyan: Color.intToRgb(1481884),
	purple: Color.intToRgb(8991416),
	blue: Color.intToRgb(3949738),
	brown: Color.intToRgb(8606770),
	green: Color.intToRgb(6192150),
	red: Color.intToRgb(11546150),
	black: Color.intToRgb(1908001),
}

export namespace SpecialRenderers {
	export function chestRenderer(texture: Identifier) {
		return (atlas: TextureAtlasProvider) => {
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/chest/').toString(),
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
			]).getMesh(atlas, Cull.none())
		}
	}

	export function decoratedPotRenderer(atlas: TextureAtlasProvider) {
		return new BlockModel(undefined, {
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
		]).getMesh(atlas, Cull.none())
	}

	export function shieldRenderer(atlas: TextureAtlasProvider) {
		return new BlockModel(undefined, {
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
		]).getMesh(atlas, Cull.none())
	}

	export function headRenderer(texture: Identifier, n: number) {
		return (atlas: TextureAtlasProvider) => {
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/').toString(),
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
			])
				.getMesh(atlas, Cull.none())
		}
	}

	export function dragonHeadRenderer(texture: Identifier = Identifier.create('enderdragon/dragon')) {
		return (atlas: TextureAtlasProvider) => {
			const transformation = mat4.create()
			mat4.translate(transformation, transformation, [8, 8, 8])
			mat4.scale(transformation, transformation, [0.75, 0.75, 0.75])
			mat4.rotateY(transformation, transformation, Math.PI)
			mat4.translate(transformation, transformation, [-8, -11.2, -8])
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/').toString(),
			}, [
				{
					from: [2, 4, -16],
					to: [14, 9, 0],
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
				{
					from: [3, 16, 4],
					to: [5, 20, 10],
					faces: {
						north: {uv: [0.375, 0.375, 0.5, 0.625], texture: '#0'},
						east: {uv: [0, 0.375, 0.375, 0.625], texture: '#0'},
						south: {uv: [0.875, 0.375, 1, 0.625], texture: '#0'},
						west: {uv: [0.5, 0.375, 0.875, 0.625], texture: '#0'},
						up: {uv: [0.5, 0.375, 0.375, 0], texture: '#0'},
						down: {uv: [0.625, 0, 0.5, 0.375], texture: '#0'},
					},
				},
				{
					from: [11, 16, 4],
					to: [13, 20, 10],
					faces: {
						north: {uv: [0.375, 0.375, 0.5, 0.625], texture: '#0'},
						east: {uv: [0, 0.375, 0.375, 0.625], texture: '#0'},
						south: {uv: [0.875, 0.375, 1, 0.625], texture: '#0'},
						west: {uv: [0.5, 0.375, 0.875, 0.625], texture: '#0'},
						up: {uv: [0.5, 0.375, 0.375, 0], texture: '#0'},
						down: {uv: [0.625, 0, 0.5, 0.375], texture: '#0'},
					},
				},
				{
					from: [3, 9, -14],
					to: [5, 11, -10],
					faces: {
						north: {uv: [7.25, 0.25, 7.375, 0.375], texture: '#0'},
						east: {uv: [7, 0.25, 7.25, 0.375], texture: '#0'},
						south: {uv: [7.625, 0.25, 7.75, 0.375], texture: '#0'},
						west: {uv: [7.375, 0.25, 7.625, 0.375], texture: '#0'},
						up: {uv: [7.375, 0.25, 7.25, 0], texture: '#0'},
						down: {uv: [7.5, 0, 7.375, 0.25], texture: '#0'},
					},
				},
				{
					from: [11, 9, -14],
					to: [13, 11, -10],
					faces: {
						north: {uv: [7.25, 0.25, 7.375, 0.375], texture: '#0'},
						east: {uv: [7, 0.25, 7.25, 0.375], texture: '#0'},
						south: {uv: [7.625, 0.25, 7.75, 0.375], texture: '#0'},
						west: {uv: [7.375, 0.25, 7.625, 0.375], texture: '#0'},
						up: {uv: [7.375, 0.25, 7.25, 0], texture: '#0'},
						down: {uv: [7.5, 0, 7.375, 0.25], texture: '#0'},
					},
				},
			]).getMesh(atlas, Cull.none()).transform(transformation)
		}
	}

	export function piglinHeadRenderer(texture: Identifier = Identifier.create('piglin/piglin')) {
		return (atlas: TextureAtlasProvider) => {
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/').toString(),
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
			]).getMesh(atlas, Cull.none())
		}
	}

	export function signRenderer(texture: Identifier) {
		return (atlas: TextureAtlasProvider) => {
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/signs/').toString(),
			}, [
				{
					from: [-4, 8, 7],
					to: [20, 20, 9],
					faces: {
						north: {uv: [0.5, 1, 6.5, 7], texture: '#0'},
						east: {uv: [0, 1, 0.5, 7], texture: '#0'},
						south: {uv: [7, 1, 13, 7], texture: '#0'},
						west: {uv: [6.5, 1, 7, 7], texture: '#0'},
						up: {uv: [6.5, 1, 0.5, 0], texture: '#0'},
						down: {uv: [12.5, 0, 6.5, 1], texture: '#0'},
					},
				},
				{
					from: [7, -6, 7],
					to: [9, 8, 9],
					faces: {
						north: {uv: [0.5, 8, 1, 15], texture: '#0'},
						east: {uv: [0, 8, 0.5, 15], texture: '#0'},
						south: {uv: [1.5, 8, 2, 15], texture: '#0'},
						west: {uv: [1, 8, 1.5, 15], texture: '#0'},
						up: {uv: [1, 8, 0.5, 7], texture: '#0'},
						down: {uv: [1.5, 7, 1, 8], texture: '#0'},
					},
				},
			]).getMesh(atlas, Cull.none())
		}
	}

	export function wallSignRenderer(texture: Identifier) {
		return (atlas: TextureAtlasProvider) => {
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/signs/').toString(),
			}, [
				{
					from: [-4, 4, 17],
					to: [20, 16, 19],
					faces: {
						north: {uv: [0.5, 1, 6.5, 7], texture: '#0'},
						east: {uv: [0, 1, 0.5, 7], texture: '#0'},
						south: {uv: [7, 1, 13, 7], texture: '#0'},
						west: {uv: [6.5, 1, 7, 7], texture: '#0'},
						up: {uv: [6.5, 1, 0.5, 0], texture: '#0'},
						down: {uv: [12.5, 0, 6.5, 1], texture: '#0'},
					},
				},
			]).getMesh(atlas, Cull.none())
		}
	}

	export function hangingSignRenderer(texture: Identifier) {
		return (attached: boolean, atlas: TextureAtlasProvider) => {
			if (attached) {
				return new BlockModel(undefined, {
					0: texture.withPrefix('entity/signs/hanging/').toString(),
				}, [
					{
						from: [1, 0, 7],
						to: [15, 10, 9],
						faces: {
							north: {uv: [0.5, 7, 4, 12], texture: '#0'},
							east: {uv: [0, 7, 0.5, 12], texture: '#0'},
							south: {uv: [4.5, 7, 8, 12], texture: '#0'},
							west: {uv: [4, 7, 4.5, 12], texture: '#0'},
							up: {uv: [4, 7, 0.5, 6], texture: '#0'},
							down: {uv: [7.5, 6, 4, 7], texture: '#0'},
						},
					},
					{
						from: [2, 10, 8],
						to: [14, 16, 8],
						faces: {
							north: {uv: [3.5, 3, 6.5, 6], texture: '#0'},
							south: {uv: [3.5, 3, 6.5, 6], texture: '#0'},
						},
					},
				]).getMesh(atlas, Cull.none())
			}
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/signs/hanging/').toString(),
			}, [
				{
					from: [1, 0, 7],
					to: [15, 10, 9],
					faces: {
						north: {uv: [0.5, 7, 4, 12], texture: '#0'},
						east: {uv: [0, 7, 0.5, 12], texture: '#0'},
						south: {uv: [4.5, 7, 8, 12], texture: '#0'},
						west: {uv: [4, 7, 4.5, 12], texture: '#0'},
						up: {uv: [4, 7, 0.5, 6], texture: '#0'},
						down: {uv: [7.5, 6, 4, 7], texture: '#0'},
					},
				},
				{
					from: [1.5, 10, 8],
					to: [4.5, 16, 8],
					rotation: {angle: 45, axis: 'y', origin: [3, 12, 8]},
					faces: {
						north: {uv: [0, 3, 0.75, 6], texture: '#0'},
						south: {uv: [0, 3, 0.75, 6], texture: '#0'},
					},
				},
				{
					from: [3, 10, 6.5],
					to: [3, 16, 9.5],
					rotation: {angle: 45, axis: 'y', origin: [3, 12, 8]},
					faces: {
						east: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
						west: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
					},
				},
				{
					from: [11.5, 10, 8],
					to: [14.5, 16, 8],
					rotation: {angle: 45, axis: 'y', origin: [13, 12, 8]},
					faces: {
						north: {uv: [0, 3, 0.75, 6], texture: '#0'},
						south: {uv: [0, 3, 0.75, 6], texture: '#0'},
					},
				},
				{
					from: [13, 10, 6.5],
					to: [13, 16, 9.5],
					rotation: {angle: 45, axis: 'y', origin: [13, 12, 8]},
					faces: {
						east: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
						west: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
					},
				},
			]).getMesh(atlas, Cull.none())
		}
	}

	export function wallHangingSignRenderer(woodType: string) {
		return (atlas: TextureAtlasProvider) => {
			return new BlockModel(undefined, {
				0: `entity/signs/hanging/${woodType}`,
			}, [
				{
					from: [1, 0, 7],
					to: [15, 10, 9],
					faces: {
						north: {uv: [0.5, 7, 4, 12], texture: '#0'},
						east: {uv: [0, 7, 0.5, 12], texture: '#0'},
						south: {uv: [4.5, 7, 8, 12], texture: '#0'},
						west: {uv: [4, 7, 4.5, 12], texture: '#0'},
						up: {uv: [4, 7, 0.5, 6], texture: '#0'},
						down: {uv: [7.5, 6, 4, 7], texture: '#0'},
					},
				},
				{
					from: [0, 14, 6],
					to: [16, 16, 10],
					faces: {
						north: {uv: [1, 2, 5, 3], texture: '#0'},
						east: {uv: [0, 2, 1, 3], texture: '#0'},
						south: {uv: [6, 2, 10, 3], texture: '#0'},
						west: {uv: [5, 2, 6, 3], texture: '#0'},
						up: {uv: [5, 2, 1, 0], texture: '#0'},
						down: {uv: [9, 0, 5, 2], texture: '#0'},
					},
				},
				{
					from: [1.5, 10, 8],
					to: [4.5, 16, 8],
					rotation: {angle: 45, axis: 'y', origin: [3, 12, 8]},
					faces: {
						north: {uv: [0, 3, 0.75, 6], texture: '#0'},
						south: {uv: [0, 3, 0.75, 6], texture: '#0'},
					},
				},
				{
					from: [3, 10, 6.5],
					to: [3, 16, 9.5],
					rotation: {angle: 45, axis: 'y', origin: [3, 12, 8]},
					faces: {
						east: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
						west: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
					},
				},
				{
					from: [11.5, 10, 8],
					to: [14.5, 16, 8],
					rotation: {angle: 45, axis: 'y', origin: [13, 12, 8]},
					faces: {
						north: {uv: [0, 3, 0.75, 6], texture: '#0'},
						south: {uv: [0, 3, 0.75, 6], texture: '#0'},
					},
				},
				{
					from: [13, 10, 6.5],
					to: [13, 16, 9.5],
					rotation: {angle: 45, axis: 'y', origin: [13, 12, 8]},
					faces: {
						east: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
						west: {uv: [1.5, 3, 2.25, 6], texture: '#0'},
					},
				},
			]).getMesh(atlas, Cull.none())
		}
	}

	export function conduitRenderer(atlas: TextureAtlasProvider) {
		return new BlockModel(undefined, {
			0: 'entity/conduit/base',
		}, [
			{
				from: [5, 5, 5],
				to: [11, 11, 11],
				faces: {
					north: {uv: [3, 6, 6, 12], texture: '#0'},
					east: {uv: [0, 6, 3, 12], texture: '#0'},
					south: {uv: [9, 6, 12, 12], texture: '#0'},
					west: {uv: [6, 6, 9, 12], texture: '#0'},
					up: {uv: [6, 6, 3, 0], texture: '#0'},
					down: {uv: [9, 0, 6, 6], texture: '#0'},
				},
			},
		]).getMesh(atlas, Cull.none())
	}

	export function shulkerBoxRenderer(texture: Identifier) {
		return (atlas: TextureAtlasProvider) => {
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/shulker/').toString(),
			}, [
				{
					from: [0, 0, 0],
					to: [16, 8, 16],
					faces: {
						north: {uv: [4, 11, 8, 13], texture: '#0'},
						east: {uv: [0, 11, 4, 13], texture: '#0'},
						south: {uv: [12, 11, 16, 13], texture: '#0'},
						west: {uv: [8, 11, 12, 13], texture: '#0'},
						up: {uv: [8, 11, 4, 7], texture: '#0'},
						down: {uv: [12, 7, 8, 11], texture: '#0'},
					},
				},
				{
					from: [0, 4, 0],
					to: [16, 16, 16],
					faces: {
						north: {uv: [4, 4, 8, 7], texture: '#0'},
						east: {uv: [0, 4, 4, 7], texture: '#0'},
						south: {uv: [12, 4, 16, 7], texture: '#0'},
						west: {uv: [8, 4, 12, 7], texture: '#0'},
						up: {uv: [8, 4, 4, 0], texture: '#0'},
						down: {uv: [12, 0, 8, 4], texture: '#0'},
					},
				},
			]).getMesh(atlas, Cull.none())
		}
	}

	const bannerFace = (index: number) => ({
		north: {uv: [0.25, 0.25, 5.25, 10.25], texture: `#${index}`, tintindex: index},
		east: {uv: [0, 0.25, 0.25, 10.25], texture: `#${index}`, tintindex: index},
		south: {uv: [5.5, 0.25, 10.5, 10.25], texture: `#${index}`, tintindex: index},
		west: {uv: [5.25, 0.25, 5.5, 10.25], texture: `#${index}`, tintindex: index},
		up: {uv: [5.25, 0.25, 0.25, 0], texture: `#${index}`, tintindex: index},
		down: {uv: [10.25, 0, 5.25, 0.25], texture: `#${index}`, tintindex: index},
	})

	function createBannerRenderer(color: string, config: { base: any[], pattern: (index: number) => any }) {
		return (atlas: TextureAtlasProvider, patterns?: NbtList<NbtCompound>) => {
			const textures: { [key: string]: string } = { 0: 'entity/banner_base' }
			const elements = [...config.base]
			const colors: string[] = [color]

			patterns?.forEach((compound, index) => {
				const pattern = Identifier.parse(compound.getString('pattern')).path
				const color = compound.getString('color')
				index++
				textures[index] = `entity/banner/${pattern}`
				elements.push(config.pattern(index))
				colors.push(color)
			})

			return new BlockModel(undefined, textures, elements)
				.getMesh(atlas, Cull.none(), (index: number) => DyeColors[colors[index]])
		}
	}

	export const bannerRenderer = (color: string) => createBannerRenderer(color, {
		base: [
			{
				from: [-2, -8, 6],
				to: [18, 32, 7],
				faces: bannerFace(0),
			},
			{
				from: [7, -12, 7],
				to: [9, 30, 9],
				faces: {
					north: {uv: [11.5, 0.5, 12, 11], texture: '#0'},
					east: {uv: [11, 0.5, 11.5, 11], texture: '#0'},
					south: {uv: [12.5, 0.5, 13, 11], texture: '#0'},
					west: {uv: [12, 0.5, 12.5, 11], texture: '#0'},
					up: {uv: [12, 0.5, 11.5, 0], texture: '#0'},
					down: {uv: [12.5, 0, 12, 0.5], texture: '#0'},
				},
			},
			{
				from: [-2, 30, 7],
				to: [18, 32, 9],
				faces: {
					north: {uv: [0.5, 11, 5.5, 11.5], texture: '#0'},
					east: {uv: [0, 11, 0.5, 11.5], texture: '#0'},
					south: {uv: [6, 11, 11, 11.5], texture: '#0'},
					west: {uv: [5.5, 11, 6, 11.5], texture: '#0'},
					up: {uv: [5.5, 11, 0.5, 10.5], texture: '#0'},
					down: {uv: [10.5, 10.5, 5.5, 11], texture: '#0'},
				},
			},
		],
		pattern: (index: number) => ({
			from: [-2, -8, 6],
			to: [18, 32, 7],
			faces: bannerFace(index),
		}),
	})

	export const wallBannerRenderer = (color: string) => createBannerRenderer(color, {
		base: [
			{
				from: [-2, -8, -1.5],
				to: [18, 32, -0.5],
				faces: bannerFace(0),
			},
			{
				from: [-2, 30, -3.5],
				to: [18, 32, -1.5],
				faces: {
					north: {uv: [0.5, 11, 5.5, 11.5], texture: '#0'},
					east: {uv: [0, 11, 0.5, 11.5], texture: '#0'},
					south: {uv: [6, 11, 11, 11.5], texture: '#0'},
					west: {uv: [5.5, 11, 6, 11.5], texture: '#0'},
					up: {uv: [5.5, 11, 0.5, 10.5], texture: '#0'},
					down: {uv: [10.5, 10.5, 5.5, 11], texture: '#0'},
				},
			},
		],
		pattern: (index: number) => ({
			from: [-2, -8, -1.5],
			to: [18, 32, -0.5],
			faces: bannerFace(index),
		}),
	})

	export function bellRenderer(atlas: TextureAtlasProvider) {
		return new BlockModel(undefined, {
			0: 'entity/bell/bell_body',
		}, [
			{
				from: [5, 3, 5],
				to: [11, 10, 11],
				faces: {
					north: {uv: [3, 3, 6, 6.5], texture: '#0'},
					east: {uv: [0, 3, 3, 6.5], texture: '#0'},
					south: {uv: [9, 3, 12, 6.5], texture: '#0'},
					west: {uv: [6, 3, 9, 6.5], texture: '#0'},
					up: {uv: [6, 3, 3, 0], texture: '#0'},
					down: {uv: [9, 0, 6, 3], texture: '#0'},
				},
			},
			{
				from: [4, 10, 4],
				to: [12, 12, 12],
				faces: {
					north: {uv: [4, 10.5, 8, 11.5], texture: '#0'},
					east: {uv: [0, 10.5, 4, 11.5], texture: '#0'},
					south: {uv: [12, 10.5, 16, 11.5], texture: '#0'},
					west: {uv: [8, 10.5, 12, 11.5], texture: '#0'},
					up: {uv: [8, 10.5, 4, 6.5], texture: '#0'},
					down: {uv: [12, 6.5, 8, 10.5], texture: '#0'},
				},
			},
		]).getMesh(atlas, Cull.none())
	}

	export function bedRenderer(texture: Identifier) {
		return (part: string, atlas: TextureAtlasProvider) => {
			if (part === 'foot') {
				return new BlockModel(undefined, {
					0: texture.withPrefix('entity/bed/').toString(),
				}, [
					{
						from: [0, 3, 0],
						to: [16, 9, 16],
						faces: {
							north: {uv: [5.5, 5.5, 9.5, 7], rotation: 180, texture: '#0'},
							east: {uv: [0, 7, 1.5, 11], rotation: 270, texture: '#0'},
							west: {uv: [5.5, 7, 7, 11], rotation: 90, texture: '#0'},
							up: {uv: [5.5, 11, 1.5, 7], texture: '#0'},
							down: {uv: [11, 7, 7, 11], texture: '#0'},
						},
					},
					{
						from: [0, 0, 0],
						to: [3, 3, 3],
						faces: {
							north: {uv: [12.5, 5.25, 13.25, 6], texture: '#0'},
							east: {uv: [14.75, 5.25, 15.5, 6], texture: '#0'},
							south: {uv: [14, 5.25, 14.75, 6], texture: '#0'},
							west: {uv: [13.25, 5.25, 14, 6], texture: '#0'},
							up: {uv: [13.25, 4.5, 14, 5.25], texture: '#0'},
							down: {uv: [14, 4.5, 14.75, 5.25], texture: '#0'},
						},
					},
					{
						from: [13, 0, 0],
						to: [16, 3, 3],
						faces: {
							north: {uv: [13.25, 3.75, 14, 4.5], texture: '#0'},
							east: {uv: [12.5, 3.75, 13.25, 4.5], texture: '#0'},
							south: {uv: [14.75, 3.75, 15.5, 4.5], texture: '#0'},
							west: {uv: [14, 3.75, 14.75, 4.5], texture: '#0'},
							up: {uv: [13.25, 3, 14, 3.75], texture: '#0'},
							down: {uv: [14, 3, 14.75, 3.75], texture: '#0'},
						},
					},
				]).getMesh(atlas, Cull.none())
			}
			return new BlockModel(undefined, {
				0: texture.withPrefix('entity/bed/').toString(),
			}, [
				{
					from: [0, 3, 0],
					to: [16, 9, 16],
					faces: {
						east: {uv: [0, 1.5, 1.5, 5.5], rotation: 270, texture: '#0'},
						south: {uv: [1.5, 0, 5.5, 1.5], rotation: 180, texture: '#0'},
						west: {uv: [5.5, 1.5, 7, 5.5], rotation: 90, texture: '#0'},
						up: {uv: [5.5, 5.5, 1.5, 1.5], texture: '#0'},
						down: {uv: [11, 1.5, 7, 5.5], texture: '#0'},
					},
				},
				{
					from: [0, 0, 13],
					to: [3, 3, 16],
					faces: {
						north: {uv: [14.75, 0.75, 15.5, 1.5], texture: '#0'},
						east: {uv: [14, 0.75, 14.75, 1.5], texture: '#0'},
						south: {uv: [13.25, 0.75, 14, 1.5], texture: '#0'},
						west: {uv: [12.5, 0.75, 13.25, 1.5], texture: '#0'},
						up: {uv: [13.25, 0, 14, 0.75], texture: '#0'},
						down: {uv: [14, 0, 14.75, 0.75], texture: '#0'},
					},
				},
				{
					from: [13, 0, 13],
					to: [16, 3, 16],
					faces: {
						north: {uv: [14, 2.25, 14.75, 3], texture: '#0'},
						east: {uv: [13.25, 2.25, 14, 3], texture: '#0'},
						south: {uv: [12.5, 2.25, 13.25, 3], texture: '#0'},
						west: {uv: [14.75, 2.25, 15.5, 3], texture: '#0'},
						up: {uv: [13.25, 1.5, 14, 2.25], texture: '#0'},
						down: {uv: [14, 1.5, 14.75, 2.25], texture: '#0'},
					},
				},
			]).getMesh(atlas, Cull.none())
		}
	}

	function getStr(block: BlockState, key: string, fallback = '') {
		return block.getProperty(key) ?? fallback
	}

	function getInt(block: BlockState, key: string, fallback = '0') {
		return parseInt(block.getProperty(key) ?? fallback)
	}

	const ChestRenderers = new Map(Object.entries({
		'minecraft:chest': SpecialRenderers.chestRenderer(Identifier.create('normal')),
		'minecraft:ender_chest': SpecialRenderers.chestRenderer(Identifier.create('ender')),
		'minecraft:trapped_chest': SpecialRenderers.chestRenderer(Identifier.create('trapped')),
	}))

	const SkullRenderers = new Map(Object.entries({
		'minecraft:skeleton_skull': SpecialRenderers.headRenderer(Identifier.create('skeleton/skeleton'), 2),
		'minecraft:wither_skeleton_skull': SpecialRenderers.headRenderer(Identifier.create('skeleton/wither_skeleton'), 2),
		'minecraft:zombie_head': SpecialRenderers.headRenderer(Identifier.create('zombie/zombie'), 1),
		'minecraft:creeper_head': SpecialRenderers.headRenderer(Identifier.create('creeper/creeper'), 2),
		'minecraft:dragon_head': SpecialRenderers.dragonHeadRenderer(),
		'minecraft:piglin_head': SpecialRenderers.piglinHeadRenderer(),
		'minecraft:player_head': SpecialRenderers.headRenderer(Identifier.create('player/wide/steve'), 1), // TODO: fix texture
	}))

	const WoodTypes = [
		'oak',
		'spruce',
		'birch',
		'jungle',
		'acacia',
		'dark_oak',
		'mangrove',
		'cherry',
		'bamboo',
		'crimson',
		'warped',
	]

	const SignRenderers = new Map(WoodTypes.map(type =>
		[`minecraft:${type}_sign`, SpecialRenderers.signRenderer(Identifier.create(type))]
	))

	const WallSignRenderers = new Map(WoodTypes.map(type =>
		[`minecraft:${type}_wall_sign`, SpecialRenderers.wallSignRenderer(Identifier.create(type))]
	))

	const HangingSignRenderers = new Map(WoodTypes.map(type =>
		[`minecraft:${type}_hanging_sign`, SpecialRenderers.hangingSignRenderer(Identifier.create(type))]
	))

	const WallHangingSignRenderers = new Map(WoodTypes.map(type =>
		[`minecraft:${type}_wall_hanging_sign`, SpecialRenderers.wallHangingSignRenderer(type)]
	))

	const ShulkerBoxRenderers = new Map(
		Object.keys(DyeColors).map(color =>
			[`minecraft:${color}_shulker_box`, SpecialRenderers.shulkerBoxRenderer(Identifier.create(`shulker_${color}`))]
		)
	)

	const BedRenderers = new Map(
		Object.keys(DyeColors).map(color =>
			[`minecraft:${color}_bed`, SpecialRenderers.bedRenderer(Identifier.create(color))]
		)
	)

	const BannerRenderers = new Map(
		Object.keys(DyeColors).map(color =>
			[`minecraft:${color}_banner`, SpecialRenderers.bannerRenderer(color)]
		)
	)

	const WallBannerRenderers = new Map(
		Object.keys(DyeColors).map(color =>
			[`minecraft:${color}_wall_banner`, SpecialRenderers.wallBannerRenderer(color)]
		)
	)

	export function getBlockMesh(block: BlockState, nbt: NbtCompound | undefined, atlas: TextureAtlasProvider, cull: Cull): Mesh {
		const mesh = new Mesh()
		if (block.is('water')) {
			mesh.merge(liquidRenderer('water', getInt(block, 'level'), atlas, cull, 0))
		}
		if (block.is('lava')) {
			mesh.merge(liquidRenderer('lava', getInt(block, 'level'), atlas, cull))
		}
		const chestRenderer = ChestRenderers.get(block.getName().toString())
		if (chestRenderer !== undefined) {
			const facing = getStr(block, 'facing', 'south')
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, facing === 'west' ? Math.PI / 2 : facing === 'south' ? Math.PI : facing === 'east' ? Math.PI * 3 / 2 : 0)
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(chestRenderer(atlas).transform(t))
		}
		if (block.is('decorated_pot')) {
			mesh.merge(decoratedPotRenderer(atlas))
		}
		const skullRenderer = SkullRenderers.get(block.getName().toString())
		if (skullRenderer !== undefined) {
			const rotation = getInt(block, 'rotation') / 16 * Math.PI * 2
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, rotation)
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(skullRenderer(atlas).transform(t))
		}
		const signRenderer = SignRenderers.get(block.getName().toString())
		if (signRenderer !== undefined) {
			const rotation = getInt(block, 'rotation') / 16 * Math.PI * 2
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, rotation)
			mat4.scale(t, t, [2/3, 2/3, 2/3])
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(signRenderer(atlas).transform(t))
		}
		const wallSignRenderer = WallSignRenderers.get(block.getName().toString())
		if (wallSignRenderer !== undefined) {
			const facing = getStr(block, 'facing', 'south')
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, facing === 'west' ? Math.PI / 2 : facing === 'south' ? Math.PI : facing === 'east' ? Math.PI * 3 / 2 : 0)
			mat4.scale(t, t, [2/3, 2/3, 2/3])
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(wallSignRenderer(atlas).transform(t))
		}
		const hangingSignRenderer = HangingSignRenderers.get(block.getName().toString())
		if (hangingSignRenderer !== undefined) {
			const attached = getStr(block, 'attached', 'false') === 'true'
			const rotation = getInt(block, 'rotation') / 16 * Math.PI * 2
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, rotation)
			mat4.scale(t, t, [2/3, 2/3, 2/3])
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(hangingSignRenderer(attached, atlas).transform(t))
		}
		const wallHangingSignRenderer = WallHangingSignRenderers.get(block.getName().toString())
		if (wallHangingSignRenderer !== undefined) {
			const facing = getStr(block, 'facing', 'south')
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, facing === 'west' ? Math.PI / 2 : facing === 'south' ? Math.PI : facing === 'east' ? Math.PI * 3 / 2 : 0)
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(wallHangingSignRenderer(atlas).transform(t))
		}
		if (block.is('conduit')) {
			mesh.merge(conduitRenderer(atlas))
		}
		const shulkerBoxRenderer = ShulkerBoxRenderers.get(block.getName().toString())
		if (shulkerBoxRenderer !== undefined) {
			const facing = getStr(block, 'facing', 'up')
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			if (facing === 'down') {
				mat4.rotateX(t, t, Math.PI)
			} else if (facing !== 'up') {
				mat4.rotateY(t, t, facing === 'east' ? Math.PI / 2 : facing === 'north' ? Math.PI : facing === 'west' ? Math.PI * 3 / 2 : 0)
				mat4.rotateX(t, t, Math.PI/2)
			}
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(shulkerBoxRenderer(atlas).transform(t))
		}
		if (block.is('bell')) {
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.scale(t, t, [1, -1, -1])
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(bellRenderer(atlas).transform(t))
		}
		const bedRenderer = BedRenderers.get(block.getName().toString())
		if (bedRenderer !== undefined) {
			const part = getStr(block, 'part', 'head')
			const facing = getStr(block, 'facing', 'south')
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, facing === 'east' ? Math.PI / 2 : facing === 'north' ? Math.PI : facing === 'west' ? Math.PI * 3 / 2 : 0)
			mat4.translate(t, t, [-8, -8, -8])
			mesh.merge(bedRenderer(part, atlas).transform(t))
		}
		const bannerRenderer = BannerRenderers.get(block.getName().toString())
		if (bannerRenderer !== undefined) {
			const rotation = getInt(block, 'rotation') / 16 * Math.PI * 2
			const t = mat4.create()
			mat4.translate(t, t, [8, 24, 8])
			mat4.rotateY(t, t, rotation)
			mat4.scale(t, t, [2/3, 2/3, 2/3])
			mat4.translate(t, t, [-8, -24, -8])
			mesh.merge(bannerRenderer(atlas, nbt?.getList('patterns', NbtType.Compound)).transform(t))
		}
		const wallBannerRenderer = WallBannerRenderers.get(block.getName().toString())
		if (wallBannerRenderer !== undefined) {
			const facing = getStr(block, 'facing', 'south')
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, facing === 'east' ? Math.PI / 2 : facing === 'north' ? Math.PI : facing === 'west' ? Math.PI * 3 / 2 : 0)
			mat4.scale(t, t, [2/3, 2/3, 2/3])
			mat4.translate(t, t, [-8, -23.2, -8])
			mesh.merge(wallBannerRenderer(atlas, nbt?.getList('patterns', NbtType.Compound)).transform(t))
		}

		if (!block.is('water') && !block.is('lava') && block.isWaterlogged()) {
			mesh.merge(liquidRenderer('water', 0, atlas, cull, 0))
		}

		const t = mat4.create()
		mat4.scale(t, t, [0.0625, 0.0625, 0.0625])
		return mesh.transform(t)
	}
}
