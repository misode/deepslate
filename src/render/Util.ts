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

export function intToRGB(c: number) {
	const r = (c >> 16) & 255
	const g = (c >> 8) & 255
	const b = c & 255
	return [r / 255, g / 255, b / 255]
}

export function createBuffer(gl: WebGLRenderingContext, type: number, array: ArrayBuffer) {
	const buffer = gl.createBuffer()
	if (buffer === null) {
		throw new Error('Renderer Error: Cannot create new buffer')
	}
	gl.bindBuffer(type, buffer)
	gl.bufferData(type, array, gl.DYNAMIC_DRAW)
	return buffer
}

export function updateBuffer(gl: WebGLRenderingContext, buffer: WebGLBuffer, type: number, array: ArrayBuffer) {
	gl.bindBuffer(type, buffer)
	gl.bufferData(type, array, gl.STATIC_DRAW)
}
