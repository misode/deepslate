import type { mat4 } from 'gl-matrix'
import { vec3 } from 'gl-matrix'
import { Vector } from '../math/index.js'
import type { Color } from '../util/index.js'

export class Vertex {
	private static readonly VEC = vec3.create()

	constructor(
		public pos: Vector,
		public color: Color,
		public texture: [number, number] | undefined,
		public textureLimit: [number, number, number, number] | undefined,
		public normal: Vector | undefined,
		public blockPos: Vector | undefined,
	) {}

	public transform(transformation: mat4) {
		Vertex.VEC[0] = this.pos.x
		Vertex.VEC[1] = this.pos.y
		Vertex.VEC[2] = this.pos.z
		vec3.transformMat4(Vertex.VEC, Vertex.VEC, transformation)
		this.pos = new Vector(Vertex.VEC[0], Vertex.VEC[1], Vertex.VEC[2])
		return this
	}

	public static fromPos(pos: Vector) {
		return new Vertex(pos, [0, 0, 0], [0, 0], [0, 0, 0, 0], undefined, undefined)
	}
}
