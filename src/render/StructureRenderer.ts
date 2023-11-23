import type { vec3 } from 'gl-matrix'
import { mat4 } from 'gl-matrix'
import type { Identifier, StructureProvider } from '../core/index.js'
import { BlockState } from '../core/index.js'
import type { Color } from '../index.js'
import type { BlockDefinitionProvider } from './BlockDefinition.js'
import type { BlockModelProvider } from './BlockModel.js'
import { ChunkBuilder } from './ChunkBuilder.js'
import { Mesh } from './Mesh.js'
import { Renderer } from './Renderer.js'
import { ShaderProgram } from './ShaderProgram.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

const vsColor = `
  attribute vec4 vertPos;
  attribute vec3 blockPos;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec3 vColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = blockPos / 256.0;
  }
`

const fsColor = `
  precision highp float;
  varying highp vec3 vColor;

  void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
  }
`

const vsGrid = `
  attribute vec4 vertPos;
  attribute vec3 vertColor;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec3 vColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = vertColor;
  }
`

const fsGrid = `
  precision highp float;
  varying highp vec3 vColor;

  void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
  }
`

export type BlockFlags = {
	opaque?: boolean,
	semi_transparent?: boolean,
	self_culling?: boolean,
}

export interface BlockFlagsProvider {
	getBlockFlags(id: Identifier): BlockFlags | null
}

export interface BlockPropertiesProvider {
	getBlockProperties(id: Identifier): Record<string, string[]> | null
	getDefaultBlockProperties(id: Identifier): Record<string, string> | null
}

export interface Resources extends BlockDefinitionProvider, BlockModelProvider, TextureAtlasProvider, BlockFlagsProvider, BlockPropertiesProvider {}

interface StructureRendererOptions {
	facesPerBuffer?: number,
	chunkSize?: number,
	useInvisibleBlockBuffer?: boolean,
}

export class StructureRenderer extends Renderer {
	private readonly gridShaderProgram: WebGLProgram
	private readonly colorShaderProgram: WebGLProgram

	private gridMesh: Mesh = new Mesh()
	private readonly outlineMesh: Mesh = new Mesh()
	private invisibleBlocksMesh: Mesh = new Mesh()
	private readonly atlasTexture: WebGLTexture
	public useInvisibleBlocks: boolean

	private readonly chunkBuilder: ChunkBuilder

