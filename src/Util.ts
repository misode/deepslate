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
