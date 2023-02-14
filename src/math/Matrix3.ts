import type { quat } from 'gl-matrix'
import { mat3 } from 'gl-matrix'
import type { Matrix4 } from './Matrix4.js'
import type { Vector } from './Vector.js'

export class Matrix3 {
	public data: mat3

	constructor(data?: mat3) {
		this.data = data ?? mat3.create()
	}

	public static fromMatrix4(source: Matrix4) {
		return new Matrix3(mat3.fromMat4(mat3.create(), source.data))
	}

	public static fromQuat(source: quat) {
		return new Matrix3(mat3.fromQuat(mat3.create(), source))
	}

	public clone() {
		return new Matrix3(mat3.clone(this.data))
	}

	public copy(other: Matrix3) {
		mat3.copy(this.data, other.data)
		return this
	}

	public translate(a: Vector | [number, number]) {
		mat3.translate(this.data, this.data, Array.isArray(a) ? a : [a.x, a.y])
		return this
	}

	public scale(a: Vector | [number, number] | number) {
		if (typeof a === 'number') {
			mat3.multiplyScalar(this.data, this.data, a)
		} else {
			mat3.scale(this.data, this.data, Array.isArray(a) ? a : [a.x, a.y])
		}
		return this
	}

	public add(other: Matrix3) {
		mat3.add(this.data, this.data, other.data)
		return this
	}

	public sub(other: Matrix3) {
		mat3.sub(this.data, this.data, other.data)
		return this
	}

	public mul(other: Matrix3) {
		mat3.mul(this.data, this.data, other.data)
		return this
	}

	public transpose() {
		mat3.transpose(this.data, this.data)
		return this
	}

	public invert() {
		mat3.invert(this.data, this.data)
		return this
	}

	public get m00() { return this.data[0] }
	public get m01() { return this.data[1] }
	public get m02() { return this.data[2] }
	public get m10() { return this.data[3] }
	public get m11() { return this.data[4] }
	public get m12() { return this.data[5] }
	public get m20() { return this.data[6] }
	public get m21() { return this.data[7] }
	public get m22() { return this.data[8] }

	public set m00(x: number) { this.data[0] = x }
	public set m01(x: number) { this.data[1] = x }
	public set m02(x: number) { this.data[2] = x }
	public set m10(x: number) { this.data[3] = x }
	public set m11(x: number) { this.data[4] = x }
	public set m12(x: number) { this.data[5] = x }
	public set m20(x: number) { this.data[6] = x }
	public set m21(x: number) { this.data[7] = x }
	public set m22(x: number) { this.data[8] = x }

	public toString() {
		return mat3.str(this.data)
	}
}
