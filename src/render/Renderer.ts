import { mat4, vec3 } from 'gl-matrix'
import type { Mesh } from './Mesh.js'
import type { Quad } from './Quad.js'
import { ShaderProgram } from './ShaderProgram.js'

const vsSource = `
  attribute vec4 vertPos;
  attribute vec2 texCoord;
  attribute vec3 vertColor;
  attribute vec3 normal;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec2 vTexCoord;
  varying highp vec3 vTintColor;
  varying highp float vLighting;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
    vTintColor = vertColor;
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

export class Renderer {
	protected readonly shaderProgram: WebGLProgram
	
	protected projMatrix: mat4
	protected activeShader: WebGLProgram

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

	protected setVertexAttr(name: string, size: number, buffer: WebGLBuffer | null | undefined) {
		if (buffer === undefined) throw new Error(`Expected buffer for ${name}`)
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

	protected extractCameraPositionFromView() {
		// should only be used after prepareDraw()
		const viewLocation = this.gl.getUniformLocation(this.activeShader, 'mView')
		if (!viewLocation) {
			throw new Error('Failed to get location of mView uniform')
		}
		const viewMatrixRaw = this.gl.getUniform(this.activeShader, viewLocation)
		// Ensure we have a valid matrix; gl.getUniform returns an array-like object.
		const viewMatrix = mat4.clone(viewMatrixRaw)
		const invView = mat4.create()
		if (!mat4.invert(invView, viewMatrix)) {
			throw new Error('Inverting view matrix failed')
		}
		// Translation components are at indices 12, 13, 14.
		return vec3.fromValues(invView[12], invView[13], invView[14])
	}

	public static computeQuadCenter(quad: Quad) {
		const vertices = quad.vertices() // Array of Vertex objects
		const center = [0, 0, 0]
		for (const v of vertices) {
				const pos = v.pos.components() // [x, y, z]
				center[0] += pos[0]
				center[1] += pos[1]
				center[2] += pos[2]
		}
		center[0] /= vertices.length
		center[1] /= vertices.length
		center[2] /= vertices.length
		return vec3.fromValues(center[0], center[1], center[2])
	}

	protected drawMesh(mesh: Mesh, options: { pos?: boolean, color?: boolean, texture?: boolean, normal?: boolean, blockPos?: boolean, sort?: boolean }) {
    // If the mesh is intended for transparent rendering, sort the quads.
    if (mesh.quadVertices() > 0 && options.sort) {
				const cameraPos = this.extractCameraPositionFromView()
        mesh.quads.sort((a, b) => {
            const centerA = Renderer.computeQuadCenter(a)
            const centerB = Renderer.computeQuadCenter(b)
            const distA = vec3.distance(cameraPos, centerA)
            const distB = vec3.distance(cameraPos, centerB)
            return distB - distA // Sort in descending order (farthest first)
        })
    }

		// If the mesh is too large, split it into smaller meshes
		const meshes = mesh.split()

		// We rebuild mesh only right before we render to avoid multiple rebuild
		// Mesh will keep tracking whether itself is dirty or not to avoid unnecessary rebuild as well
		meshes.forEach(m => m.rebuild(this.gl, {
			pos: options.pos,
			color: options.color,
			texture: options.texture,
			normal: options.normal,
			blockPos: options.blockPos,
		}))

		for (const m of meshes) {
			this.drawMeshInner(m, options)
		}
	}

	protected drawMeshInner(mesh: Mesh, options: { pos?: boolean, color?: boolean, texture?: boolean, normal?: boolean, blockPos?: boolean, sort?: boolean }) {
		if (mesh.quadVertices() > 0) {
			if (options.pos) this.setVertexAttr('vertPos', 3, mesh.posBuffer)
			if (options.color) this.setVertexAttr('vertColor', 3, mesh.colorBuffer)
			if (options.texture) this.setVertexAttr('texCoord', 2, mesh.textureBuffer)
			if (options.normal) this.setVertexAttr('normal', 3, mesh.normalBuffer)
			if (options.blockPos) this.setVertexAttr('blockPos', 3, mesh.blockPosBuffer)
	
			if (!mesh.indexBuffer) throw new Error('Expected index buffer')
			this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer)
	
			this.gl.drawElements(this.gl.TRIANGLES, mesh.quadIndices(), this.gl.UNSIGNED_SHORT, 0)
		}

		if (mesh.lineVertices() > 0) {
			if (options.pos) this.setVertexAttr('vertPos', 3, mesh.linePosBuffer)
			if (options.color) this.setVertexAttr('vertColor', 3, mesh.lineColorBuffer)

			this.gl.drawArrays(this.gl.LINES, 0, mesh.lineVertices())
		}
	}
}
