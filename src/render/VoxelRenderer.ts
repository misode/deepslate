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

interface Voxel {
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
	private quads: Quad[]
	private buffers: VoxelBuffers

	constructor(gl: WebGLRenderingContext) {
		super(gl)
		this.voxelShaderProgram = new ShaderProgram(gl, vsVoxel, fsVoxel).getProgram()

		this.voxels = []
		this.quads = this.getQuads()
		this.buffers = this.getBuffers()
	}

	public setVoxels(voxels: Voxel[]) {
		this.voxels = voxels
		this.quads = this.getQuads()
		this.buffers = this.getBuffers()
	}

	private getQuads(): Quad[] {
		const lookup = new Set<string>()
		for (const v of this.voxels) {
			lookup.add(`${v.x},${v.y},${v.z}`)
		}
		const planes = new Map<number, VoxelFace[]>()
		for (const v of this.voxels) {
			if (!lookup.has(`${v.x + 1},${v.y},${v.z}`)) {
				const plane = this.encodePlane(VoxelNormal.PosX, v.x, v.color)
				const face: VoxelFace = { i0: v.y, j0: v.z, i1: v.y, j1: v.z }
				mutateWithDefault(planes, plane, [], faces => faces.push(face))
			}
			if (!lookup.has(`${v.x - 1},${v.y},${v.z}`)) {
				const plane = this.encodePlane(VoxelNormal.NegX, v.x, v.color)
				const face: VoxelFace = { i0: v.y, j0: v.z, i1: v.y, j1: v.z }
				mutateWithDefault(planes, plane, [], faces => faces.push(face))
			}
			if (!lookup.has(`${v.x},${v.y + 1},${v.z}`)) {
				const plane = this.encodePlane(VoxelNormal.PosY, v.y, v.color)
				const face: VoxelFace = { i0: v.x, j0: v.z, i1: v.x, j1: v.z }
				mutateWithDefault(planes, plane, [], faces => faces.push(face))
			}
			if (!lookup.has(`${v.x},${v.y - 1},${v.z}`)) {
				const plane = this.encodePlane(VoxelNormal.NegY, v.y, v.color)
				const face: VoxelFace = { i0: v.x, j0: v.z, i1: v.x, j1: v.z }
				mutateWithDefault(planes, plane, [], faces => faces.push(face))
			}
			if (!lookup.has(`${v.x},${v.y},${v.z + 1}`)) {
				const plane = this.encodePlane(VoxelNormal.PosZ, v.z, v.color)
				const face: VoxelFace = { i0: v.x, j0: v.y, i1: v.x, j1: v.y }
				mutateWithDefault(planes, plane, [], faces => faces.push(face))
			}
			if (!lookup.has(`${v.x},${v.y},${v.z - 1}`)) {
				const plane = this.encodePlane(VoxelNormal.NegZ, v.z, v.color)
				const face: VoxelFace = { i0: v.x, j0: v.y, i1: v.x, j1: v.y }
				mutateWithDefault(planes, plane, [], faces => faces.push(face))
			}
		}

		const quads: Quad[] = []
		for (const [plane, faces] of planes.entries()) {
			const { normal, pos, color } = this.decodePlane(plane)
			const k = pos + normal.sign * 0.5
			for (let i = 0; i < faces.length; i += 1) {
				const face = faces[i]
				const i0 = face.i0 - 0.5
				const j0 = face.j0 - 0.5
				const i1 = face.i1 + 0.5
				const j1 = face.j1 + 0.5
				let q: Quad
				switch (normal.axis) {
					case 'x':
						q = Quad.fromPoints(
							new Vector(k, i0, j0),
							new Vector(k, i1, j0),
							new Vector(k, i1, j1),
							new Vector(k, i0, j1))
						break
					case 'y':
						q = Quad.fromPoints(
							new Vector(i0, k, j1),
							new Vector(i1, k, j1),
							new Vector(i1, k, j0),
							new Vector(i0, k, j0))
						break
					case 'z':
						q = Quad.fromPoints(
							new Vector(i0, j0, k),
							new Vector(i1, j0, k),
							new Vector(i1, j1, k),
							new Vector(i0, j1, k))
				}
				if (normal.sign < 0) {
					q.reverse()
				}
				q.setColor(color)
				quads.push(q)
			}
		}
		return quads
	}

	private getBuffers(): VoxelBuffers {
		const position: number[] = []
		const color: number[] = []
		const index: number[] = []
		let i = 0
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
		}
		return {
			position: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(position)),
			color: createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(color)),
			index: createBuffer(this.gl, this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index)),
			length: index.length,
		}
	}

	private encodePlane(normal: VoxelNormal, pos: number, color: Color) {
		const plane = (pos << 28)
			+ (color[0] << 20)
			+ (color[1] << 12)
			+ (color[2] << 4)
			+ normal.index
		return plane
	}

	private decodePlane(plane: number): { normal: VoxelNormal, pos: number, color: Color } {
		return {
			normal: VoxelNormal.fromIndex(plane & 0xF),
			pos: plane >> 28,
			color: [
				(plane >> 20) & 0xFF,
				(plane >> 12) & 0xFF,
				(plane >> 4) & 0xFF,
			],
		}
	}

	public draw(viewMatrix: mat4) {
		this.setShader(this.voxelShaderProgram)
		this.prepareDraw(viewMatrix)

		this.setVertexAttr('vertPos', 3, this.buffers.position)
		this.setVertexAttr('vertColor', 3, this.buffers.color)
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.index)

		this.gl.drawElements(this.gl.TRIANGLES, this.buffers.length, this.gl.UNSIGNED_SHORT, 0)
	}
}
