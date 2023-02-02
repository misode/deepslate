import type { mat4 } from 'gl-matrix'
import type { Vector } from '../math/index.js'
import type { Color } from '../util/index.js'
import { Vertex } from './Vertex.js'

export class Line {
	constructor (
		public v1: Vertex,
		public v2: Vertex,
	) {}

	public vertices() {
		return [this.v1, this.v2]
	}

	public forEach(fn: (v: Vertex) => void) {
		fn(this.v1)
		fn(this.v2)
		return this
	}

	public transform(transformation: mat4) {
		this.forEach(v => v.transform(transformation))
		return this
	}

	public setColor(color: Color) {
		this.forEach(v => v.color = color)
		return this
	}

	public toString() {
		return `Line(${this.v1.pos.toString()}, ${this.v2.pos.toString()})`
	}

	public static fromPoints(p1: Vector, p2: Vector) {
		return new Line(Vertex.fromPos(p1), Vertex.fromPos(p2))
	}
}
