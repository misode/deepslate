import { Identifier, ItemStack, } from "../core/index.js"
import { clamp } from "../math/index.js"
import { Color, Json } from "../util/index.js"
import { ItemTint } from "./ItemTint.js"
import { SpecialModel } from "./SpecialModel.js"
import { Cull, ItemRenderer, ItemRendererResources, ItemRenderingContext, Mesh } from "./index.js"

export interface ItemModelProvider {
	getItemModel(id: Identifier): ItemModel | null
}

export abstract class ItemModel {

	public abstract getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh

}

const MISSING_MESH: Mesh = new Mesh() ///TODO

export namespace ItemModel {
	export function fromJson(obj: unknown): ItemModel {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'model': return new Model(
				Identifier.parse(Json.readString(root.model) ?? ''),
				Json.readArray(root.tints, ItemTint.fromJson) ?? []
			)
			case 'composite': return new Composite(
				Json.readArray(root.models, ItemModel.fromJson) ?? []
			)
			case 'condition': return new Condition(
				Condition.propertyFromJson(root),
				ItemModel.fromJson(root.on_true),
				ItemModel.fromJson(root.on_false)
			)
			case 'select': return new Select(
				Select.propertyFromJson(root),
				new Map(Json.readArray(root.cases, caseObj => {
					const caseRoot = Json.readObject(caseObj) ?? {}
					return [Json.readString(caseRoot.when) ?? '', ItemModel.fromJson(caseRoot.model)]
				})),
				root.fallback ? ItemModel.fromJson(root.fallback) : undefined
			)
			case 'range_dispatch': return new RangeDispatch(
				RangeDispatch.propertyFromJson(root),
				Json.readNumber(root.scale) ?? 1,
				Json.readArray(root.entries, entryObj => {
					const entryRoot = Json.readObject(entryObj) ?? {}
					return {threshold: Json.readNumber(entryRoot.threshold) ?? 0, model: ItemModel.fromJson(entryRoot.model)}
				}) ?? [],
				root.fallback ? ItemModel.fromJson(root.fallback) : undefined
			)
			case 'special': return new Special(
				SpecialModel.fromJson(root.model),
				Identifier.parse(Json.readString(root.base) ?? '')
			)
			case 'bundle/selected_item': return new BundleSelectedItem()
			default:
				throw new Error(`Invalid item model type ${type}`)
		}
	}

	class Model extends ItemModel {
		constructor(
			private modelId: Identifier,
			private tints: ItemTint[]
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh{
			const model = resources.getBlockModel(this.modelId)
			if (!model) {
				throw new Error(`Model ${this.modelId} does not exist (trying to render ${item.toString()})`)
			}

			let tint = (i: number): Color => {
				if (i < this.tints.length) {
					return this.tints[i].getTint(item)
				} else {
					return [1, 1, 1]
				}
			}
			
			const mesh = model.getMesh(resources, Cull.none(), tint) 
			mesh.transform(model.getDisplayTransform(context.display_context ?? 'gui'))
			return mesh
		}

	}

	class Composite extends ItemModel {
		constructor(
			private models: ItemModel[]
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const mesh = new Mesh()
			this.models.forEach(model => mesh.merge(model.getMesh(item, resources, context)))	
			return mesh
		}
	}

	class Condition extends ItemModel {
		constructor(
			private property: (item: ItemStack, context: ItemRenderingContext) => boolean,
			private onTrue: ItemModel,
			private onFalse: ItemModel
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			return (this.property(item, context) ? this.onTrue : this.onFalse).getMesh(item, resources, context)
		}

		static propertyFromJson(root: {[x: string]: unknown}): (item: ItemStack, context: ItemRenderingContext) => boolean{
			const property = Json.readString(root.property)?.replace(/^minecraft:/, '')

			switch (property){
				case 'using_item':
				case 'fishing_rod/cast':
				case 'selected':
				case 'carried':
				case 'extended_view':
					return (item, context) => context[property] ?? false
				case 'bundle/has_selected_item':
					return (item, context) => (context['bundle/selected_item'] ?? -1) >= 0
				case 'broken': return (item, context) => {
					const damage = item.getComponent('damage', tag => tag.getAsNumber())
					const max_damage = item.getComponent('max_damage', tag => tag.getAsNumber())
					return (damage !== undefined && max_damage !== undefined && damage >= max_damage - 1)
				}
				case 'damaged': return (item, context) => {
						const damage = item.getComponent('damage', tag => tag.getAsNumber())
						const max_damage = item.getComponent('max_damage', tag => tag.getAsNumber())
						return (damage !== undefined && max_damage !== undefined && damage >= 1)
					}
				case 'has_component': 
					const componentId = Identifier.parse(Json.readString(root.component) ?? '')
					const ignore_default = Json.readBoolean(root.ignore_default) ?? false
					return (item, context) => item.hasComponent(componentId, !ignore_default)
				case 'keybind_down':
					const keybind = Json.readString(root.keybind) ?? ''
					return (item, context) => context.keybind_down?.includes(keybind) ?? false
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, context) => item.getComponent('custom_model_data', tag => {
						if (!tag.isCompound()) return false
						const flag = tag.getList('flags').getNumber(index)
						return flag !== undefined && flag !== 0
					}) ?? false // TODO: verify default
				default:
					throw new Error(`Invalid condition property ${property}`)
			}
		}		
	}

	class Select extends ItemModel {
		constructor(
			private property: (item: ItemStack, context: ItemRenderingContext) => string,
			private cases: Map<string, ItemModel>,
			private fallback?: ItemModel
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const value = this.property(item, context)
			return (this.cases.get(value) ?? this.fallback)?.getMesh(item, resources, context) ?? MISSING_MESH
		}

		static propertyFromJson(root: {[x: string]: unknown}): (item: ItemStack, context: ItemRenderingContext) => string{
			const property = Json.readString(root.property)?.replace(/^minecraft:/, '')

			switch (property){
				case 'main_hand':
					return (item, context) => context['main_hand'] ?? 'right'
				case 'display_context':
					return (item, context) => context['display_context'] ?? 'gui'
				case 'charge_type':
					const FIREWORK = Identifier.create('firework_rocket')
					return (item, context) => item.getComponent('charged_projectiles', tag => {
						if (!tag.isList() || tag.length === 0) {
							return 'none'
						}
						tag.filter(tag => {
							if (!tag.isCompound()) {
								return false
							} 
							return Identifier.parse(tag.getString('id')).equals(FIREWORK)
						}).length > 0 ? 'rocket' : 'arrow'
					}) ?? 'none'
				case 'trim_material':
					return (item, context) => item.getComponent('trim', tag => {
						if (!tag.isCompound()) {
							return undefined
						}
						return Identifier.parse(tag.getString('material')).toString()
					}) ?? '' // TODO: verify default value
				case 'block_state':
					const block_state_property = Json.readString(root.block_state_property) ?? ''
					return (item, context) => item.getComponent('block_state', tag => {
						if (!tag.isCompound()) {
							return undefined
						}
						return tag.getString(block_state_property)
					}) ?? '' // TODO: verify default value
				case 'local_time': return (item, context) => 'NOT IMPLEMENTED'
				case 'holder_type':
					return (item, context) => context.holder_type?.toString() ?? ''
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, context) => item.getComponent('custom_model_data', tag => {
						if (!tag.isCompound()) return undefined
						return tag.getList('strings').getString(index)
					}) ?? '' // TODO: verify default
				default:
					throw new Error(`Invalid select property ${property}`)
	
			}
		}
	}

	class RangeDispatch extends ItemModel {
		private entries: {threshold: number, model: ItemModel}[]

		constructor(
			private property: (item: ItemStack, context: ItemRenderingContext) => number,
			private scale: number,
			entries: {threshold: number, model: ItemModel}[],
			private fallback?: ItemModel
		) {
			super()
			this.entries = entries.sort((a, b) => a.threshold - b.threshold)
		}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const value = this.property(item, context) * this.scale
			let model = this.fallback
			for (const entry of this.entries) {
				if (entry.threshold <= value) {
					model = entry.model
				} else {
					break
				}
			}
			return model?.getMesh(item, resources, context) ?? MISSING_MESH
		}

		static propertyFromJson(root: {[x: string]: unknown}): (item: ItemStack, context: ItemRenderingContext) => number{
			const property = Json.readString(root.property)?.replace(/^minecraft:/, '')

			switch (property){	
				case 'bundle/fullness':
					function calculateBundleWeight(item: ItemStack): number{
						const bundle_contents = item.getComponent('bundle_contents', tag => {
							if (!tag.isListOrArray()) return undefined
							return tag.map(t => t.isCompound() ? ItemStack.fromNbt(t) : undefined)
						})
						if (bundle_contents === undefined) return 0
						return bundle_contents.reduce((weight, item) => {
							if (item === undefined) return weight
							if (item.hasComponent('bundle_contents')) return weight + calculateBundleWeight(item) + 1/16
							if (item.getComponent('bees', tag => tag.isListOrArray() && tag.length > 0)) return weight + 1
							return weight + item.count / (item.getComponent('max_stack_size', tag => tag.getAsNumber()) ?? 1)
						}, 0)
					}

					return (item, context) => calculateBundleWeight(item)
				case 'damage': {
					const normalize = Json.readBoolean(root.normalize) ?? true
					return (item, context) => {
						const damage = item.getComponent('damage', tag => tag.getAsNumber())
						const max_damage = item.getComponent('max_damage', tag => tag.getAsNumber())
						if (damage === undefined || max_damage === undefined) return 0 // TODO: verify default
						if (normalize) return clamp(damage / max_damage, 0, 1)
						return clamp(damage, 0, max_damage)
					}
				}
				case 'count': {
					const normalize = Json.readBoolean(root.normalize) ?? true
					return (item, context) => {
						const max_stack_size = item.getComponent('max_stack_size', tag => tag.getAsNumber()) ?? 1
						if (normalize) return clamp(item.count / max_stack_size, 0, 1)
						return clamp(item.count, 0, max_stack_size)
					}
				}
				case 'cooldown': return (item, context) => context.cooldown_normalized ?? 0 // TODO: verify default
				case 'time': return (item, context) => ((context.game_time ?? 0) % 24000) / 24000 // TODO: handle wobble, natural only?
				case 'compass': return (item, context) => context.compass_angle ?? 0 // TODO: calculate properly? handle wobble?
				case 'crossbow/pull': return (item, context) => context['crossbow/pull'] ?? 0 // TODO: verify default
				case 'use_duration':
					const remaining = Json.readBoolean(root.remaining) ?? true
					return (item, context) => {
						if (remaining) return (context.max_use_duration ?? 0) - (context.use_duration ?? 0)
						return context.use_duration ?? 0
					} // TODO: verify default
				case 'use_cycle':
					const period = Json.readNumber(root.period) ?? 1
					return (item, context) => {
						return ((context.max_use_duration ?? 0) - (context.use_duration ?? 0)) % period
					} // TODO: verify default
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, context) => item.getComponent('custom_model_data', tag => {
						if (!tag.isCompound()) return undefined
						return tag.getList('floats').getNumber(index)
					}) ?? 0 // TODO: verify default
				default:
					throw new Error(`Invalid select property ${property}`)
			}
		}
	}

	class Special extends ItemModel {
		constructor(
			private specialModel: SpecialModel,
			private base: Identifier
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const mesh = this.specialModel.getMesh(item, resources)
			const model = resources.getBlockModel(this.base)
			if (!model) {
				throw new Error(`Base model ${this.base} does not exist (trying to render ${item.toString()})`)
			}
			mesh.transform(model.getDisplayTransform(context.display_context ?? 'gui'))
			return mesh
		}
	}

	class BundleSelectedItem extends ItemModel {
		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const selectedItemIndex = context['bundle/selected_item']
			if (selectedItemIndex === undefined || selectedItemIndex < 0) return new Mesh()
			const selectedItem = item.getComponent('bundle_contents', tag => {
				if (!tag.isListOrArray()) return undefined
				const selectedItemTag = tag.get(selectedItemIndex)
				if (selectedItemTag === undefined || !selectedItemTag.isCompound()) return undefined
				return ItemStack.fromNbt(selectedItemTag)
			})
			
			return selectedItem !== undefined ? ItemRenderer.getItemMesh(selectedItem, resources, {...context, 'bundle/selected_item': undefined}) : new Mesh()
		}
	}
}

