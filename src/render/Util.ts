import type { mat4 } from 'gl-matrix'
import { vec3 } from 'gl-matrix'

export function mergeFloat32Arrays(...arrays: Float32Array[]) {
	let totalLength = 0
	for (const a of arrays) {
		totalLength += a.length
	}
	const result = new Float32Array(totalLength)
	let offset = 0
	for (const a of arrays) {
		result.set(a, offset),
		offset += a.length
	}
	return result
}

export function transformVectors(array: Float32Array, transformation: mat4) {
	const a = vec3.create()
	for(let i = 0; i < array.length; i += 3) {
		a[0] = array[i]
		a[1] = array[i+1]
		a[2] = array[i+2]
		vec3.transformMat4(a, a, transformation)
		array[i] = a[0]
		array[i+1] = a[1]
		array[i+2] = a[2]
	}
}
