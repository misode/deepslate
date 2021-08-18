export class ShaderProgram {
	private readonly gl: WebGLRenderingContext
	private readonly program: WebGLProgram

	constructor(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
		this.gl = gl
		this.program = this.initShaderProgram(vsSource, fsSource)
	}
  
	public getProgram() {
		return this.program
	}

	private initShaderProgram(vsSource: string, fsSource: string) {
		const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource)!
		const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource)!

		const shaderProgram = this.gl.createProgram()!
		this.gl.attachShader(shaderProgram, vertexShader)
		this.gl.attachShader(shaderProgram, fragmentShader)
		this.gl.linkProgram(shaderProgram)

		if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
			throw new Error(`Unable to link shader program: ${this.gl.getProgramInfoLog(shaderProgram)}`)
		}

		return shaderProgram
	}

	private loadShader(type: number, source: string) {
		const shader = this.gl.createShader(type)!

		this.gl.shaderSource(shader, source)
		this.gl.compileShader(shader)

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			const error = new Error(`Compiling ${type === this.gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ${this.gl.getShaderInfoLog(shader)}`)
			this.gl.deleteShader(shader)
			throw error
		}

		return shader
	}
}
