import type { quat } from 'gl-matrix'
import { mat4, vec3 } from 'gl-matrix'
import { Vector } from './Vector.js'

export class Matrix4 {
	public data: mat4

	constructor(data?: mat4) {
		this.data = data ?? mat4.create()
	}

	public static fromQuat(source: quat) {
		return new Matrix4(mat4.fromQuat(mat4.create(), source))
	}

	public clone() {
		return new Matrix4(mat4.clone(this.data))
	}

	public translate(a: Vector | [number, number, number]) {
		mat4.translate(this.data, this.data, Array.isArray(a) ? a : a.components())
		return this
	}

	public scale(a: Vector | [number, number, number] | number) {
		if (typeof a === 'number') {
			mat4.multiplyScalar(this.data, this.data, a)
		} else {
			mat4.scale(this.data, this.data, Array.isArray(a) ? a : a.components())
		}
		return this
	}

	public add(other: Matrix4) {
		mat4.add(this.data, this.data, other.data)
		return this
	}

	public sub(other: Matrix4) {
		mat4.sub(this.data, this.data, other.data)
		return this
	}

	public mul(other: Matrix4) {
		mat4.mul(this.data, this.data, other.data)
		return this
	}

	public transpose() {
		mat4.transpose(this.data, this.data)
		return this
	}

	public invert() {
		mat4.invert(this.data, this.data)
		return this
	}

	public affine() {
		return this.scale(1 / this.m33)
	}

	public get m00() { return this.data[0] }
	public get m01() { return this.data[1] }
	public get m02() { return this.data[2] }
	public get m03() { return this.data[3] }
	public get m10() { return this.data[4] }
	public get m11() { return this.data[5] }
	public get m12() { return this.data[6] }
	public get m13() { return this.data[7] }
	public get m20() { return this.data[8] }
	public get m21() { return this.data[9] }
	public get m22() { return this.data[10] }
	public get m23() { return this.data[11] }
	public get m30() { return this.data[12] }
	public get m31() { return this.data[13] }
	public get m32() { return this.data[14] }
	public get m33() { return this.data[15] }

	public set m00(x: number) { this.data[0] = x }
	public set m01(x: number) { this.data[1] = x }
	public set m02(x: number) { this.data[2] = x }
	public set m03(x: number) { this.data[3] = x }
	public set m10(x: number) { this.data[4] = x }
	public set m11(x: number) { this.data[5] = x }
	public set m12(x: number) { this.data[6] = x }
	public set m13(x: number) { this.data[7] = x }
	public set m20(x: number) { this.data[8] = x }
	public set m21(x: number) { this.data[9] = x }
	public set m22(x: number) { this.data[10] = x }
	public set m23(x: number) { this.data[11] = x }
	public set m30(x: number) { this.data[12] = x }
	public set m31(x: number) { this.data[13] = x }
	public set m32(x: number) { this.data[14] = x }
	public set m33(x: number) { this.data[15] = x }

	public getTranslation() {
		const [x, y, z] = mat4.getTranslation(vec3.create(), this.data)
		return new Vector(x, y, z)
	}

	public toString() {
		return mat4.str(this.data)
	}
}
