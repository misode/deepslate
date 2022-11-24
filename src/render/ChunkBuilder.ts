import { mat4, vec3 } from 'gl-matrix'
import type { PlacedBlock, Resources, StructureProvider } from '../index.js'
import { BlockPos, Direction } from '../index.js'
import type { RenderBuffers } from './Renderer.js'
import { SpecialRenderer, SpecialRenderers } from './SpecialRenderer.js'
import { createBuffer, mergeFloat32Arrays, transformVectors, updateBuffer } from './Util.js'


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

export class ChunkBuilder {
	private chunks: RenderChunk[][][] = []

	constructor(
		private readonly gl: WebGLRenderingContext,
		private structure: StructureProvider,
		private readonly resources: Resources,
		private readonly chunkSize: number = 16
	) {
		this.updateStructureBuffers()
	}

	public setStructure(structure: StructureProvider) {
		this.structure = structure
		this.updateStructureBuffers()
	}

	public updateStructureBuffers(chunkPositions?: vec3[]): void {



		if (!chunkPositions) {
			this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
				this.resetChunk(chunk)
			})))
		} else {
			chunkPositions.forEach(chunkPos => {
				const chunk = this.getChunk(chunkPos)
				this.resetChunk(chunk)
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

			const chunkPos: vec3 = [Math.floor(b.pos[0] / this.chunkSize), Math.floor(b.pos[1] / this.chunkSize), Math.floor(b.pos[2] / this.chunkSize)]

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
					this.pushBuffers(buffers, b.pos, chunk)
				}
				if (SpecialRenderers.has(blockName.toString())) {
					buffers = SpecialRenderer[blockName.toString()](chunk.indexOffset, blockProps, this.resources, cull)
					this.pushBuffers(buffers, b.pos, chunk)
				}
			} catch (e) {
				console.error(`Error rendering block ${blockName}`, e)
			}
		}

		if (!chunkPositions) {
			this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
				this.refreshBuffer(chunk)
			})))
		} else {
			chunkPositions.forEach(chunkPos => {
				const chunk = this.getChunk(chunkPos)
				this.refreshBuffer(chunk)
			})
		}
	}

	public getBuffers(): ChunkRenderBuffers[]{
		return this.chunks.flatMap(x => x.flatMap(y => y.flatMap(chunk => chunk.buffer ?? [])))
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

	private pushBuffers (buffers: any, pos: vec3, chunk: RenderChunk) {
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

	private resetChunk (chunk: RenderChunk) {
		chunk.positions = []
		chunk.textureCoordinates = []
		chunk.tintColors = []
		chunk.blockPositions = []
		chunk.normals = []
		chunk.indices = []
		chunk.indexOffset = 0
	}

	private refreshBuffer (chunk: RenderChunk) {
		if (chunk.buffer) {
			updateBuffer(this.gl, chunk.buffer.position, this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...chunk.positions))
			updateBuffer(this.gl, chunk.buffer.texCoord, this.gl.ARRAY_BUFFER, new Float32Array(chunk.textureCoordinates)),
			updateBuffer(this.gl, chunk.buffer.tintColor, this.gl.ARRAY_BUFFER, new Float32Array(chunk.tintColors)),
			updateBuffer(this.gl, chunk.buffer.normal, this.gl.ARRAY_BUFFER, new Float32Array(chunk.normals)),
			updateBuffer(this.gl, chunk.buffer.blockPos, this.gl.ARRAY_BUFFER, new Float32Array(chunk.blockPositions)),
			updateBuffer(this.gl, chunk.buffer.index, this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(chunk.indices)),
			chunk.buffer.length = chunk.indices.length
		} else {
			chunk.buffer = {
				position: createBuffer(this.gl, this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...chunk.positions)),
				texCoord: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(chunk.textureCoordinates)),
				tintColor: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(chunk.tintColors)),
				blockPos: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(chunk.blockPositions)),
				normal: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(chunk.normals)),
				index: createBuffer(this.gl, this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(chunk.indices)),
				length: chunk.indices.length,
			}
		}
	}


	private getChunk (chunkPos: vec3): RenderChunk {
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
}
