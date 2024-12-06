import type { ItemComponentsProvider, ItemStack } from '../core/index.js'
import { PotionContents } from '../core/index.js'
import { Color, Json } from '../util/index.js'
import type { ItemRenderingContext } from './ItemRenderer.js'

export interface ItemTint {
	getTint(item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext): Color
}

const INVALID_COLOR: Color = [0, 0, 0]

export namespace ItemTint {
	export function fromJson(obj: unknown): ItemTint {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'constant': return new Constant(
				Color.fromJson(root.value) ?? INVALID_COLOR
			)
			case 'dye': return new Dye(
				Color.fromJson(root.default) ?? INVALID_COLOR
			)
			case 'grass': return new Grass(
				Json.readNumber(root.temperature) ?? 0,
				Json.readNumber(root.downfall) ?? 0
			)
			case 'firework': return new Firework(
				Color.fromJson(root.default) ?? INVALID_COLOR
			)
			case 'potion': return new Potion(
				Color.fromJson(root.default) ?? INVALID_COLOR
			)
			case 'map_color': return new MapColor(
				Color.fromJson(root.default) ?? INVALID_COLOR
			)
			case 'custom_model_data': return new CustomModelData(
				Json.readInt(root.index) ?? 0,
				Color.fromJson(root.default) ?? INVALID_COLOR
			)
			case 'team': return new Team(
				Color.fromJson(root.default) ?? INVALID_COLOR
			)
			default:
				throw new Error(`Invalid item tint type ${type}`)
		}
	}

	export class Constant {
		constructor(public value: Color) {}

		public getTint(item: ItemStack): Color {
			return this.value
		}
	}

	export class Dye {
		constructor(public default_color: Color) {}

		public getTint(item: ItemStack, resources: ItemComponentsProvider): Color {
			const tag = item.getComponent('dyed_color', resources)
			if (!tag) {
				return this.default_color
			}
			if (!tag.isCompound()) {
				return Color.intToRgb(tag.getAsNumber())
			}
			return Color.intToRgb(tag.getNumber('rgb'))
		}
	}	

	export class Grass {
		constructor(public temperature: number, public downfall: number) {}

		public getTint(item: ItemStack): Color {
			return  [124 / 255, 189 / 255, 107 / 255] // TODO: this is hardcoded to the same value as for blocks
		}
	}

	export class Firework {
		constructor(public default_color: Color) {}

		public getTint(item: ItemStack, resources: ItemComponentsProvider): Color {
			const tag = item.getComponent('firework_explosion', resources)
			if (!tag?.isCompound()) {
				return this.default_color
			}
			const colors = tag.get('colors')
			if (!colors || !colors.isListOrArray()) {
				return this.default_color
			}
			const color: Color = (() => {
				if (colors.length === 1) {
					return Color.intToRgb(colors.get(0)!.getAsNumber())
				}
				let [r, g, b] = [0, 0, 0]
				for (const color of colors.getItems()) {
					r += (color.getAsNumber() & 0xFF0000) >> 16
					g += (color.getAsNumber() & 0xFF00) >> 8
					b += (color.getAsNumber() & 0xFF) >> 0
				}
				r /= colors.length
				g /= colors.length
				b /= colors.length
				return [r / 255, g / 255, b / 255]
			})()
			return color
		}
	}

	export class Potion  {
		constructor(public default_color: Color) {}		

		public getTint(item: ItemStack, resources: ItemComponentsProvider): Color {
			const tag = item.getComponent('potion_contents', resources)
			if (!tag) {
				return this.default_color
			}
			const potionContents = PotionContents.fromNbt(tag)
			return PotionContents.getColor(potionContents)
		}
	}

	export class MapColor  {
		constructor(public default_color: Color) {}

		public getTint(item: ItemStack, resources: ItemComponentsProvider): Color {
			const mapColor = item.getComponent('map_color', resources)
			if (!mapColor) {
				return this.default_color
			}
			return Color.intToRgb(mapColor.getAsNumber())
		}
	}

	export class CustomModelData  {
		constructor(public index: number, public default_color: Color) {}		

		public getTint(item: ItemStack, resources: ItemComponentsProvider): Color {
			const tag = item.getComponent('custom_model_data', resources)
			if (!tag?.isCompound()) {
				return this.default_color
			}
			const colors = tag.getList('colors').get(this.index)
			if (!colors) {
				return this.default_color
			}
			return Color.fromNbt(colors) ?? this.default_color
		}
	}

	export class Team  {
		constructor(public default_color: Color) {}

		public getTint(item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext): Color {
			return context.context_entity_team_color ?? this.default_color
		}
	}
}
