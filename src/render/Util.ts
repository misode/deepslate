import type { mat4 } from 'gl-matrix'
import { vec3 } from 'gl-matrix'
import type { Cull, Direction } from './BlockModel'

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

export function clamp(x: number, min: number, max: number) {
	return Math.max(min, Math.min(max, x))
}

export function rotateCull(cull: Cull, x: number, y: number){
	const directions: Direction[] = ['up', 'down', 'north', 'south', 'west', 'east']

	let yMapping : {[key in Direction]: Direction}
	switch (y) {
		case 0:
			yMapping = {
				north: 'north',
				east: 'east',
				south: 'south',
				west: 'west',
				up: 'up',
				down: 'down',
			}
			break
		case 270:
			yMapping = {
				north: 'east',
				east: 'south',
				south: 'west',
				west: 'north',
				up: 'up',
				down: 'down',
			}
			break
		case 180:
			yMapping = {
				north: 'south',
				east: 'west',
				south: 'north',
				west: 'east',
				up: 'up',
				down: 'down',
			}
			break
		case 90:
			yMapping = {
				north: 'west',
				east: 'north',
				south: 'east',
				west: 'south',
				up: 'up',
				down: 'down',
			}
	}
  
	const yRotCull : Cull = {}
	for (const d of directions)
		yRotCull[yMapping![d]] = cull[d]


	let xMapping : {[key in Direction]: Direction}
	switch (x) {
		case 0:
			xMapping = {
				north: 'north',
				east: 'east',
				south: 'south',
				west: 'west',
				up: 'up',
				down: 'down',
			}
			break
		case 270:
			xMapping = {
				north: 'down',
				east: 'east',
				south: 'up',
				west: 'west',
				up: 'north',
				down: 'south',
			}
			break
		case 180:
			xMapping = {
				north: 'south',
				east: 'east',
				south: 'north',
				west: 'west',
				up: 'down',
				down: 'up',
			}
			break
		case 90:
			xMapping = {
				north: 'up',
				east: 'east',
				south: 'down',
				west: 'west',
				up: 'south',
				down: 'north',
			}
	}

	const xRotCull : Cull = {}
	for (const d of directions)
		xRotCull[xMapping![d]] = yRotCull[d]

	return xRotCull
}
