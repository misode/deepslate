import type { mat4 } from 'gl-matrix'
import type { Quad } from './Quad.js'

export class Mesh {
	public posBuffer: WebGLBuffer | undefined
	public colorBuffer: WebGLBuffer | undefined
	public textureBuffer: WebGLBuffer | undefined
	public normalBuffer: WebGLBuffer | undefined
	public blockPosBuffer: WebGLBuffer | undefined
	public indexBuffer: WebGLBuffer | undefined

	constructor(
		public quads: Quad[] = [],
	) {}

	public clear() {
		this.quads = []
		return this	
	}

	public isEmpty() {
		return this.quads.length === 0
	}

	public vertices() {
		return this.quads.length * 4
	}

	public indices() {
		return this.quads.length * 6
	}

	public merge(other: Mesh | Quad[]) {
		const quads = Array.isArray(other) ? other : other.quads
		this.quads = this.quads.concat(quads)
		return this
	}

	public transform(transformation: mat4) {
		for (const quad of this.quads) {
			quad.transform(transformation)
		}
		return this
	}

	public rebuild(gl: WebGLRenderingContext, options: { pos?: boolean, color?: boolean, texture?: boolean, normal?: boolean, blockPos?: boolean }) {
		const rebuildBuffer = (buffer: WebGLBuffer | undefined, type: number, mapper: (q: Quad, i: number) => number[], ints?: boolean): WebGLBuffer | undefined => {
			if (this.isEmpty() || mapper(this.quads[0], 0) === undefined) return undefined
			if (!buffer) {
				buffer = gl.createBuffer() ?? undefined
			}
			if (!buffer) {
				throw new Error('Cannot create new buffer')
			}
			gl.bindBuffer(type, buffer)
			const array = this.quads.flatMap((q, i) => mapper(q, i))
			const data = ints ? new Uint16Array(array) : new Float32Array(array)
			gl.bufferData(type, data, gl.DYNAMIC_DRAW)
			return buffer
		}

		if (options.pos) {
			this.posBuffer = rebuildBuffer(this.posBuffer, gl.ARRAY_BUFFER, q => q.vertices().flatMap(v => v.pos.components()))
		}
		if (options.color) {
			this.colorBuffer = rebuildBuffer(this.colorBuffer, gl.ARRAY_BUFFER, q => q.vertices().flatMap(v => v.color))
		}
		if (options.texture) {
			this.textureBuffer = rebuildBuffer(this.textureBuffer, gl.ARRAY_BUFFER, q => q.vertices().flatMap(v => {
				if (!v.texture) throw new Error('Expected vertex to have texture')
				return v.texture
			}))
		}
		if (options.normal) {
			this.normalBuffer = rebuildBuffer(this.normalBuffer, gl.ARRAY_BUFFER, q => q.vertices().flatMap(v => {
				if (!v.normal) throw new Error('Expected vertex to have normal')
				return v.normal.components()
			}))
		}
		if (options.blockPos) {
			this.blockPosBuffer = rebuildBuffer(this.blockPosBuffer, gl.ARRAY_BUFFER, q => q.vertices().flatMap(v => {
				if (!v.blockPos) throw new Error('Expected vertex to have blockPos')
				return v.blockPos.components()
			}))
		}
		this.indexBuffer = rebuildBuffer(this.indexBuffer, gl.ELEMENT_ARRAY_BUFFER, (_, i) => [4*i, 4*i + 1, 4*i + 2, i*4, 4*i + 2, 4*i + 3], true)
	}
}
