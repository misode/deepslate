import { mat4 } from 'gl-matrix'
import { ItemStack } from '../core/ItemStack.js'
import { Identifier } from '../core/index.js'
import type { BlockModelProvider, Display } from './BlockModel.js'
import { ItemModelProvider } from './ItemModel.js'
import { Mesh } from './Mesh.js'
import { Renderer } from './Renderer.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

interface ModelRendererOptions {
}

export interface ItemRendererResources extends BlockModelProvider, TextureAtlasProvider, ItemModelProvider {}

export type ItemRenderingContext = {
	display_context?: Display,

	using_item?: boolean,
	'fishing_rod/cast'?: boolean,
	'bundle/has_selected_item'?: boolean,
	selected?: boolean,
	carried?: boolean,
	extended_view?: boolean,

	keybind_down?: string[],

	main_hand?: 'left' | 'right',
	local_time?: number, //milliseconds
	holder_type?: Identifier,

	cooldown_normalized?: number,
	game_time?: number,
	compass_angle?: number,
	use_duration?: number,
	max_use_duration?: number,
	'crossbow/pull'?: number
}

export class ItemRenderer extends Renderer {
	private mesh!: Mesh
	private readonly atlasTexture: WebGLTexture


	constructor(
		gl: WebGLRenderingContext,
		private item: ItemStack,
		private readonly resources: ItemRendererResources,
		options?: ModelRendererOptions,
	) {
		super(gl)
		this.updateMesh()
		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setItem(item: ItemStack) {
		this.item = item
		this.updateMesh()
	}

	private updateMesh() {
		this.mesh = ItemRenderer.getItemMesh(this.item, this.resources)
		this.mesh.computeNormals()
		this.mesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true })
	}

	public static getItemMesh(item: ItemStack, resources: ItemRendererResources, context: ItemRenderingContext = {}) {
		const itemModelId = item.getComponent('item_model', tag => tag.getAsString())
		if (itemModelId === undefined){
			return new Mesh()
		}

		const itemModel = resources.getItemModel(Identifier.parse(itemModelId))
		if (!itemModel) {
			throw new Error(`Item model ${itemModelId} does not exist (defined by item ${item.toString()})`)
		}

		const mesh = itemModel.getMesh(item, resources, context)

		return mesh

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
