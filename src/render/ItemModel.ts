import type { ItemComponentsProvider } from '../core/index.js'
import { Identifier, ItemStack } from '../core/index.js'
import { clamp } from '../math/index.js'
import type { Color } from '../util/index.js'
import { Json } from '../util/index.js'
import { Cull } from './Cull.js'
import type { ItemRendererResources, ItemRenderingContext } from './ItemRenderer.js'
import { ItemRenderer } from './ItemRenderer.js'
import { ItemTint } from './ItemTint.js'
import { Mesh } from './Mesh.js'
import { SpecialModel } from './SpecialModel.js'

export interface ItemModelProvider {
	getItemModel(id: Identifier): ItemModel | null
}

export interface ItemModel {
	getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh
}

const MISSING_MESH: Mesh = new Mesh() ///TODO

export namespace ItemModel {
	export function fromJson(obj: unknown): ItemModel {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'empty': return new Empty()
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
				new Map(Json.readArray(root.cases, e => Json.readObject(e) ?? {})?.flatMap(caseRoot => {
					const model = ItemModel.fromJson(caseRoot.model)
					if (Array.isArray(caseRoot.when)) {
						return caseRoot.when.map(w => [Json.readString(w) ?? '', model])
					} else {
						return [[Json.readString(caseRoot.when) ?? '', model]]
					}
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
				console.warn(`[deepslate]: Unknown item model type '${type}'`)
				return { getMesh: () => new Mesh() }
		}
	}

	export class Empty {
		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			return new Mesh()
		}
	}

	export class Model {
		constructor(
			private readonly modelId: Identifier,
			private readonly tints: ItemTint[],
		) {}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const model = resources.getBlockModel(this.modelId)
			if (!model) {
				
				console.warn(`[deepslate]: Model '${this.modelId}' does not exist`)
				return new Mesh()
			}

			const tint = (i: number): Color => {
				if (i < this.tints.length) {
					return this.tints[i].getTint(item, resources, context)
				} else {
					return [1, 1, 1]
				}
			}
			
			const mesh = model.getMesh(resources, Cull.none(), tint) 
			mesh.transform(model.getDisplayTransform(context.display_context ?? 'gui'))
			return mesh
		}

	}

