import { mat4 } from "gl-matrix";
import { BlockAtlas } from "./BlockAtlas";
import { BlockModelProvider } from "./BlockModel";
import { BlockStateProvider } from "./BlockState";
import { mergeFloat32Arrays } from "./Util";

export class StructureRenderer {
  private gl: WebGLRenderingContext
  private shaderProgram: WebGLProgram
  private blockStateProvider: BlockStateProvider
  private blockModelProvider: BlockModelProvider
  private blockAtlas: BlockAtlas
  private structure: any

  private atlasTexture: WebGLTexture
  private viewMatrixLoc: WebGLUniformLocation
  private vertexCount: number
  
  constructor(gl: WebGLRenderingContext, shaderProgram: WebGLProgram, blockStateProvider: BlockStateProvider, blockModelProvider: BlockModelProvider, blockAtlas: BlockAtlas, structure: any) {
    this.gl = gl
    this.shaderProgram = shaderProgram
    this.blockStateProvider = blockStateProvider
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
  
    const fieldOfView = 70 * Math.PI / 180;
    const aspect = (this.gl.canvas as HTMLCanvasElement).clientWidth / (this.gl.canvas as HTMLCanvasElement).clientHeight;
    const projMatrix = mat4.create();
    mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 100.0);
  
    const vertLoc = this.gl.getAttribLocation(this.shaderProgram, 'vertPos')
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.position);
    this.gl.vertexAttribPointer(vertLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(vertLoc);
  
    const texCoordLoc = this.gl.getAttribLocation(this.shaderProgram, 'texCoord')
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.textureCoord);
    this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(texCoordLoc);
  
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
  
    this.gl.useProgram(this.shaderProgram);
    
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.shaderProgram, 'mProj'), false, projMatrix);
  
    this.vertexCount = buffers.length
  }

  private initBuffers() {
    const positions = []
    const textureCoordinates = []
    const indices = []
    let indexOffset = 0
  
    console.log('start drawing')

    for (const b of this.structure.blocks) {
      const blockState = this.structure.palette[b.state]
      const blockStateModel = this.blockStateProvider.getBlockState(blockState.Name)!
      const modelVariant = blockStateModel.getModel(blockState.Properties ?? {})
      const model = this.blockModelProvider.getBlockModel(modelVariant.model)!
      console.log(blockState, blockStateModel, model)
      const buffers = model.getBuffers(this.blockAtlas, indexOffset, b.pos[0], b.pos[1], b.pos[2])
      positions.push(buffers.position)
      textureCoordinates.push(...buffers.texCoord)
      indices.push(...buffers.index)
      indexOffset += buffers.texCoord.length / 2
    }
  
    return {
      position: this.createBuffer(this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...positions)),
      textureCoord: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates)),
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
    const size = this.structure.size
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
  
}
