import type { vec3 } from 'gl-matrix'
import { mat4 } from 'gl-matrix'
import type { Identifier, StructureProvider } from '../core/index.js'
import { BlockState } from '../core/index.js'
import type { BlockDefinitionProvider } from './BlockDefinition.js'
import type { BlockModelProvider } from './BlockModel.js'
import { ChunkBuilder } from './ChunkBuilder.js'
import { Renderer } from './Renderer.js'
import { ShaderProgram } from './ShaderProgram.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'
import { createBuffer } from './Util.js'

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




type GridBuffers = {
	position: WebGLBuffer,
	color: WebGLBuffer,
	length: number,
}

type BlockFlags = {
	opaque?: boolean,
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

	private gridBuffers: GridBuffers
	private readonly outlineBuffers: GridBuffers
	private invisibleBlockBuffers: GridBuffers | undefined
	private readonly atlasTexture: WebGLTexture
	private readonly useInvisibleBlockBuffer: boolean

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
		this.useInvisibleBlockBuffer = options?.useInvisibleBlockBuffer ?? true

		this.gridShaderProgram = new ShaderProgram(gl, vsGrid, fsGrid).getProgram()
		this.colorShaderProgram = new ShaderProgram(gl, vsColor, fsColor).getProgram()

		this.gridBuffers = this.getGridBuffers()
		this.outlineBuffers = this.getOutlineBuffers()
		this.invisibleBlockBuffers = this.getInvisibleBlockBuffers()
		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setStructure(structure: StructureProvider) {
		this.structure = structure
		this.chunkBuilder.setStructure(structure)
		this.gridBuffers = this.getGridBuffers()
		this.invisibleBlockBuffers = this.getInvisibleBlockBuffers()
	}

	public updateStructureBuffers(chunkPositions?: vec3[]): void {
		this.chunkBuilder.updateStructureBuffers(chunkPositions)
	}

	private getGridBuffers(): GridBuffers {
		const [X, Y, Z] = this.structure.getSize()
		const position: number[] = []
		const color: number[] = []

		position.push(0, 0, 0, X, 0, 0)
		color.push(1, 0, 0, 1, 0, 0)

		position.push(0, 0, 0, 0, 0, Z)
		color.push(0, 0, 1, 0, 0, 1)

		position.push(0, 0, 0, 0, Y, 0)
		position.push(X, 0, 0, X, Y, 0)
		position.push(0, 0, Z, 0, Y, Z)
		position.push(X, 0, Z, X, Y, Z)

		position.push(0, Y, 0, 0, Y, Z)
		position.push(X, Y, 0, X, Y, Z)
		position.push(0, Y, 0, X, Y, 0)
		position.push(0, Y, Z, X, Y, Z)

		for (let x = 1; x <= X; x += 1) position.push(x, 0, 0, x, 0, Z)
		for (let z = 1; z <= Z; z += 1) position.push(0, 0, z, X, 0, z)
		for (let i = 0; i < 8 + X + Z; i += 1) color.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8)

		return {
			position: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(position)),
			color: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(color)),
			length: position.length / 3,
		}
	}

	private getOutlineBuffers(): GridBuffers {
		const position: number[] = []
		const color: number[] = []

		this.addCube(position, color, [1, 1, 1], [0, 0, 0], [1, 1, 1])

		return {
			position: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(position)),
			color: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(color)),
			length: position.length / 3,
		}
	}

	private getInvisibleBlockBuffers(): GridBuffers | undefined {
		if (!this.useInvisibleBlockBuffer)
			return undefined

		const size = this.structure.getSize()
		const position: number[] = []
		const color: number[] = []

		for (let x = 0; x < size[0]; x += 1) {
			for (let y = 0; y < size[1]; y += 1) {
				for (let z = 0; z < size[2]; z += 1) {
					const block = this.structure.getBlock([x, y, z])
					if (block === undefined)
						continue
					if (block === null) {
						this.addCube(position, color, [1, 0.25, 0.25], [x + 0.4375, y + 0.4375, z + 0.4375], [x + 0.5625, y + 0.5625, z + 0.5625])
					} else if (block.state.is(BlockState.AIR)) {
						this.addCube(position, color, [0.5, 0.5, 1], [x + 0.375, y + 0.375, z + 0.375], [x + 0.625, y + 0.625, z + 0.625])
					} else if (block.state.is(new BlockState('cave_air'))) {
						this.addCube(position, color, [0.5, 1, 0.5], [x + 0.375, y + 0.375, z + 0.375], [x + 0.625, y + 0.625, z + 0.625])
					} 
				}
			}
		}

		return {
			position: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(position)),
			color: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(color)),
			length: position.length / 3,
		}
	}

	private addCube(positions: number[], colors: number[], color: number[], a: number[], b: number[]) {
		positions.push(a[0], a[1], a[2], a[0], a[1], b[2])
		positions.push(b[0], a[1], a[2], b[0], a[1], b[2])
		positions.push(a[0], a[1], a[2], b[0], a[1], a[2])
		positions.push(a[0], a[1], b[2], b[0], a[1], b[2])

		positions.push(a[0], a[1], a[2], a[0], b[1], a[2])
		positions.push(b[0], a[1], a[2], b[0], b[1], a[2])
		positions.push(a[0], a[1], b[2], a[0], b[1], b[2])
		positions.push(b[0], a[1], b[2], b[0], b[1], b[2])

		positions.push(a[0], b[1], a[2], a[0], b[1], b[2])
		positions.push(b[0], b[1], a[2], b[0], b[1], b[2])
		positions.push(a[0], b[1], a[2], b[0], b[1], a[2])
		positions.push(a[0], b[1], b[2], b[0], b[1], b[2])

		for (let i = 0; i < 24; i += 1) colors.push(...color)
	}

	public drawGrid(viewMatrix: mat4) {
		this.setShader(this.gridShaderProgram)
		this.prepareDraw(viewMatrix)

		this.setVertexAttr('vertPos', 3, this.gridBuffers.position)
		this.setVertexAttr('vertColor', 3, this.gridBuffers.color)

		this.gl.drawArrays(this.gl.LINES, 0, this.gridBuffers.length)
	}

	public drawInvisibleBlocks(viewMatrix: mat4) {
		if (!this.useInvisibleBlockBuffer)
			return
		this.setShader(this.gridShaderProgram)
		this.prepareDraw(viewMatrix)

		this.setVertexAttr('vertPos', 3, this.invisibleBlockBuffers!.position)
		this.setVertexAttr('vertColor', 3, this.invisibleBlockBuffers!.color)

		this.gl.drawArrays(this.gl.LINES, 0, this.invisibleBlockBuffers!.length)
	}

	public drawStructure(viewMatrix: mat4) {
		this.setShader(this.shaderProgram)
		this.setTexture(this.atlasTexture)
		this.prepareDraw(viewMatrix)

		this.chunkBuilder.getBuffers().forEach(buffer => {
			this.drawBuffers(buffer)
		})
	}

	public drawColoredStructure(viewMatrix: mat4) {
		this.setShader(this.colorShaderProgram)
		this.prepareDraw(viewMatrix)

		this.chunkBuilder.getBuffers().forEach(buffer => {
			this.setVertexAttr('vertPos', 3, buffer.position)
			this.setVertexAttr('blockPos', 3, buffer.blockPos)
			this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.index)

			this.gl.drawElements(this.gl.TRIANGLES, buffer.length, this.gl.UNSIGNED_SHORT, 0)
		})
	}

	public drawOutline(viewMatrix: mat4, pos: vec3) {
		this.setShader(this.gridShaderProgram)

		const translatedMatrix = mat4.create()
		mat4.copy(translatedMatrix, viewMatrix)
		mat4.translate(translatedMatrix, translatedMatrix, pos)
		this.prepareDraw(translatedMatrix)

		this.setVertexAttr('vertPos', 3, this.outlineBuffers.position)
		this.setVertexAttr('vertColor', 3, this.outlineBuffers.color)

		this.gl.drawArrays(this.gl.LINES, 0, this.outlineBuffers.length)
	}
}
