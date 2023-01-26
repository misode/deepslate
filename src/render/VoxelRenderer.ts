import type { mat4 } from 'gl-matrix'
import { Vector } from '../math/index.js'
import type { Color } from '../util/index.js'
import { mutateWithDefault } from '../util/index.js'
import { Quad } from './Quad.js'
import { Renderer } from './Renderer.js'
import { ShaderProgram } from './ShaderProgram.js'
import { createBuffer } from './Util.js'

/**
 * Implementation inspired by FauxGL, MIT License
 * https://github.com/fogleman/fauxgl/blob/master/voxel.go
 */

export interface Voxel {
	x: number
	y: number
	z: number
	color: Color
}

interface VoxelFace {
	i0: number
	j0: number
	i1: number
	j1: number
}

type Axis = 'x' | 'y' | 'z'

class VoxelNormal {
	private static readonly VALUES: VoxelNormal[] = []
	private static nextIndex = 0

	public static readonly PosX = new VoxelNormal('x', 1)
	public static readonly NegX = new VoxelNormal('x', -1)
	public static readonly PosY = new VoxelNormal('y', 1)
	public static readonly NegY = new VoxelNormal('y', -1)
	public static readonly PosZ = new VoxelNormal('z', 1)
	public static readonly NegZ = new VoxelNormal('z', -1)

	public readonly index: number

	constructor(
		public readonly axis: Axis,
		public readonly sign: 1 | -1,
	) {
		this.index = VoxelNormal.nextIndex++
		VoxelNormal.VALUES[this.index] = this
	}

	public static fromIndex(n: number): VoxelNormal {
		return VoxelNormal.VALUES[n]
	}
}

interface VoxelBuffers {
	position: WebGLBuffer,
	color: WebGLBuffer,
	index: WebGLBuffer,
	length: number,
}

const vsVoxel = `
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

const fsVoxel = `
  precision highp float;
  varying highp vec3 vColor;

  void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
  }
