import { mat4 } from 'gl-matrix'
import type {Direction, ItemStack, NbtCompound, TextureAtlasProvider} from '../index.js'
import { NbtList } from '../index.js'
import { Identifier, Json, SpecialRenderers } from '../index.js'
import { Mesh } from './Mesh.js'

export interface SpecialModel {
	getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh
}

export namespace SpecialModel {
	export function fromJson(obj: unknown): SpecialModel {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'bed': return new Bed(
				Identifier.parse(Json.readString(root.texture) ?? '')
			)
			case 'banner': return new Banner(
				Json.readString(root.color) ?? ''
			)
			case 'conduit': return new Conduit()
			case 'chest': return new Chest(
				Identifier.parse(Json.readString(root.texture) ?? ''),
				Json.readNumber(root.openness) ?? 0
			)
			case 'head': return new Head(
				Json.readString(root.kind) ?? '',
				typeof root.texture === 'string' ? Identifier.parse(root.texture) : undefined,
				Json.readNumber(root.animation) ?? 0
			)
			case 'shulker_box': return new ShulkerBox(
				Identifier.parse(Json.readString(root.texture) ?? ''),
				Json.readNumber(root.openness) ?? 0,
				(Json.readString(root.orientation) ?? 'up') as Direction
			)
			case 'shield': return new Shield()
			case 'trident': return new Trident()
			case 'decorated_pot': return new DecoratedPot()
			case 'standing_sign': return new StandingSign(
				Json.readString(root.wood_type) ?? '',
				typeof root.texture === 'string' ? Identifier.parse(root.texture) : undefined
			)
			case 'hanging_sign': return new HangingSign(
				Json.readString(root.wood_type) ?? '',
				typeof root.texture === 'string' ? Identifier.parse(root.texture) : undefined
			)
			default:
				throw new Error(`Invalid item model type ${type}`)
		}
	}

	class Bed {
		private readonly renderer

		constructor(texture: Identifier) {
			this.renderer = SpecialRenderers.bedRenderer(texture)
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			const headMesh = this.renderer('head', resources)
			const footMesh = this.renderer('foot', resources)
			const t = mat4.create()
			mat4.translate(t, t, [0, 0, -16])
			return headMesh.merge(footMesh.transform(t))
		}
	}

	class Banner {
		private readonly renderer

		constructor(color: string) {
			this.renderer = SpecialRenderers.bannerRenderer(color)
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			const patterns = item.getComponent('banner_patterns', undefined)
			const t = mat4.create()
			mat4.translate(t, t, [8, 24, 8])
			mat4.rotateY(t, t, Math.PI)
			mat4.scale(t, t, [2/3, 2/3, 2/3])
			mat4.translate(t, t, [-8, -24, -8])
			return this.renderer(resources, patterns instanceof NbtList<NbtCompound> ? patterns : undefined).transform(t)
		}
	}

	class Conduit {
		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			return SpecialRenderers.conduitRenderer(resources)
		}
	}

	class Chest {
		private readonly renderer

		constructor(
			texture: Identifier,
			openness: number
		) {
			this.renderer = SpecialRenderers.chestRenderer(texture)
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			const t = mat4.create()
			mat4.translate(t, t, [8, 8, 8])
			mat4.rotateY(t, t, Math.PI)
			mat4.translate(t, t, [-8, -8, -8])
			return this.renderer(resources).transform(t)
		}
	}

	class Head {
		private readonly renderer

		constructor(kind: string, texture: Identifier | undefined, animation: number) {
			this.renderer = ({
				skeleton: () => SpecialRenderers.headRenderer(texture ?? Identifier.create('skeleton/skeleton'), 2),
				wither_skeleton: () => SpecialRenderers.headRenderer(texture ?? Identifier.create('skeleton/wither_skeleton'), 2),
				zombie: () => SpecialRenderers.headRenderer(texture ?? Identifier.create('zombie/zombie'), 1),
				creeper: () => SpecialRenderers.headRenderer(texture ?? Identifier.create('creeper/creeper'), 2),
				dragon: () => SpecialRenderers.dragonHeadRenderer(texture),
				piglin: () => SpecialRenderers.piglinHeadRenderer(texture),
				player: () => SpecialRenderers.headRenderer(texture ?? Identifier.create('player/wide/steve'), 1), // TODO: fix texture
			}[kind] ?? (() => () => new Mesh()))()
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			return this.renderer(resources)
		}
	}

	class ShulkerBox {
		private readonly renderer

		constructor(texture: Identifier, openness: number, orientation: Direction) {
			this.renderer = SpecialRenderers.shulkerBoxRenderer(texture)
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			return this.renderer(resources)
		}
	}

	class Shield {
		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			const shieldMesh = SpecialRenderers.shieldRenderer(resources)
			const t = mat4.create()
			mat4.translate(t, t, [-3, 1, 0])
			mat4.rotateX(t, t, -10 * Math.PI/180)
			mat4.rotateY(t, t, -10 * Math.PI/180)
			mat4.rotateZ(t, t, -5 * Math.PI/180)
			return shieldMesh.transform(t)
		}
	}

	class Trident {
		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			return new Mesh() // TODO
		}
	}
	
	class DecoratedPot {
		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			return SpecialRenderers.decoratedPotRenderer(resources)
		}
	}	

	class StandingSign {
		private readonly renderer

		constructor(wood_type: string, texture?: Identifier) {
			this.renderer = SpecialRenderers.signRenderer(texture ?? Identifier.create(wood_type))
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			return this.renderer(resources)
		}
	}

	class HangingSign {
		private readonly renderer

		constructor(wood_type: string, texture?: Identifier) {
			this.renderer = SpecialRenderers.hangingSignRenderer(texture ?? Identifier.create(wood_type))
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider): Mesh {
			return this.renderer(false, resources)
		}
	}
}
