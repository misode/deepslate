import type { Vector } from '../math/index.js'
import type { Color } from '../util/index.js'

export class Vertex {
	constructor(
		public pos: Vector,
		public color: Color,
	) {}

	public static fromPos(pos: Vector) {
		return new Vertex(pos, [0, 0, 0])
	}
}
