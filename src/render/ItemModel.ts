import { BlockModelProvider, Cull, DefaultItemComponentProvider, Identifier, ItemRenderingContext, ItemStack, Json, Mesh, TextureAtlasProvider } from "../index.js"


export interface ItemModelProvider {
	getItemModel(id: Identifier): ItemModel | null
}

interface ItemModelResources extends BlockModelProvider, TextureAtlasProvider, DefaultItemComponentProvider {}

export abstract class ItemModel {

	public abstract getMesh(item: ItemStack, resources: ItemModelResources, context: ItemRenderingContext): Mesh

}

const MISSING_MESH: Mesh = new Mesh() ///TODO

export namespace ItemModel {
	export function fromJson(obj: unknown): ItemModel {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'model': return new ModelItemModel(
				Identifier.parse(Json.readString(root.model) ?? ''),
				// TODO model tints
			)
			case 'composite': return new CompositeItemModel(
				Json.readArray(root.models, ItemModel.fromJson) ?? []
			)
			case 'condition': return new ConditionItemModel(
				ConditionItemModel.propertyFromJson(root),
				ItemModel.fromJson(root.on_true),
				ItemModel.fromJson(root.on_false)
			)
			case 'select': return new SelectItemModel(
				SelectItemModel.propertyFromJson(root),
				new Map(Json.readArray(root.cases, caseObj => {
					const caseRoot = Json.readObject(caseObj) ?? {}
					return [Json.readString(caseRoot.when) ?? '', ItemModel.fromJson(caseRoot.model)]
				})),
				ItemModel.fromJson(root.fallback)
			)
			case 'range_dispatch':
			case 'special':
			case 'bundle/selected_item':
			default:
				throw new Error(`Invalid item model type ${type}`)
		}
	}

	class ModelItemModel extends ItemModel {
		constructor(
			private modelId: Identifier
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemModelResources, context: ItemRenderingContext): Mesh{
			const model = resources.getBlockModel(this.modelId)
			if (!model) {
				throw new Error(`Model ${this.modelId} does not exist (trying to render ${item.toString()})`)
			}
			let tint = undefined // TODO model tints
			const mesh = model.getMesh(resources, Cull.none()) 
			mesh.transform(model.getDisplayTransform(context.display_context ?? 'gui'))
			return mesh
		}
	}

	class CompositeItemModel extends ItemModel {
		constructor(
			private models: ItemModel[]
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemModelResources, context: ItemRenderingContext): Mesh {
			const mesh = new Mesh()
			this.models.forEach(model => mesh.merge(model.getMesh(item, resources, context)))	
			return mesh
		}
	}

	class ConditionItemModel extends ItemModel {
		constructor(
			private property: (item: ItemStack, context: ItemRenderingContext) => boolean,
			private onTrue: ItemModel,
			private onFalse: ItemModel
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemModelResources, context: ItemRenderingContext): Mesh {
			return (this.property(item, context) ? this.onTrue : this.onFalse).getMesh(item, resources, context)
		}

		static propertyFromJson(root: {[x: string]: unknown}): (item: ItemStack, context: ItemRenderingContext) => boolean{
			const property = Json.readString(root.property)?.replace(/^minecraft:/, '')

			switch (property){
				case 'using_item':
				case 'fishing_rod/cast':
				case 'bundle/has_selected_item':
				case 'xmas':
				case 'selected':
				case 'carried':
				case 'shift_down':					
					return (item, context) => context[property] ?? false
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
					return (item, context) => item.hasComponent(componentId)
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, context) => item.getComponent('custom_model_data', tag => {
						if (!tag.isCompound()) return false
						const flag = tag.getList('flags').get(index)?.getAsNumber()
						return flag !== undefined && flag !== 0
					}) ?? false
				default:
					throw new Error(`Invalid condition property ${property}`)
			}
		}		
	}

	class SelectItemModel extends ItemModel {
		constructor(
			private property: (item: ItemStack, context: ItemRenderingContext) => string,
			private cases: Map<string, ItemModel>,
			private fallback?: ItemModel
		) {
			super()
		}

		public getMesh(item: ItemStack, resources: ItemModelResources, context: ItemRenderingContext): Mesh {
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
					const block_state_property = Json.readString('block_state_property') ?? ''
					return (item, context) => item.getComponent('block_state', tag => {
						if (!tag.isCompound()) {
							return undefined
						}
						return tag.getString(block_state_property)
					}) ?? '' // TODO: verify default value
				case 'custom_model_data':
					const index = Json.readInt(root.index) ?? 0
					return (item, context) => item.getComponent('custom_model_data', tag => {
						if (!tag.isCompound()) return undefined
						return tag.getList('strings').getString(index)
					}) ?? ''
				default:
					throw new Error(`Invalid select property ${property}`)
	
			}
		}
	}
}