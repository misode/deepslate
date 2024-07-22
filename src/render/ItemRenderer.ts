import { mat4 } from 'gl-matrix'
import { Identifier } from '../core/index.js'
import { ItemStack } from '../core/ItemStack.js'
import { Cull, SpecialRenderers, type Color } from '../index.js'
import type { BlockModelProvider } from './BlockModel.js'
import { getItemColor } from './ItemColors.js'
import type { Mesh } from './Mesh.js'
import { Renderer } from './Renderer.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

interface ModelRendererOptions {
	/** Force the tint index of the item */
	tint?: Color,
}

interface ItemRendererResources extends BlockModelProvider, TextureAtlasProvider {}

export class ItemRenderer extends Renderer {
	private item: ItemStack
	private mesh: Mesh
	private readonly tint: Color | ((index: number) => Color) | undefined
	private readonly atlasTexture: WebGLTexture

	constructor(
		gl: WebGLRenderingContext,
		item: Identifier | ItemStack,
		private readonly resources: ItemRendererResources,
		options?: ModelRendererOptions,
	) {
		super(gl)
		this.item = item instanceof ItemStack ? item : new ItemStack(item, 1)
		this.mesh = this.getItemMesh()
		this.tint = options?.tint
		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setItem(item: Identifier | ItemStack) {
		this.item = item instanceof ItemStack ? item : new ItemStack(item, 1)
		this.mesh = this.getItemMesh()
	}

	private getItemMesh() {
		const model = this.resources.getBlockModel(this.item.id.withPrefix('item/'))
		if (!model) {
			throw new Error(`Item model for ${this.item.toString()} does not exist`)
		}
		let tint = this.tint
		if (!tint && this.item.id.namespace === Identifier.DEFAULT_NAMESPACE) {
			tint = getItemColor(this.item)
		}
		const mesh = model.getMesh(this.resources, Cull.none(), tint)
		if (SpecialRenderers.has(this.item.id.toString(), {})) {
			const specialMesh = SpecialRenderers.mesh(this.item.id.toString(), {}, this.resources, Cull.none())
			// undo the scaling done by the special renderer
			const t = mat4.create()
			mat4.identity(t)
			mat4.scale(t, t, [16, 16, 16])
			specialMesh.transform(t)
			mesh.merge(specialMesh)
		}
		mesh.transform(model.getDisplayTransform('gui'))
		mesh.quads.forEach(q => {
			const normal = q.normal()
			q.forEach(v => v.normal = normal)
		})
		mesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true })
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
