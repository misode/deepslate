import type { mat4 } from 'gl-matrix'
import type { Color } from '../index.js'
import { Vector } from '../index.js'
import { Line } from './Line.js'
import type { Quad } from './Quad.js'
import { Vertex } from './Vertex.js'

export class Mesh {
	public posBuffer: WebGLBuffer | undefined
	public colorBuffer: WebGLBuffer | undefined
	public textureBuffer: WebGLBuffer | undefined
	public normalBuffer: WebGLBuffer | undefined
	public blockPosBuffer: WebGLBuffer | undefined
	public indexBuffer: WebGLBuffer | undefined

	public linePosBuffer: WebGLBuffer | undefined
	public lineColorBuffer: WebGLBuffer | undefined

	constructor(
		public quads: Quad[] = [],
		public lines: Line[] = []
	) {}

	public clear() {
		this.quads = []
		this.lines = []
		return this	
	}

	public isEmpty() {
		return this.quads.length === 0 && this.lines.length === 0
	}

	public quadVertices() {
		return this.quads.length * 4
	}

	public quadIndices() {
		return this.quads.length * 6
	}

	public lineVertices() {
		return this.lines.length * 2
	}

	public merge(other: Mesh) {
		this.quads = this.quads.concat(other.quads)
		this.lines = this.lines.concat(other.lines)
		return this
	}

	public addLine(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: Color) {
		const line = new Line(
			Vertex.fromPos(new Vector(x1, y1, z1)),
			Vertex.fromPos(new Vector(x2, y2, z2))
		).setColor(color)
		this.lines.push(line)
		return this
	}

	public addLineCube(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: Color) {
		this.addLine(x1, y1, z1, x1, y1, z2, color)
		this.addLine(x2, y1, z1, x2, y1, z2, color)
		this.addLine(x1, y1, z1, x2, y1, z1, color)
		this.addLine(x1, y1, z2, x2, y1, z2, color)

		this.addLine(x1, y1, z1, x1, y2, z1, color)
		this.addLine(x2, y1, z1, x2, y2, z1, color)
		this.addLine(x1, y1, z2, x1, y2, z2, color)
		this.addLine(x2, y1, z2, x2, y2, z2, color)

		this.addLine(x1, y2, z1, x1, y2, z2, color)
		this.addLine(x2, y2, z1, x2, y2, z2, color)
		this.addLine(x1, y2, z1, x2, y2, z1, color)
		this.addLine(x1, y2, z2, x2, y2, z2, color)

		return this
	}

	public transform(transformation: mat4) {
		for (const quad of this.quads) {
			quad.transform(transformation)
		}
		return this
	}

	public computeNormals() {
		for (const quad of this.quads) {
			const normal = quad.normal()
			quad.forEach(v => v.normal = normal)
		}
	}

	public rebuild(gl: WebGLRenderingContext, options: { pos?: boolean, color?: boolean, texture?: boolean, normal?: boolean, blockPos?: boolean }) {
		const rebuildBuffer = (buffer: WebGLBuffer | undefined, type: number, data: BufferSource): WebGLBuffer | undefined => {
			if (!buffer) {
				buffer = gl.createBuffer() ?? undefined
			}
			if (!buffer) {
				throw new Error('Cannot create new buffer')
			}
			gl.bindBuffer(type, buffer)
			gl.bufferData(type, data, gl.DYNAMIC_DRAW)
			return buffer
		}
		const rebuildBufferV = (array: Quad[] | Line[], buffer: WebGLBuffer | undefined, mapper: (v: Vertex) => number[] | undefined): WebGLBuffer | undefined => {
			if (array.length === 0) {
				if (buffer) gl.deleteBuffer(buffer)
				return undefined
			}
			const data = array.flatMap(e => e.vertices().flatMap(v => {
				const data = mapper(v)
				if (!data) throw new Error('Missing vertex component')
				return data
			}))
			return rebuildBuffer(buffer, gl.ARRAY_BUFFER, new Float32Array(data))
		}

		if (options.pos) {
			this.posBuffer = rebuildBufferV(this.quads, this.posBuffer, v => v.pos.components())
			this.linePosBuffer = rebuildBufferV(this.lines, this.linePosBuffer, v => v.pos.components())
		}
		if (options.color) {
			this.colorBuffer = rebuildBufferV(this.quads, this.colorBuffer, v => v.color)
			this.lineColorBuffer = rebuildBufferV(this.lines, this.lineColorBuffer, v => v.color)
		}
		if (options.texture) {
			this.textureBuffer = rebuildBufferV(this.quads, this.textureBuffer, v => v.texture)
		}
		if (options.normal) {
			this.normalBuffer = rebuildBufferV(this.quads, this.normalBuffer, v => v.normal?.components())
		}
		if (options.blockPos) {
			this.blockPosBuffer = rebuildBufferV(this.quads, this.blockPosBuffer, v => v.blockPos?.components())
		}
		if (this.quads.length === 0) {
			if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer)
			this.indexBuffer = undefined
		} else {
			this.indexBuffer = rebuildBuffer(this.indexBuffer, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.quads.flatMap((_, i) => [4*i, 4*i + 1, 4*i + 2, i*4, 4*i + 2, 4*i + 3], true)))
		}

		return this
	}
}
