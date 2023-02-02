export function createBuffer(gl: WebGLRenderingContext, type: number, array: ArrayBuffer) {
	const buffer = gl.createBuffer()
	if (buffer === null) {
		throw new Error('Cannot create new buffer')
	}
	gl.bindBuffer(type, buffer)
	gl.bufferData(type, array, gl.DYNAMIC_DRAW)
	return buffer
}

export function updateBuffer(gl: WebGLRenderingContext, buffer: WebGLBuffer, type: number, array: ArrayBuffer) {
	gl.bindBuffer(type, buffer)
	gl.bufferData(type, array, gl.STATIC_DRAW)
}