	export class Composite {
		constructor(
			private readonly models: ItemModel[],
		) {}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const mesh = new Mesh()
			this.models.forEach(model => mesh.merge(model.getMesh(item, resources, context)))	
			return mesh
		}
	}

	export class Condition {
		constructor(
			private readonly property: (item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext) => boolean,
			private readonly onTrue: ItemModel,
			private readonly onFalse: ItemModel,
		) {}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			return (this.property(item, resources, context) ? this.onTrue : this.onFalse).getMesh(item, resources, context)
		}

		static propertyFromJson(root: {[x: string]: unknown}): (item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext) => boolean {
			const property = Json.readString(root.property)?.replace(/^minecraft:/, '')

			switch (property){
				case 'fishing_rod/cast':
				case 'selected':
				case 'carried':
				case 'extended_view':
					return (item, resources, context) => context[property] ?? false
				case 'view_entity':
					return (item, resources, context) => context.context_entity_is_view_entity ?? false
				case 'using_item':
					return (item, resources, context) => (context.use_duration ?? -1) >= 0
				case 'bundle/has_selected_item':
					return (item, resources, context) => (context['bundle/selected_item'] ?? -1) >= 0
				case 'broken': return (item, resources, context) => {
					const damage = item.getComponent('damage', resources)?.getAsNumber()
					const max_damage = item.getComponent('max_damage', resources)?.getAsNumber()
					return (damage !== undefined && max_damage !== undefined && damage >= max_damage - 1)
				}
				case 'damaged': return (item, resources, context) => {
					const damage = item.getComponent('damage', resources)?.getAsNumber()
					const max_damage = item.getComponent('max_damage', resources)?.getAsNumber()
					return (damage !== undefined && max_damage !== undefined && damage >= 1)
				}
				case 'has_component': 
					const componentId = Identifier.parse(Json.readString(root.component) ?? '')
					const ignore_default = Json.readBoolean(root.ignore_default) ?? false
					return (item, resources, context) => item.hasComponent(componentId, ignore_default ? undefined : resources)
				case 'keybind_down':
					const keybind = Json.readString(root.keybind) ?? ''
					return (item, resources, context) => context.keybind_down?.includes(keybind) ?? false
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, resources, context) => {
						const tag = item.getComponent('custom_model_data', resources)
						if (!tag?.isCompound()) return false
						const flag = tag.getList('flags').getNumber(index)
						return flag !== undefined && flag !== 0
					}
				default:
					console.warn(`[deepslate]: Unknown condition property '${property}'`)
					return () => false
			}
		}		
	}

	export class Select {
		constructor(
			private readonly property: (item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext) => string | null,
			private readonly cases: Map<string, ItemModel>,
			private readonly fallback?: ItemModel,
		) {}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const value = this.property(item, resources, context)
			return ((value !== null ? this.cases.get(value) : undefined) ?? this.fallback)?.getMesh(item, resources, context) ?? MISSING_MESH
		}

		static propertyFromJson(root: {[x: string]: unknown}): (item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext) => string | null {
			const property = Json.readString(root.property)?.replace(/^minecraft:/, '')

			switch (property){
				case 'main_hand':
					return (item, resources, context) => context.main_hand ?? 'right'
				case 'display_context':
					return (item, resources, context) => context.display_context ?? 'gui'
				case 'context_dimension':
					return (item, resources, context) => context.context_dimension?.toString() ?? null
				case 'charge_type':
					const FIREWORK = Identifier.create('firework_rocket')
					return (item, resources, context) => {
						const tag = item.getComponent('charged_projectiles', resources)
						if (!tag?.isList() || tag.length === 0) {
							return 'none'
						}
						return tag.filter(tag => {
							if (!tag.isCompound()) {
								return false
							}
							return Identifier.parse(tag.getString('id')).equals(FIREWORK)
						}).length > 0 ? 'rocket' : 'arrow'
					}
				case 'trim_material':
					return (item, resources, context) => {
						const tag = item.getComponent('trim', resources)
						if (!tag?.isCompound()) {
							return null
						}
						return Identifier.parse(tag.getString('material')).toString()
					}
				case 'block_state':
					const block_state_property = Json.readString(root.block_state_property) ?? ''
					return (item, resources, context) => {
						const tag = item.getComponent('block_state', resources)
						if (!tag?.isCompound()) {
							return null
						}
						return tag.getString(block_state_property)
					}
				case 'local_time': return (item, resources, context) => 'NOT IMPLEMENTED'
				case 'context_entity_type':
					return (item, resources, context) => context.context_entity_type?.toString() ?? null
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, resources, context) => {
						const tag = item.getComponent('custom_model_data', resources)
						if (!tag?.isCompound()) {
							return null
						}
						const list = tag.getList('strings')
						if (list.length <= index) {
							return null
						}
						return list.getString(index)
					}
				default:
					console.warn(`[deepslate]: Unknown select property '${property}'`)
					return () => null
	
			}
		}
	}

	export class RangeDispatch {
		private readonly entries: {threshold: number, model: ItemModel}[]

		constructor(
			private readonly property: (item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext) => number,
			private readonly scale: number,
			entries: {threshold: number, model: ItemModel}[],
			private readonly fallback?: ItemModel,
		) {
			this.entries = entries.sort((a, b) => a.threshold - b.threshold)
		}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const value = this.property(item, resources, context) * this.scale
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

		static propertyFromJson(root: {[x: string]: unknown}): (item: ItemStack, resources: ItemComponentsProvider, context: ItemRenderingContext) => number {
			const property = Json.readString(root.property)?.replace(/^minecraft:/, '')

			switch (property){	
				case 'bundle/fullness':
					function calculateBundleWeight(item: ItemStack, resources: ItemComponentsProvider): number {
						const tag = item.getComponent('bundle_contents', resources)
						if (!tag?.isListOrArray()) {
							return 0
						}
						const items = tag.map(t => t.isCompound() ? ItemStack.fromNbt(t) : undefined)
						return items.reduce((weight, item) => {
							if (item === undefined) {
								return weight
							}
							if (item.hasComponent('bundle_contents', resources)) {
								return weight + calculateBundleWeight(item, resources) + 1/16
							}
							const beesTag = item.getComponent('bees', resources)
							if (beesTag?.isListOrArray() && beesTag.length > 0) {
								return weight + 1
							}
							const maxStackSize = item.getComponent('max_stack_size', resources)?.getAsNumber() ?? 1
							return weight + item.count / maxStackSize
						}, 0)
					}

					return (item, resources, context) => calculateBundleWeight(item, resources)
				case 'damage': {
					const normalize = Json.readBoolean(root.normalize) ?? true
					return (item, resources, context) => {
						const maxDamage = item.getComponent('max_damage', resources)?.getAsNumber() ?? 0
						const damage = clamp(item.getComponent('damage', resources)?.getAsNumber() ?? 0, 0, maxDamage)
						if (normalize) return clamp(damage / maxDamage, 0, 1)
						return clamp(damage, 0, maxDamage)
					}
				}
				case 'count': {
					const normalize = Json.readBoolean(root.normalize) ?? true
					return (item, resources, context) => {
						const maxStackSize = item.getComponent('max_stack_size', resources)?.getAsNumber() ?? 1
						if (normalize) return clamp(item.count / maxStackSize, 0, 1)
						return clamp(item.count, 0, maxStackSize)
					}
				}
				case 'cooldown': return (item, resources, context) => {
					const tag = item.getComponent('use_cooldown', resources)
					const cooldownGroup = tag?.isCompound()
						? Identifier.parse(tag.getString('cooldown_group') ?? item.id)
						: item.id
					return context.cooldown_percentage?.[cooldownGroup.toString()] ?? 0
				}
				case 'time': 
					const source = Json.readString(root.source) ?? 'daytime'
					switch (source) {
						case 'moon_phase': return (item, resources, context) => ((context.game_time ?? 0) / 24000 % 8) / 8
						case 'random': return (item, resources, context) => Math.random()
						default: return (item, resources, context) => {
							const gameTime = context.game_time ?? 0
							const linearTime = ((gameTime / 24000.0) % 1) - 0.25
							const cosTime = 0.5 - Math.cos(linearTime * Math.PI) / 2.0
							return (linearTime * 2.0 + cosTime) / 3
						}
					}
				case 'compass': return (item, resources, context) => context.compass_angle ?? 0 // TODO: calculate properly?
				case 'crossbow/pull': return (item, resources, context) => context['crossbow/pull'] ?? 0
				case 'use_duration':
					const remaining = Json.readBoolean(root.remaining) ?? true
					return (item, resources, context) => {
						if (context.use_duration === undefined || context.use_duration < 0) return 0
						if (remaining) return Math.max((context.max_use_duration ?? 0) - (context.use_duration), 0)
						return context.use_duration
					}
				case 'use_cycle':
					const period = Json.readNumber(root.period) ?? 1
					return (item, resources, context) => {
						if (context.use_duration === undefined || context.use_duration < 0) return 0
						return Math.max((context.max_use_duration ?? 0) - (context.use_duration ?? 0), 0) % period
					}
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, resources, context) => {
						const tag = item.getComponent('custom_model_data', resources)
						if (!tag?.isCompound()) {
							return 0
						}
						return tag.getList('floats').getNumber(index)
					}
				default:
					console.warn(`[deepslate]: Unknown range dispatch property '${property}'`)
					return () => 0
			}
		}
	}

	export class Special {
		constructor(
			private readonly specialModel: SpecialModel,
			private readonly base: Identifier,
		) {}

		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const mesh = this.specialModel.getMesh(item, resources)
			const model = resources.getBlockModel(this.base)
			if (!model) {
				console.warn(`[deepslate]: Special model base '${this.base}' does not exist`)
				return new Mesh()
			}
			mesh.transform(model.getDisplayTransform(context.display_context ?? 'gui'))
			return mesh
		}
	}

	export class BundleSelectedItem {
		public getMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext): Mesh {
			const selectedItemIndex = context['bundle/selected_item']
			if (selectedItemIndex === undefined || selectedItemIndex < 0) return new Mesh()
			const tag = item.getComponent('bundle_contents', resources)
			if (!tag?.isListOrArray()) {
				return new Mesh()
			}
			const selectedItemTag = tag.get(selectedItemIndex)
			if (selectedItemTag === undefined || !selectedItemTag.isCompound()) {
				return new Mesh()
			}
			const selectedItem = ItemStack.fromNbt(selectedItemTag)
			return ItemRenderer.getItemMesh(selectedItem, resources, {
				...context,
				'bundle/selected_item': -1,
				selected: false,
				carried: false,
				use_duration: -1,
			})
		}
	}
}
