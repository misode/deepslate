import { mat4, vec3 } from "gl-matrix"

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
  let a = vec3.create()
  for(let i = 0; i < array.length; i += 3) {
    vec3.transformMat4(a, array.slice(i, i + 3), transformation)
    array.set(a, i)
  }
}
