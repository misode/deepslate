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

	public normal() {
		const e1 = this.v2.pos.sub(this.v1.pos)
		const e2 = this.v3.pos.sub(this.v1.pos)
		return e1.cross(e2).normalize()
	}

	public reverse() {
		[this.v1, this.v2, this.v3, this.v4] = [this.v4, this.v3, this.v2, this.v1]
	}

	public setColor(color: Color) {
		this.v1.color = color
		this.v2.color = color
		this.v3.color = color
		this.v4.color = color
	}

	public toString() {
		return `Quad(${this.v1.pos.toString()}, ${this.v2.pos.toString()}, ${this.v3.pos.toString()}, ${this.v4.pos.toString()})`
	}

	public static fromPoints(p1: Vector, p2: Vector, p3: Vector, p4: Vector) {
		return new Quad(Vertex.fromPos(p1), Vertex.fromPos(p2), Vertex.fromPos(p3), Vertex.fromPos(p4))
	}
}
