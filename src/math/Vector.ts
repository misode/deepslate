export class Vector {
	constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number,
	) {}

	public length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
	}

	public lengthSquared() {
		return this.x * this.x + this.y * this.y + this.z * this.z
	}

	public distance(other: Vector) {
		return this.sub(other).length()
	}

	public distanceSquared(other: Vector) {
		return this.sub(other).lengthSquared()
	}

	public abs() {
		return new Vector(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z))
	}

	public add(other: Vector) {
		return new Vector(this.x + other.x, this.y + other.y, this.z + other.z)
	}

	public sub(other: Vector) {
		return new Vector(this.x - other.x, this.y - other.y, this.z - other.z)
	}

	public mul(other: Vector) {
		return new Vector(this.x * other.x, this.y * other.y, this.z * other.z)
	}

	public div(other: Vector) {
		return new Vector(this.x / other.x, this.y / other.y, this.z / other.z)
	}

	public scale(n: number) {
		return new Vector(this.x * n, this.y * n, this.z * n)
	}

	public dot(other: Vector) {
		return this.x * other.x + this.y * other.y + this.z * other.z
	}

	public cross(other: Vector) {
		const x = this.y * other.z - this.z * other.y
		const y = this.z * other.x - this.x * other.z
		const z = this.x * other.y - this.y * other.x
		return new Vector(x, y, z)
	}

	public normalize() {
		if (this.x == 0 && this.y == 0 && this.z == 0) {
			return this
		}
		const r = 1 / this.length()
		return new Vector(this.x * r, this.y * r, this.z * r)
	}

	public components(): [number, number, number] {
		return [this.x, this.y, this.z]
	}

	public toString() {
		return `[${this.x} ${this.y} ${this.z}]`
	}
}