`

export class VoxelRenderer extends Renderer {
	private readonly voxelShaderProgram: WebGLProgram

	private voxels: Voxel[]
	private quads: Quad[] = []
	private buffers: VoxelBuffers[] = []

	constructor(gl: WebGLRenderingContext) {
		super(gl)
		this.voxelShaderProgram = new ShaderProgram(gl, vsVoxel, fsVoxel).getProgram()

		this.voxels = []
	}

	public setVoxels(voxels: Voxel[]) {
		this.voxels = voxels
		this.quads = this.getQuads()
		this.buffers = this.getBuffers()
	}

	private getQuads(): Quad[] {
		const lookup = new Map<number, Map<number, Set<number>>>()
		for (const v of this.voxels) {
			mutateWithDefault(lookup, v.x, new Map<number, Set<number>>(), m => {
				mutateWithDefault(m, v.y, new Set<number>(), n => {
					n.add(v.z)
				})
			})
		}
		const quads: Quad[] = []
		for (const v of this.voxels) {
			if (!lookup.get(v.x + 1)?.get(v.y)?.has(v.z)) {
				quads.push(Quad.fromPoints(
					new Vector(v.x+1, v.y,   v.z  ),
					new Vector(v.x+1, v.y+1, v.z  ),
					new Vector(v.x+1, v.y+1, v.z+1),
					new Vector(v.x+1, v.y,   v.z+1)).setColor(v.color))
			}
			if (!lookup.get(v.x - 1)?.get(v.y)?.has(v.z)) {
				quads.push(Quad.fromPoints(
					new Vector(v.x, v.y,   v.z+1),
					new Vector(v.x, v.y+1, v.z+1),
					new Vector(v.x, v.y+1, v.z),
					new Vector(v.x, v.y,   v.z)).setColor(v.color))
			}
			if (!lookup.get(v.x)?.get(v.y + 1)?.has(v.z)) {
				quads.push(Quad.fromPoints(
					new Vector(v.x,   v.y+1, v.z+1),
					new Vector(v.x+1, v.y+1, v.z+1),
					new Vector(v.x+1, v.y+1, v.z),
					new Vector(v.x,   v.y+1, v.z)).setColor(v.color))
			}
			if (!lookup.get(v.x)?.get(v.y - 1)?.has(v.z)) {
				quads.push(Quad.fromPoints(
					new Vector(v.x,   v.y, v.z),
					new Vector(v.x+1, v.y, v.z),
					new Vector(v.x+1, v.y, v.z+1),
					new Vector(v.x,   v.y, v.z+1)).setColor(v.color))
			}
			if (!lookup.get(v.x)?.get(v.y)?.has(v.z + 1)) {
				quads.push(Quad.fromPoints(
					new Vector(v.x,   v.y,   v.z+1),
					new Vector(v.x+1, v.y,   v.z+1),
					new Vector(v.x+1, v.y+1, v.z+1),
					new Vector(v.x,   v.y+1, v.z+1)).setColor(v.color))
			}
			if (!lookup.get(v.x)?.get(v.y)?.has(v.z - 1)) {
				quads.push(Quad.fromPoints(
					new Vector(v.x,   v.y+1, v.z),
					new Vector(v.x+1, v.y+1, v.z),
					new Vector(v.x+1, v.y,   v.z),
					new Vector(v.x,   v.y,   v.z)).setColor(v.color))
			}
		}

		console.debug(`Converted ${this.voxels.length} voxels into ${quads.length} quads!`)
		return quads
	}

	private getBuffers(): VoxelBuffers[] {
		const buffers: VoxelBuffers[] = []
		let position: number[] = []
		let color: number[] = []
		let index: number[] = []
		let i = 0

		const pushBuffer = () => {
			buffers.push({
				position: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(position)),
				color: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(color)),
				index: createBuffer(this.gl, this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index)),
				length: index.length,
			})
			position = []
			color = []
			index = []
			i = 0
		}

		for (const quad of this.quads) {
			position.push(
				quad.v1.pos.x, quad.v1.pos.y, quad.v1.pos.z,
				quad.v2.pos.x, quad.v2.pos.y, quad.v2.pos.z,
				quad.v3.pos.x, quad.v3.pos.y, quad.v3.pos.z,
				quad.v4.pos.x, quad.v4.pos.y, quad.v4.pos.z)
			const normal = quad.normal()
			const light = (normal.y * 0.25 + Math.abs(normal.z) * 0.125 + 0.75) / 256
			color.push(
				quad.v1.color[0] * light, quad.v1.color[1] * light, quad.v1.color[2] * light,
				quad.v2.color[0] * light, quad.v2.color[1] * light, quad.v2.color[2] * light,
				quad.v3.color[0] * light, quad.v3.color[1] * light, quad.v3.color[2] * light,
				quad.v4.color[0] * light, quad.v4.color[1] * light, quad.v4.color[2] * light)
			index.push(i, i+1, i+2, i, i+2, i+3)
			i += 4
			if (i > 65_000) {
				pushBuffer()
			}
		}
		if (i > 0) {
			pushBuffer()
		}
		return buffers
	}

	public draw(viewMatrix: mat4) {
		console.debug(`Drawing ${this.buffers.length} buffers...`)
		this.setShader(this.voxelShaderProgram)
		this.prepareDraw(viewMatrix)

		if (this.buffers.length === 0) {
			this.gl.clearColor(0, 0, 0, 0)
			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
			return
		}

		for (const buffer of this.buffers) {
			this.setVertexAttr('vertPos', 3, buffer.position)
			this.setVertexAttr('vertColor', 3, buffer.color)
			this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.index)

			this.gl.drawElements(this.gl.TRIANGLES, buffer.length, this.gl.UNSIGNED_SHORT, 0)
		}
	}
}
