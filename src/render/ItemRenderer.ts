import { mat4 } from 'gl-matrix'
import { Identifier } from '../core/index.js'
import { BlockColors } from './BlockColors.js'
import type { BlockModelProvider } from './BlockModel.js'
import type { RenderBuffers } from './Renderer.js'
import { Renderer } from './Renderer.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

interface ModelRendererOptions {
	/** Force the tint index of the item */
	tint?: number[],
}

interface ItemRendererResources extends BlockModelProvider, TextureAtlasProvider {}

export class ItemRenderer extends Renderer {
	private buffers: RenderBuffers
	private readonly tint: number[] | undefined
	private readonly atlasTexture: WebGLTexture

	constructor(
		gl: WebGLRenderingContext,
		private item: Identifier,
		private readonly resources: ItemRendererResources,
		options?: ModelRendererOptions,
	) {
		super(gl)
		this.buffers = this.getItemBuffers()
		this.tint = options?.tint
		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setItem(item: Identifier) {
		this.item = item
		this.buffers = this.getItemBuffers()
	}

	private getItemBuffers() {
		const model = this.resources.getBlockModel(this.item.withPrefix('item/'))
		if (!model) {
			throw new Error(`Item model for ${this.item.toString()} does not exist`)
		}
		let tint = this.tint
		if (!tint && this.item.namespace === Identifier.DEFAULT_NAMESPACE) {
			tint = BlockColors[this.item.path]?.({})
		}
		const buffers = model.getDisplayBuffers('gui', this.resources, 0, tint)
		console.log(buffers)

		return {
			position: this.createBuffer(this.gl.ARRAY_BUFFER, buffers.position),
			texCoord: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(buffers.texCoord)),
			tintColor: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(buffers.tintColor)),
			normal: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(buffers.normal)),
			index: this.createBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(buffers.index)),
			length: buffers.index.length,
		}
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
		this.drawBuffers(this.buffers)
	}
}
