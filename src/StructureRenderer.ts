import { mat4, ReadonlyVec3 } from "gl-matrix";
import { BlockAtlas } from "./BlockAtlas";
import { BlockModelProvider } from "./BlockModel";
import { BlockDefinitionProvider } from "./BlockDefinition";
import { mergeFloat32Arrays, transformVectors } from "./Util";
import { Structure } from "./Structure";

export class StructureRenderer {
  private gl: WebGLRenderingContext
  private shaderProgram: WebGLProgram
  private blockDefinitionProvider: BlockDefinitionProvider
  private blockModelProvider: BlockModelProvider
  private blockAtlas: BlockAtlas
  private structure: Structure

  private atlasTexture: WebGLTexture
  private viewMatrixLoc: WebGLUniformLocation
  private vertexCount: number
  
  constructor(gl: WebGLRenderingContext, shaderProgram: WebGLProgram, blockDefinitionProvider: BlockDefinitionProvider, blockModelProvider: BlockModelProvider, blockAtlas: BlockAtlas, structure: Structure) {
    this.gl = gl
    this.shaderProgram = shaderProgram
    this.blockDefinitionProvider = blockDefinitionProvider
    this.blockModelProvider = blockModelProvider
    this.blockAtlas = blockAtlas
    this.structure = structure

    this.atlasTexture = blockAtlas.createTexture(gl)
    this.viewMatrixLoc = gl.getUniformLocation(shaderProgram,'mView')!
    this.vertexCount = 0
    this.initialize()
  
  }

  private initialize() {
    const buffers = this.initBuffers()
  
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
  
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);

    const vertLoc = this.gl.getAttribLocation(this.shaderProgram, 'vertPos')
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.position);
    this.gl.vertexAttribPointer(vertLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(vertLoc);
  
    const texCoordLoc = this.gl.getAttribLocation(this.shaderProgram, 'texCoord')
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.textureCoord);
    this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(texCoordLoc);
    
    const tintColorLoc = this.gl.getAttribLocation(this.shaderProgram, 'tintColor')
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.tintColor);
    this.gl.vertexAttribPointer(tintColorLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(tintColorLoc);
  
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
  
    this.gl.useProgram(this.shaderProgram);
  
    this.setPerspective()
  
    this.vertexCount = buffers.length
  }

  private setPerspective() {
    const fieldOfView = 70 * Math.PI / 180;
    const aspect = (this.gl.canvas as HTMLCanvasElement).clientWidth / (this.gl.canvas as HTMLCanvasElement).clientHeight;
    const projMatrix = mat4.create();
    mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 100.0);
    
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.shaderProgram, 'mProj'), false, projMatrix);
  }

  private initBuffers() {
    const positions = []
    const textureCoordinates = []
    const tintColors = []
    const indices = []
    let indexOffset = 0

    let buffers
    for (const b of this.structure.getBlocks()) {
      try {
        const blockDefinition = this.blockDefinitionProvider.getBlockDefinition(b.state.getName())!
        buffers = blockDefinition.getBuffers(b.state.getName(), b.state.getProperties(), this.blockAtlas, this.blockModelProvider, indexOffset)
        const t = mat4.create()
        mat4.translate(t, t, b.pos)
        transformVectors(buffers.position, t)
      } catch(e) {
        console.error(e)
        continue
      }
      positions.push(buffers.position)
      textureCoordinates.push(...buffers.texCoord)
      tintColors.push(...buffers.tintColor)
      indices.push(...buffers.index)
      indexOffset += buffers.texCoord.length / 2
    }

    return {
      position: this.createBuffer(this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...positions)),
      textureCoord: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates)),
      tintColor: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(tintColors)),
      indices: this.createBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices)),
      length: indices.length
    };
  }

  private createBuffer(type: number, array: ArrayBuffer) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, array, this.gl.STATIC_DRAW);
    return buffer
  }

  public drawStructure(xRotation: number, yRotation: number, viewDistance: number) {
    const size = this.structure.getSize()
    const viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, [0, 0, -viewDistance]);
    mat4.rotate(viewMatrix, viewMatrix, xRotation, [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, yRotation, [0, 1, 0]);
    mat4.translate(viewMatrix, viewMatrix, [-size[0] / 2, -size[1] / 2, -size[2] / 2]);
    this.gl.uniformMatrix4fv(this.viewMatrixLoc, false, viewMatrix);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture);

    this.gl.drawElements(this.gl.TRIANGLES, this.vertexCount, this.gl.UNSIGNED_SHORT, 0);
  }

  public setViewport(x: number, y: number, width: number, height: number) {
    this.gl.viewport(x, y, width, height)
    this.setPerspective()
  }
}
