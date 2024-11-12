import { mat4 } from 'gl-matrix'
import { DefaultItemComponentProvider, ItemStack } from '../core/ItemStack.js'
import { Identifier } from '../core/index.js'
import type { BlockModelProvider, Display } from './BlockModel.js'
import { ItemModelProvider } from './ItemModel.js'
import { Mesh } from './Mesh.js'
import { Renderer } from './Renderer.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

interface ModelRendererOptions {
}

interface ItemRendererResources extends BlockModelProvider, TextureAtlasProvider, ItemModelProvider, DefaultItemComponentProvider {}

export type ItemRenderingContext = {
	display_context?: Display,

	using_item?: boolean,
	'fishing_rod/cast'?: boolean,
	'bundle/has_selected_item'?: boolean,
	xmas?: boolean,
	selected?: boolean,
	carried?: boolean,
	shift_down?: boolean,

	main_hand?: 'left' | 'right',

	cooldown_normalized?: number,
	game_time?: number,
	compass_angle?: number,
	use_duration?: number,
	max_use_duration?: number,
	'crossbow/pull'?: number
}

export class ItemRenderer extends Renderer {
	private item: ItemStack
	private mesh: Mesh
	private readonly atlasTexture: WebGLTexture


	constructor(
		gl: WebGLRenderingContext,
		item: Identifier | ItemStack,
		private readonly resources: ItemRendererResources,
		options?: ModelRendererOptions,
	) {
		super(gl)
		this.item = item instanceof ItemStack ? item : new ItemStack(item, 1, new Map(), this.resources)
		this.mesh = this.getItemMesh()
		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setItem(item: Identifier | ItemStack) {
		this.item = item instanceof ItemStack ? item : new ItemStack(item, 1, new Map(), this.resources)
		this.mesh = this.getItemMesh()
	}

	private getItemMesh(context: ItemRenderingContext = {}) {
		const itemModelId = this.item.getComponent('item_model', tag => tag.getAsString())
		if (itemModelId === undefined){
			throw new Error(`Item ${this.item.toString()} does not have item_model component`)
		}

		const itemModel = this.resources.getItemModel(Identifier.parse(itemModelId))
		if (!itemModel) {
			throw new Error(`Item model ${itemModelId} does not exist (defined by item ${this.item.toString()})`)
		}

		return itemModel.getMesh(this.item, this.resources, context)

/*
		const model = this.resources.getBlockModel(this.item.id.withPrefix('item/'))
		if (!model) {
			throw new Error(`Item model for ${this.item.toString()} does not exist`)
		}
		let tint = this.tint
		if (!tint && this.item.id.namespace === Identifier.DEFAULT_NAMESPACE) {
			tint = getItemColor(this.item)
		}
		const mesh = model.getMesh(this.resources, Cull.none(), tint)
		const specialMesh = SpecialRenderers.getItemMesh(this.item, this.resources)
		mesh.merge(specialMesh)
		mesh.transform(model.getDisplayTransform('gui'))
		mesh.computeNormals()
		mesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true })
		return mesh
		*/
	}

	protected override getPerspective() {
		const projMatrix = mat4.create()
		mat4.ortho(projMatrix, 0, 16, 0, 16, 0.1, 500.0)
		return projMatrix
	}

	public drawItem() {
		const view = mat4.create()
		mat4.translate(view, view, [0, 0, -32])

		this.setShader(this.shaderProgram)
		this.setTexture(this.atlasTexture)
		this.prepareDraw(view)
		this.drawMesh(this.mesh, { pos: true, color: true, texture: true, normal: true })
	}
}
