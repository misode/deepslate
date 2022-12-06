import { mat4 } from 'gl-matrix'
import { ShaderProgram } from './ShaderProgram.js'

const vsSource = `
  attribute vec4 vertPos;
  attribute vec2 texCoord;
  attribute vec3 tintColor;
  attribute vec3 normal;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec2 vTexCoord;
  varying highp vec3 vTintColor;
  varying highp float vLighting;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
    vTintColor = tintColor;
    vLighting = normal.y * 0.2 + abs(normal.z) * 0.1 + 0.8;
  }
`

const fsSource = `
  precision highp float;
  varying highp vec2 vTexCoord;
  varying highp vec3 vTintColor;
  varying highp float vLighting;

  uniform sampler2D sampler;

  void main(void) {
		vec4 texColor = texture2D(sampler, vTexCoord);
		if(texColor.a < 0.01) discard;
		gl_FragColor = vec4(texColor.xyz * vTintColor * vLighting, texColor.a);
  }
`

export interface RenderBuffers {
	position: WebGLBuffer,
	texCoord: WebGLBuffer,
	tintColor: WebGLBuffer,
	normal: WebGLBuffer,
	index: WebGLBuffer,
	length: number,
}

export class Renderer {
	protected readonly shaderProgram: WebGLProgram
	
	protected projMatrix: mat4
	private activeShader: WebGLProgram

	constructor(
		protected readonly gl: WebGLRenderingContext,
	) {
		this.shaderProgram = new ShaderProgram(gl, vsSource, fsSource).getProgram()
		this.activeShader = this.shaderProgram
		this.projMatrix = this.getPerspective()
		this.initialize()
	}

	public setViewport(x: number, y: number, width: number, height: number) {
		this.gl.viewport(x, y, width, height)
		this.projMatrix = this.getPerspective()
	}

	protected getPerspective() {
		const fieldOfView = 70 * Math.PI / 180
		const aspect = (this.gl.canvas as HTMLCanvasElement).clientWidth / (this.gl.canvas as HTMLCanvasElement).clientHeight
		const projMatrix = mat4.create()
		mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 500.0)
		return projMatrix
	}

	protected initialize() {
		this.gl.enable(this.gl.DEPTH_TEST)
		this.gl.depthFunc(this.gl.LEQUAL)

		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		this.gl.enable(this.gl.CULL_FACE)
		this.gl.cullFace(this.gl.BACK)
	}

	protected setShader(shader: WebGLProgram) {
		this.gl.useProgram(shader)
		this.activeShader = shader
	}

	protected setVertexAttr(name: string, size: number, buffer: WebGLBuffer | null) {
		const location = this.gl.getAttribLocation(this.activeShader, name)
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
		this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0)
		this.gl.enableVertexAttribArray(location)
	}

	protected setUniform(name: string, value: Float32List) {
		const location = this.gl.getUniformLocation(this.activeShader, name)    
		this.gl.uniformMatrix4fv(location, false, value)
	}

	protected setTexture(texture: WebGLTexture) {
		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
	}

	protected createAtlasTexture(image: ImageData) {
		const texture = this.gl.createTexture()!
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image)
		this.gl.generateMipmap(this.gl.TEXTURE_2D)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
		return texture
	}

	protected prepareDraw(viewMatrix: mat4) {
		this.setUniform('mView', viewMatrix)
		this.setUniform('mProj', this.projMatrix)
	}

	protected drawBuffers(buffers: RenderBuffers) {
		this.setVertexAttr('vertPos', 3, buffers.position)
		this.setVertexAttr('texCoord', 2, buffers.texCoord)
		this.setVertexAttr('tintColor', 3, buffers.tintColor)
		this.setVertexAttr('normal', 3, buffers.normal)
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffers.index)

		this.gl.drawElements(this.gl.TRIANGLES, buffers.length, this.gl.UNSIGNED_SHORT, 0)
	}
}
