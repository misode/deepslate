import { mat4, vec3 } from 'gl-matrix'
import type { Identifier, PlacedBlock, StructureProvider } from '../core/index.js'
import { BlockPos, BlockState, Direction } from '../core/index.js'
import type { BlockDefinitionProvider } from './BlockDefinition.js'
import type { BlockModelProvider } from './BlockModel.js'
import type { RenderBuffers } from './Renderer.js'
import { Renderer } from './Renderer.js'
import { ShaderProgram } from './ShaderProgram.js'
import { SpecialRenderer, SpecialRenderers } from './SpecialRenderer.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'
import { mergeFloat32Arrays, transformVectors } from './Util.js'

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

interface ChunkRenderBuffers extends RenderBuffers {
	blockPos: WebGLBuffer,
}

interface RenderChunk {
	positions: Float32Array[],
	textureCoordinates: number[],
	tintColors: number[],
	normals: number[],
	blockPositions: number[],
	indices: number[],
	indexOffset: number,
	buffer?: ChunkRenderBuffers,
}

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
	private readonly chunkSize: number

	private readonly gridShaderProgram: WebGLProgram
	private readonly colorShaderProgram: WebGLProgram
	
	private chunks: RenderChunk[][][] = []

	private gridBuffers: GridBuffers
	private readonly outlineBuffers: GridBuffers
	private invisibleBlockBuffers: GridBuffers | undefined
	private readonly atlasTexture: WebGLTexture
	private readonly useInvisibleBlockBuffer: boolean

	constructor(
		gl: WebGLRenderingContext,
		private structure: StructureProvider,
		private readonly resources: Resources,
		options?: StructureRendererOptions,
	) {
		super(gl)

		this.chunkSize = options?.chunkSize ?? 16
		if (options?.facesPerBuffer){
			console.warn('[deepslate renderer warning]: facesPerBuffer option has been removed in favor of chunkSize')
		}
		this.useInvisibleBlockBuffer = options?.useInvisibleBlockBuffer ?? true

		this.gridShaderProgram = new ShaderProgram(gl, vsGrid, fsGrid).getProgram()
		this.colorShaderProgram = new ShaderProgram(gl, vsColor, fsColor).getProgram()

		this.updateStructureBuffers()
		this.gridBuffers = this.getGridBuffers()
		this.outlineBuffers = this.getOutlineBuffers()
		this.invisibleBlockBuffers = this.getInvisibleBlockBuffers()
		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setStructure(structure: StructureProvider) {
		this.structure = structure
		this.updateStructureBuffers()
		this.gridBuffers = this.getGridBuffers()
		this.invisibleBlockBuffers = this.getInvisibleBlockBuffers()
	}
	private getChunk(chunkPos: vec3): RenderChunk{
		const x = Math.abs(chunkPos[0]) * 2 + (chunkPos[0] < 0 ? 1 : 0)
		const y = Math.abs(chunkPos[1]) * 2 + (chunkPos[1] < 0 ? 1 : 0)
		const z = Math.abs(chunkPos[2]) * 2 + (chunkPos[2] < 0 ? 1 : 0)

		if (!this.chunks[x])
			this.chunks[x] = []
		if (!this.chunks[x][y])
			this.chunks[x][y] = []
		if (!this.chunks[x][y][z])
			this.chunks[x][y][z] = {
				positions: [],
				textureCoordinates: [],
				tintColors: [],
				blockPositions: [],
				normals: [],
				indices: [],
				indexOffset: 0,
			}

		return this.chunks[x][y][z]
	}  

	public updateStructureBuffers(chunkPositions?: vec3[]): void {

		const pushBuffers = (buffers: any, pos: vec3, chunk: RenderChunk) => {
			const t = mat4.create()
			mat4.translate(t, t, pos)
			transformVectors(buffers.position, t)

			chunk.positions.push(buffers.position)
			chunk.textureCoordinates.push(...buffers.texCoord)
			chunk.tintColors.push(...buffers.tintColor)
			for (let i = 0; i < buffers.position.length; i += 12) {
				const a = vec3.fromValues(buffers.position[i], buffers.position[i + 1], buffers.position[i + 2])
				const b = vec3.fromValues(buffers.position[i + 3], buffers.position[i + 4], buffers.position[i + 5])
				const c = vec3.fromValues(buffers.position[i + 6], buffers.position[i + 7], buffers.position[i + 8])
				vec3.subtract(b, b, a)
				vec3.subtract(c, c, a)
				vec3.cross(b, b, c)
				vec3.normalize(b, b)
				chunk.normals.push(...b, ...b, ...b, ...b)
			}
			for (let i = 0; i < buffers.texCoord.length / 2; i += 1) {
				chunk.blockPositions.push(...pos)
			}
			chunk.indices.push(...buffers.index)
			chunk.indexOffset += buffers.texCoord.length / 2
		}

		const resetChunk = (chunk: RenderChunk) => {
			chunk.positions = []
			chunk.textureCoordinates = []
			chunk.tintColors = []
			chunk.blockPositions = []
			chunk.normals = []
			chunk.indices = []
			chunk.indexOffset = 0
		}

		const refreshBuffer = (chunk: RenderChunk) => {
			if (chunk.buffer) {
				this.updateBuffer(chunk.buffer.position, this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...chunk.positions))
				this.updateBuffer(chunk.buffer.texCoord, this.gl.ARRAY_BUFFER, new Float32Array(chunk.textureCoordinates)),
				this.updateBuffer(chunk.buffer.tintColor, this.gl.ARRAY_BUFFER, new Float32Array(chunk.tintColors)),
				this.updateBuffer(chunk.buffer.normal, this.gl.ARRAY_BUFFER, new Float32Array(chunk.normals)),
				this.updateBuffer(chunk.buffer.blockPos, this.gl.ARRAY_BUFFER, new Float32Array(chunk.blockPositions)),
				this.updateBuffer(chunk.buffer.index, this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(chunk.indices)),
				chunk.buffer.length = chunk.indices.length
			} else {
				chunk.buffer = {
					position: this.createBuffer(this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...chunk.positions)),
					texCoord: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(chunk.textureCoordinates)),
					tintColor: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(chunk.tintColors)),
					blockPos: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(chunk.blockPositions)),
					normal: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(chunk.normals)),
					index: this.createBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(chunk.indices)),
					length: chunk.indices.length,
				}
			}
		}

		if (!chunkPositions){
			this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
				resetChunk(chunk)
			})))
		} else { 
			chunkPositions.forEach(chunkPos => {
				const chunk = this.getChunk(chunkPos)
				resetChunk(chunk)
			})
		}

		let buffers
		for (const b of this.structure.getBlocks()) {
			const blockName = b.state.getName()
			const blockProps = b.state.getProperties()
			const defaultProps = this.resources.getDefaultBlockProperties(blockName) ?? {}
			Object.entries(defaultProps).forEach(([k, v]) => {
				if (!blockProps[k]) blockProps[k] = v
			})

			const chunkPos: vec3 = [Math.floor(b.pos[0]/this.chunkSize), Math.floor(b.pos[1]/this.chunkSize), Math.floor(b.pos[2]/this.chunkSize)]

			if (chunkPositions && !chunkPositions.some(pos => vec3.equals(pos, chunkPos)))
				continue

			const chunk = this.getChunk(chunkPos)

			try {
				const blockDefinition = this.resources.getBlockDefinition(blockName)
				const cull = {
					up: this.needsCull(b, Direction.UP),
					down: this.needsCull(b, Direction.DOWN),
					west: this.needsCull(b, Direction.WEST),
					east: this.needsCull(b, Direction.EAST),
					north: this.needsCull(b, Direction.NORTH),
					south: this.needsCull(b, Direction.SOUTH),
				}
				if (blockDefinition) {
					buffers = blockDefinition.getBuffers(blockName, blockProps, this.resources, this.resources, chunk.indexOffset, cull)
					pushBuffers(buffers, b.pos, chunk)
				}
				if (SpecialRenderers.has(blockName.toString())) {
					buffers = SpecialRenderer[blockName.toString()](chunk.indexOffset, blockProps, this.resources, cull)
					pushBuffers(buffers, b.pos, chunk)
				}
			} catch(e) {
				console.error(`Error rendering block ${blockName}`, e)
			}
		}

		if (!chunkPositions){
			this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
				refreshBuffer(chunk)
			})))
		} else {
			chunkPositions.forEach(chunkPos => {
				const chunk = this.getChunk(chunkPos)
				refreshBuffer(chunk)
			})
		}
	}

	private needsCull(block: PlacedBlock, dir: Direction) {
		const neighbor = this.structure.getBlock(BlockPos.towards(block.pos, dir))?.state
		if (!neighbor) return false
		if (this.resources.getBlockFlags(neighbor.getName())?.opaque) {
			return !(dir === Direction.UP && block.state.isFluid())
		} else {
			return block.state.isFluid() && neighbor.isFluid()
		}
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
			position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(position)),
			color: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color)),
			length: position.length / 3,
		}
	}

	private getOutlineBuffers(): GridBuffers {
		const position: number[] = []
		const color: number[] = []

		this.addCube(position, color, [1, 1, 1], [0, 0, 0], [1, 1, 1])

		return {
			position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(position)),
			color: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color)),
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
			position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(position)),
			color: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color)),
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

		this.chunks.forEach(x => {
			x.forEach(y => {
				y.forEach(chunk => {
					if (!chunk.buffer) return
					this.drawBuffers(chunk.buffer)
				})
			})
		})
	}

	public drawColoredStructure(viewMatrix: mat4) {
		this.setShader(this.colorShaderProgram)
		this.prepareDraw(viewMatrix)

		this.chunks.forEach(x => {
			x.forEach(y => {
				y.forEach(chunk => {
					if (!chunk.buffer) return
					this.setVertexAttr('vertPos', 3, chunk.buffer.position)
					this.setVertexAttr('blockPos', 3, chunk.buffer.blockPos)
					this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, chunk.buffer.index)

					this.gl.drawElements(this.gl.TRIANGLES, chunk.buffer.length, this.gl.UNSIGNED_SHORT, 0)
				})
			})
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
