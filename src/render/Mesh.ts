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

	public posBufferDirty = true
	public colorBufferDirty = true
	public textureBufferDirty = true
	public normalBufferDirty = true
	public blockPosBufferDirty = true
	public indexBufferDirty = true

	public linePosBufferDirty = true
	public lineColorBufferDirty = true

	constructor(
		public quads: Quad[] = [],
		public lines: Line[] = []
	) {}

	public setDirty(options: { quads?: boolean, lines?: boolean }) {
		if (options.quads !== undefined) {
			this.posBufferDirty = options.quads
			this.colorBufferDirty = options.quads
			this.textureBufferDirty = options.quads
			this.normalBufferDirty = options.quads
			this.blockPosBufferDirty = options.quads
			this.indexBufferDirty = options.quads
		}
		if (options.lines) {
			this.linePosBufferDirty = true
			this.lineColorBufferDirty = true
		}
	}

	public clear() {
		this.quads = []
		this.lines = []

		this.setDirty({ quads: true, lines: true })
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

		this.setDirty({ quads: true, lines: true })
		return this
	}

	public addLine(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: Color) {
		const line = new Line(
			Vertex.fromPos(new Vector(x1, y1, z1)),
			Vertex.fromPos(new Vector(x2, y2, z2))
		).setColor(color)
		this.lines.push(line)

		this.setDirty({ lines: true })
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

		this.setDirty({ lines: true })
		return this
	}

	public transform(transformation: mat4) {
		for (const quad of this.quads) {
			quad.transform(transformation)
		}

		this.setDirty({ quads: true })
		return this
	}

	public computeNormals() {
		for (const quad of this.quads) {
			const normal = quad.normal()
			quad.forEach(v => v.normal = normal)
		}
	}

	public split(): Mesh[] {
		// Maximum number of quads per mesh, calculated so that:
		// (number of vertices) = (quads * 4) and highest index (4*n - 1) remains <= 65535.
		// Using the condition (quads * 4 + 3) <= 65536 leads to:
		const maxQuads: number = Math.floor((65536 - 3) / 4);
		
		if (this.quads.length * 4 + 3 <= 65536) {
			return [this];
		}
		
		const meshes: Mesh[] = [];
		for (let i: number = 0; i < this.quads.length; i += maxQuads) {
			const chunk: Quad[] = this.quads.slice(i, i + maxQuads);
			// For lines, we include lines only in the first split mesh.
			const lines: Line[] = i === 0 ? this.lines : [];
			meshes.push(new Mesh(chunk, lines));
		}
		return meshes;
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

		if (options.pos && this.posBufferDirty) {
			this.posBuffer = rebuildBufferV(this.quads, this.posBuffer, v => v.pos.components())
			this.posBufferDirty = false
		}
		if (options.pos && this.linePosBufferDirty) {
			this.linePosBuffer = rebuildBufferV(this.lines, this.linePosBuffer, v => v.pos.components())
			this.linePosBufferDirty = false
		}
		if (options.color && this.colorBufferDirty) {
			this.colorBuffer = rebuildBufferV(this.quads, this.colorBuffer, v => v.color)
			this.colorBufferDirty = false
		}
		if (options.color && this.lineColorBufferDirty) {
			this.lineColorBuffer = rebuildBufferV(this.lines, this.lineColorBuffer, v => v.color)
			this.lineColorBufferDirty = false
		}
		if (options.texture && this.textureBufferDirty) {
			this.textureBuffer = rebuildBufferV(this.quads, this.textureBuffer, v => v.texture)
			this.textureBufferDirty = false
		}
		if (options.normal && this.normalBufferDirty) {
			this.normalBuffer = rebuildBufferV(this.quads, this.normalBuffer, v => v.normal?.components())
			this.normalBufferDirty = false
		}
		if (options.blockPos && this.blockPosBufferDirty) {
			this.blockPosBuffer = rebuildBufferV(this.quads, this.blockPosBuffer, v => v.blockPos?.components())
			this.blockPosBufferDirty = false
		}

		if (this.indexBufferDirty) {
			if (this.quads.length === 0) {
				if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer)
				this.indexBuffer = undefined
			  this.indexBufferDirty = false
			} else {
				if (this.quads.length * 4 + 3 > 65536) {
					throw new Error('You got ' + this.quads.length * 4 + 3 + ' vertices, which is more than the max index of uint16 (65536)')
				}
				this.indexBuffer = rebuildBuffer(this.indexBuffer, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.quads.flatMap((_, i) => [4*i, 4*i + 1, 4*i + 2, i*4, 4*i + 2, 4*i + 3], true)))
				this.indexBufferDirty = false
			}
		}

		return this
	}
}
