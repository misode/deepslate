import { mat4, vec3 } from 'gl-matrix'
import { Identifier } from '../core/index.js'
import { BlockColors } from './BlockColors.js'
import type { BlockModelProvider } from './BlockModel.js'
import { Cull } from './Cull.js'
import type { RenderBuffers } from './Renderer.js'
import { Renderer } from './Renderer.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'
import { transformVectors } from './Util.js'

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
		const buffers = model.getBuffers(this.resources, 0, Cull.none(), tint)

		const t = mat4.create()
		mat4.identity(t)
		mat4.scale(t, t, [0.0625, 0.0625, 0.0625])
		transformVectors(buffers.position, t)

		const normals = []
		for (let i = 0; i < buffers.position.length; i += 12) {
			const a = vec3.fromValues(buffers.position[i], buffers.position[i + 1], buffers.position[i + 2])
			const b = vec3.fromValues(buffers.position[i + 3], buffers.position[i + 4], buffers.position[i + 5])
			const c = vec3.fromValues(buffers.position[i + 6], buffers.position[i + 7], buffers.position[i + 8])
			vec3.subtract(b, b, a)
			vec3.subtract(c, c, a)
			vec3.cross(b, b, c)
			vec3.normalize(b, b)
			normals.push(...b, ...b, ...b, ...b)
		}
		return {
			position: this.createBuffer(this.gl.ARRAY_BUFFER, buffers.position),
			texCoord: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(buffers.texCoord)),
			tintColor: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(buffers.tintColor)),
			normal: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(normals)),
			index: this.createBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(buffers.index)),
			length: buffers.index.length,
		}
	}

	protected override getPerspective() {
		const projMatrix = mat4.create()
		mat4.ortho(projMatrix, -1, 1, -1, 1, 0.1, 500.0)
		return projMatrix
	}

	public drawItem() {
		// TODO: use item model display
		const view = mat4.create()
		mat4.translate(view, view, [0, 0, -10])
		mat4.rotate(view, view, Math.PI/6, [1, 0, 0])
		mat4.rotate(view, view, 3*Math.PI/4, [0, 1, 0])
		mat4.translate(view, view, [-1 / 2, -1 / 2, -1 / 2])

		this.setShader(this.shaderProgram)
		this.setTexture(this.atlasTexture)
		this.prepareDraw(view)
		this.drawBuffers(this.buffers)
	}
}
