import { Color, ItemStack, Json, NbtIntArray, PotionContents } from "../index.js"

export abstract class ItemTint {
	public abstract getTint(item: ItemStack): Color
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
			default:
				throw new Error(`Invalid item tint type ${type}`)
		}
	}

	class Constant extends ItemTint{
		constructor(
			public value: Color
		) {
			super()
		}

		public getTint(item: ItemStack): Color {
			return this.value
		}
	}

	class Dye extends ItemTint{
		constructor(
			public default_color: Color
		) {
			super()
		}

		public getTint(item: ItemStack): Color {
			const dyedColor = item.getComponent('dyed_color', tag => {
				return tag.isCompound() ? tag.getNumber('rgb') : tag.getAsNumber()
			})
			if (dyedColor === undefined) return this.default_color
			return Color.intToRgb(dyedColor)
		}
	}	

	class Grass extends ItemTint{
		constructor(
			public temperature: number,
			public downfall: number
		) {
			super()
		}

		public getTint(item: ItemStack): Color {
			return  [124 / 255, 189 / 255, 107 / 255] // TODO: this is hardcoded to the same value as for blocks
		}
	}

	class Firework extends ItemTint{
		constructor(
			public default_color: Color
		) {
			super()
		}

		public getTint(item: ItemStack): Color {
			const colors = item.getComponent('firework_explosion', tag => {
				if (!tag.isCompound()) return new NbtIntArray()
				const colorsTag = tag.get('colors')
				if (colorsTag && colorsTag.isListOrArray()) return colorsTag
				return new NbtIntArray()
			})
			console.log(colors)
			const color: Color = (() => {
				if (!colors || colors.length === 0) {
					return this.default_color
				}
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
				return [r, g, b]
			})()
			return color
		}
	}

	class Potion extends ItemTint {
		constructor(
			public default_color: Color
		) {
			super()
		}		

		public getTint(item: ItemStack): Color {
			const potion_contents = item.getComponent('potion_contents', PotionContents.fromNbt )
			if (!potion_contents) return this.default_color
			return PotionContents.getColor(potion_contents)
		}
	}

	class MapColor extends ItemTint {
		constructor(
			public default_color: Color
		) {
			super()
		}		

		public getTint(item: ItemStack): Color {
			const mapColor = item.getComponent('map_color', tag => tag.getAsNumber())
			if (mapColor === undefined) return this.default_color
			return Color.intToRgb(mapColor)
		}
	}

	class CustomModelData extends ItemTint {
		constructor(
			public index: number,
			public default_color: Color
		) {
			super()
		}		

		public getTint(item: ItemStack): Color {
			return item.getComponent('custom_model_data', tag => {
				if (!tag.isCompound()) return undefined
				const colorTag = tag.getList('colors').get(this.index)
				if (colorTag === undefined) return undefined
				return Color.fromNbt(colorTag)
			}) ?? this.default_color
		}
	}
}