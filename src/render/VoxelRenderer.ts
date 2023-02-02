import type { mat4 } from 'gl-matrix'
import { Vector } from '../math/index.js'
import type { Color } from '../util/index.js'
import { mutateWithDefault } from '../util/index.js'
import { Mesh } from './Mesh.js'
import { Quad } from './Quad.js'
import { Renderer } from './Renderer.js'
import { ShaderProgram } from './ShaderProgram.js'

export interface Voxel {
	x: number
	y: number
	z: number
	color: Color
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

	private voxels: Voxel[] = []
	private quads: Quad[] = []
	private meshes: Mesh[] = []

	constructor(gl: WebGLRenderingContext) {
		super(gl)
		this.voxelShaderProgram = new ShaderProgram(gl, vsVoxel, fsVoxel).getProgram()
	}

	public setVoxels(voxels: Voxel[]) {
		this.voxels = voxels
		this.quads = this.getQuads()
		this.meshes = this.getMeshes()
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

	private getMeshes(): Mesh[] {
		const meshes: Mesh[] = []
		let mesh = new Mesh()

		for (const quad of this.quads) {
			const normal = quad.normal()
			const light = (normal.y * 0.25 + Math.abs(normal.z) * 0.125 + 0.75) / 256
			quad.forEach(v => v.color = [v.color[0] * light, v.color[1] * light, v.color[2] * light])
			mesh.quads.push(quad)

			if (mesh.quadVertices() > 65_000) {
				meshes.push(mesh)
				mesh = new Mesh()
			}
		}
		if (!mesh.isEmpty()) {
			meshes.push(mesh)
		}
		for (const mesh of meshes) {
			mesh.rebuild(this.gl, { pos: true, color: true })
		}
		return meshes
	}

	public draw(viewMatrix: mat4) {
		console.debug(`Drawing ${this.meshes.length} meshes...`)
		this.setShader(this.voxelShaderProgram)
		this.prepareDraw(viewMatrix)

		if (this.meshes.length === 0) {
			this.gl.clearColor(0, 0, 0, 0)
			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
			return
		}

		for (const mesh of this.meshes) {
			this.drawMesh(mesh, { pos: true, color: true })
		}
	}
}