	constructor(
		gl: WebGLRenderingContext,
		private structure: StructureProvider,
		private readonly resources: Resources,
		options?: StructureRendererOptions,
	) {
		super(gl)

		const chunkSize = options?.chunkSize ?? 16

		this.chunkBuilder = new ChunkBuilder(gl, structure, resources, chunkSize)

		if (options?.facesPerBuffer){
			console.warn('[deepslate renderer warning]: facesPerBuffer option has been removed in favor of chunkSize')
		}
		this.useInvisibleBlocks = options?.useInvisibleBlockBuffer ?? true

		this.gridShaderProgram = new ShaderProgram(gl, vsGrid, fsGrid).getProgram()
		this.colorShaderProgram = new ShaderProgram(gl, vsColor, fsColor).getProgram()

		this.gridMesh = this.getGridMesh()
		this.outlineMesh = this.getOutlineMesh()
		this.invisibleBlocksMesh = this.getInvisibleBlocksMesh()
		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setStructure(structure: StructureProvider) {
		this.structure = structure
		this.chunkBuilder.setStructure(structure)
		this.gridMesh = this.getGridMesh()
		this.invisibleBlocksMesh = this.getInvisibleBlocksMesh()
	}

	public updateStructureBuffers(chunkPositions?: vec3[]): void {
		this.chunkBuilder.updateStructureBuffers(chunkPositions)
	}

	private getGridMesh(): Mesh {
		const [X, Y, Z] = this.structure.getSize()
		const mesh = new Mesh()

		mesh.addLine(0, 0, 0, X, 0, 0, [1, 0, 0])

		mesh.addLine(0, 0, 0, 0, 0, Z, [0, 0, 1])

		const c: Color = [0.8, 0.8, 0.8]
		mesh.addLine(0, 0, 0, 0, Y, 0, c)
		mesh.addLine(X, 0, 0, X, Y, 0, c)
		mesh.addLine(0, 0, Z, 0, Y, Z, c)
		mesh.addLine(X, 0, Z, X, Y, Z, c)

		mesh.addLine(0, Y, 0, 0, Y, Z, c)
		mesh.addLine(X, Y, 0, X, Y, Z, c)
		mesh.addLine(0, Y, 0, X, Y, 0, c)
		mesh.addLine(0, Y, Z, X, Y, Z, c)

		for (let x = 1; x <= X; x += 1) mesh.addLine(x, 0, 0, x, 0, Z, c)
		for (let z = 1; z <= Z; z += 1) mesh.addLine(0, 0, z, X, 0, z, c)

		return mesh.rebuild(this.gl, { pos: true, color: true })
	}

	private getOutlineMesh(): Mesh {
		return new Mesh()
			.addLineCube(0, 0, 0, 1, 1, 1, [1, 1, 1])
			.rebuild(this.gl, { pos: true, color: true })
	}

	private getInvisibleBlocksMesh(): Mesh {
		const mesh = new Mesh()
		if (!this.useInvisibleBlocks) {
			return mesh
		}

		const size = this.structure.getSize()

		for (let x = 0; x < size[0]; x += 1) {
			for (let y = 0; y < size[1]; y += 1) {
				for (let z = 0; z < size[2]; z += 1) {
					const block = this.structure.getBlock([x, y, z])
					if (block === undefined)
						continue
					if (block === null) {
						mesh.addLineCube(x + 0.4375, y + 0.4375, z + 0.4375, x + 0.5625, y + 0.5625, z + 0.5625, [1, 0.25, 0.25])
					} else if (block.state.is(BlockState.AIR)) {
						mesh.addLineCube(x + 0.375, y + 0.375, z + 0.375, x + 0.625, y + 0.625, z + 0.625, [0.5, 0.5, 1])
					} else if (block.state.is(new BlockState('cave_air'))) {
						mesh.addLineCube(x + 0.375, y + 0.375, z + 0.375, x + 0.625, y + 0.625, z + 0.625, [0.5, 1, 0.5])
					} 
				}
			}
		}

		return mesh.rebuild(this.gl, { pos: true, color: true })
	}

	public drawGrid(viewMatrix: mat4) {
		this.setShader(this.gridShaderProgram)
		this.prepareDraw(viewMatrix)

		this.drawMesh(this.gridMesh, { pos: true, color: true })
	}

	public drawInvisibleBlocks(viewMatrix: mat4) {
		if (!this.useInvisibleBlocks) {
			return
		}
		this.setShader(this.gridShaderProgram)
		this.prepareDraw(viewMatrix)

		this.drawMesh(this.invisibleBlocksMesh, { pos: true, color: true })
	}

	public drawStructure(viewMatrix: mat4) {
		this.setShader(this.shaderProgram)
		this.setTexture(this.atlasTexture)
		this.prepareDraw(viewMatrix)

		this.chunkBuilder.getMeshes().forEach(mesh => {
			this.drawMesh(mesh, { pos: true, color: true, texture: true, normal: true })
		})
	}

	public drawColoredStructure(viewMatrix: mat4) {
		this.setShader(this.colorShaderProgram)
		this.prepareDraw(viewMatrix)

		this.chunkBuilder.getMeshes().forEach(mesh => {
			this.drawMesh(mesh, { pos: true, color: true, normal: true, blockPos: true })
		})
	}

	public drawOutline(viewMatrix: mat4, pos: vec3) {
		this.setShader(this.gridShaderProgram)

		const translatedMatrix = mat4.create()
		mat4.copy(translatedMatrix, viewMatrix)
		mat4.translate(translatedMatrix, translatedMatrix, pos)
		this.prepareDraw(translatedMatrix)

		this.drawMesh(this.outlineMesh, { pos: true, color: true })
	}
}
