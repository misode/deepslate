import type { mat4 } from 'gl-matrix'
import type { Vector } from '../math/index.js'
import type { Color } from '../util/index.js'
import { Vertex } from './Vertex.js'

export class Quad {
	constructor (
		public v1: Vertex,
		public v2: Vertex,
		public v3: Vertex,
		public v4: Vertex,
	) {}

	public vertices() {
		return [this.v1, this.v2, this.v3, this.v4]
	}

	public forEach(fn: (v: Vertex) => void) {
		fn(this.v1)
		fn(this.v2)
		fn(this.v3)
		fn(this.v4)
		return this
	}

	public transform(transformation: mat4) {
		this.forEach(v => v.transform(transformation))
		return this
	}

	public normal() {
		const e1 = this.v2.pos.sub(this.v1.pos)
		const e2 = this.v3.pos.sub(this.v1.pos)
		return e1.cross(e2).normalize()
	}

	public reverse() {
		[this.v1, this.v2, this.v3, this.v4] = [this.v4, this.v3, this.v2, this.v1]
		return this
	}

	public setColor(color: Color) {
		this.forEach(v => v.color = color)
		return this
	}

	public setTexture(texture: number[], textureLimit?: [number, number, number, number]) {
		this.v1.textureLimit = textureLimit 
		this.v2.textureLimit = textureLimit
		this.v3.textureLimit = textureLimit
		this.v4.textureLimit = textureLimit

		this.v1.texture = [texture[0], texture[1]]
		this.v2.texture = [texture[2], texture[3]]
		this.v3.texture = [texture[4], texture[5]]
		this.v4.texture = [texture[6], texture[7]]
		return this
	}
	
	public toString() {
		return `Quad(${this.v1.pos.toString()}, ${this.v2.pos.toString()}, ${this.v3.pos.toString()}, ${this.v4.pos.toString()})`
	}

	public static fromPoints(p1: Vector, p2: Vector, p3: Vector, p4: Vector) {
		return new Quad(Vertex.fromPos(p1), Vertex.fromPos(p2), Vertex.fromPos(p3), Vertex.fromPos(p4))
	}
}
