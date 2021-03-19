import { mat4, vec3 } from "gl-matrix";
import { BlockAtlas } from "./BlockAtlas";
import { BlockModelProvider, Cull } from "./BlockModel";
import { BlockDefinitionProvider } from "./BlockDefinition";
import { BlockPropertiesProvider } from "./BlockProperties";
import { mergeFloat32Arrays, transformVectors } from "./Util";
import { StructureProvider } from "@webmc/core";
import { ShaderProgram } from "./ShaderProgram";
import { SpecialRenderer, SpecialRenderers } from "./SpecialRenderer";

const vsSource = `
  attribute vec4 vertPos;
  attribute vec2 texCoord;
  attribute vec3 tintColor;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec2 vTexCoord;
  varying highp vec3 vTintColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
    vTintColor = tintColor;
  }
`;

const fsSource = `
  precision highp float;
  varying highp vec2 vTexCoord;
  varying highp vec3 vTintColor;

  uniform sampler2D sampler;

  void main(void) {
    vec4 texColor = texture2D(sampler, vTexCoord);
    if(texColor.a < 0.01) discard;
    gl_FragColor = vec4(texColor.xyz * vTintColor, texColor.a);
  }
`;

const vsColor = `
  attribute vec4 vertPos;
  attribute vec3 blockPos;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec3 vColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = blockPos / 256.0;
  }
`;

const fsColor = `
  precision highp float;
  varying highp vec3 vColor;

  void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

const vsGrid = `
  attribute vec4 vertPos;
  attribute vec3 vertColor;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec3 vColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = vertColor;
  }
`

const fsGrid = `
  precision highp float;
  varying highp vec3 vColor;

  void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

type StructureBuffers = {
  position: WebGLBuffer
  texCoord: WebGLBuffer
  tintColor: WebGLBuffer
  blockPos: WebGLBuffer
  index: WebGLBuffer
  length: number
}

type GridBuffers = {
  position: WebGLBuffer
  color: WebGLBuffer
  length: number
}

type Resources = {
  blockDefinitions: BlockDefinitionProvider
  blockModels: BlockModelProvider
  blockAtlas: BlockAtlas
  blockProperties: BlockPropertiesProvider
}

type Chunk = {
  positions: Float32Array[],
  textureCoordinates: number[],
  tintColors: number[],
  blockPositions: number[],
  indices: number[],
  indexOffset: number,
  buffer?: StructureBuffers
}

export class StructureRenderer {
  private shaderProgram: WebGLProgram
  private gridShaderProgram: WebGLProgram
  private colorShaderProgram: WebGLProgram

  private chunks: Chunk[][][] = []

  private gridBuffers: GridBuffers
  private outlineBuffers: GridBuffers
  private invisibleBlockBuffers: GridBuffers | undefined
  private atlasTexture: WebGLTexture
  private projMatrix: mat4
  private activeShader: WebGLProgram
  private chunkSize: number
  private useInvisibleBlockBuffer: boolean

  constructor(
    private gl: WebGLRenderingContext,
    private structure: StructureProvider,
    private resources: Resources,
    options?: {
      facesPerBuffer?: number,
      chunkSize?: number,
      useInvisibleBlockBuffer?: boolean
    }
  ) {
    if (options?.facesPerBuffer){
      console.warn("webgl render warning: facesPerBuffer option has been removed in favor of chunkSize")
    }
    
    this.chunkSize = options?.chunkSize ?? 16
    this.useInvisibleBlockBuffer = options?.useInvisibleBlockBuffer ?? true

    this.shaderProgram = new ShaderProgram(gl, vsSource, fsSource).getProgram()
    this.gridShaderProgram = new ShaderProgram(gl, vsGrid, fsGrid).getProgram()
    this.colorShaderProgram = new ShaderProgram(gl, vsColor, fsColor).getProgram()

    this.updateStructureBuffers()
    this.gridBuffers = this.getGridBuffers()
    this.outlineBuffers = this.getOutlineBuffers()
    this.invisibleBlockBuffers = this.getInvisibleBlockBuffers()
    this.atlasTexture = this.getBlockTexture()
    this.projMatrix = this.getPerspective()
    this.activeShader = this.shaderProgram
    this.initialize()
  }

  public setStructure(structure: StructureProvider) {
    this.structure = structure
    this.updateStructureBuffers()
    this.gridBuffers = this.getGridBuffers()
    this.invisibleBlockBuffers = this.getInvisibleBlockBuffers()
  }

  private initialize() {
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.BACK)
  }

  private getBlockTexture() {
    const texture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.resources.blockAtlas.getImageData());
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    return texture
  }

  private getPerspective() {
    const fieldOfView = 70 * Math.PI / 180;
    const aspect = (this.gl.canvas as HTMLCanvasElement).clientWidth / (this.gl.canvas as HTMLCanvasElement).clientHeight;
    const projMatrix = mat4.create();
    mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 500.0);
    return projMatrix
  }

  private getChunk(chunkPos: vec3): Chunk{
    const x = Math.abs(chunkPos[0]) * 2 + (chunkPos[0] < 0 ? 1 : 0)
    const y = Math.abs(chunkPos[1]) * 2 + (chunkPos[1] < 0 ? 1 : 0)
    const z = Math.abs(chunkPos[2]) * 2 + (chunkPos[2] < 0 ? 1 : 0)

    if (!this.chunks[x])
      this.chunks[x] = []
    if (!this.chunks[x][y])
      this.chunks[x][y] = []
    if (!this.chunks[x][y][z])
      this.chunks[x][y][z] = {
        positions: [],
        textureCoordinates: [],
        tintColors: [],
        blockPositions: [],
        indices: [],
        indexOffset: 0,
      }

    return this.chunks[x][y][z]
  }  

  public updateStructureBuffers(chunkPositions?: vec3[]): void {

    const pushBuffers = (buffers: any, pos: vec3, chunk: Chunk) => {
      const t = mat4.create()
      mat4.translate(t, t, pos)
      transformVectors(buffers.position, t)

      chunk.positions.push(buffers.position)
      chunk.textureCoordinates.push(...buffers.texCoord)
      chunk.tintColors.push(...buffers.tintColor)
      for (let i = 0; i < buffers.texCoord.length / 2; i += 1) chunk.blockPositions.push(...pos)
      chunk.indices.push(...buffers.index)
      chunk.indexOffset += buffers.texCoord.length / 2
    }

    const resetChunk = (chunk: Chunk) => {
      chunk.positions = []
      chunk.textureCoordinates = []
      chunk.tintColors = []
      chunk.blockPositions = []
      chunk.indices = []
      chunk.indexOffset = 0
    }

    const refreshBuffer = (chunk: Chunk) => {
      if (chunk.buffer){
        this.updateBuffer(chunk.buffer.position, this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...chunk.positions))
        this.updateBuffer(chunk.buffer.texCoord, this.gl.ARRAY_BUFFER, new Float32Array(chunk.textureCoordinates)),
        this.updateBuffer(chunk.buffer.tintColor, this.gl.ARRAY_BUFFER, new Float32Array(chunk.tintColors)),
        this.updateBuffer(chunk.buffer.blockPos, this.gl.ARRAY_BUFFER, new Float32Array(chunk.blockPositions)),
        this.updateBuffer(chunk.buffer.index, this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(chunk.indices)),
        chunk.buffer.length = chunk.indices.length
      } else {
        chunk.buffer = {
          position: this.createBuffer(this.gl.ARRAY_BUFFER, mergeFloat32Arrays(...chunk.positions)),
          texCoord: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(chunk.textureCoordinates)),
          tintColor: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(chunk.tintColors)),
          blockPos: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(chunk.blockPositions)),
          index: this.createBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(chunk.indices)),
          length: chunk.indices.length
        }
      }
    }

    if (!chunkPositions){
      this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
        resetChunk(chunk)
      })))
    } else { 
      chunkPositions.forEach(chunkPos => {
        const chunk = this.getChunk(chunkPos)
        resetChunk(chunk)
      });
    }

    let buffers
    for (const b of this.structure.getBlocks()) {
      const blockName = b.state.getName()
      const blockProps = b.state.getProperties()

      const chunkPos:vec3 = [Math.floor(b.pos[0]/this.chunkSize), Math.floor(b.pos[1]/this.chunkSize), Math.floor(b.pos[2]/this.chunkSize)]

      if (chunkPositions && !chunkPositions.some(pos => vec3.equals(pos, chunkPos)))
        continue

      const chunk = this.getChunk(chunkPos)

      try {
        const cull: Cull = {
          up: this.resources.blockProperties.getBlockProperties(this.structure.getBlock([b.pos[0], b.pos[1]+1, b.pos[2]])?.state.getName())?.opaque,
          down: this.resources.blockProperties.getBlockProperties(this.structure.getBlock([b.pos[0], b.pos[1]-1, b.pos[2]])?.state.getName())?.opaque,
          west: this.resources.blockProperties.getBlockProperties(this.structure.getBlock([b.pos[0]-1, b.pos[1], b.pos[2]])?.state.getName())?.opaque,
          east: this.resources.blockProperties.getBlockProperties(this.structure.getBlock([b.pos[0]+1, b.pos[1], b.pos[2]])?.state.getName())?.opaque,
          north: this.resources.blockProperties.getBlockProperties(this.structure.getBlock([b.pos[0], b.pos[1], b.pos[2]-1])?.state.getName())?.opaque,
          south: this.resources.blockProperties.getBlockProperties(this.structure.getBlock([b.pos[0], b.pos[1], b.pos[2]+1])?.state.getName())?.opaque
        }

        const blockDefinition = this.resources.blockDefinitions.getBlockDefinition(blockName)
        if (blockDefinition) {
          buffers = blockDefinition.getBuffers(blockName, blockProps, this.resources.blockAtlas, this.resources.blockModels, chunk.indexOffset, cull)
        }
        if (SpecialRenderers.has(blockName)) {
          if (blockDefinition) {
            pushBuffers(buffers, b.pos, chunk)
          }
          buffers = SpecialRenderer[blockName](chunk.indexOffset, blockProps, this.resources.blockAtlas)
          pushBuffers(buffers, b.pos, chunk)
        } else if(blockDefinition) {
          pushBuffers(buffers, b.pos, chunk)
        }
      } catch(e) {
        console.error(`Error rendering block ${blockName}`, e)
      }
    }

    if (!chunkPositions){
      this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
        refreshBuffer(chunk)
      })))
    } else {
      chunkPositions.forEach(chunkPos => {
        const chunk = this.getChunk(chunkPos)
        refreshBuffer(chunk)
      })
    }
  }

  private getGridBuffers(): GridBuffers {
    const [X, Y, Z] = this.structure.getSize()
    const position: number[] = []
    const color: number[] = []

    position.push(0, 0, 0, X, 0, 0)
    color.push(1, 0, 0, 1, 0, 0)

    position.push(0, 0, 0, 0, 0, Z)
    color.push(0, 0, 1, 0, 0, 1)

    position.push(0, 0, 0, 0, Y, 0)
    position.push(X, 0, 0, X, Y, 0)
    position.push(0, 0, Z, 0, Y, Z)
    position.push(X, 0, Z, X, Y, Z)

    position.push(0, Y, 0, 0, Y, Z)
    position.push(X, Y, 0, X, Y, Z)
    position.push(0, Y, 0, X, Y, 0)
    position.push(0, Y, Z, X, Y, Z)

    for (let x = 1; x <= X; x += 1) position.push(x, 0, 0, x, 0, Z)
    for (let z = 1; z <= Z; z += 1) position.push(0, 0, z, X, 0, z)
    for (let i = 0; i < 8 + X + Z; i += 1) color.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8)

    return {
      position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(position)),
      color: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color)),
      length: position.length / 3
    }
  }

  private getOutlineBuffers(): GridBuffers {
    const position: number[] = []
    const color: number[] = []

    this.addCube(position, color, [1, 1, 1], [0, 0, 0], [1, 1, 1])

    return {
      position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(position)),
      color: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color)),
      length: position.length / 3
    }
  }

  private getInvisibleBlockBuffers(): GridBuffers | undefined {
    if (!this.useInvisibleBlockBuffer)
      return undefined

    const size = this.structure.getSize()
    const position: number[] = []
    const color: number[] = []

    for (let x = 0; x < size[0]; x += 1) {
      for (let y = 0; y < size[1]; y += 1) {
        for (let z = 0; z < size[2]; z += 1) {
          const block = this.structure.getBlock([x, y, z])
          if (block === undefined)
            continue;
          if (block === null) {
            this.addCube(position, color, [1, 0.25, 0.25], [x + 0.4375, y + 0.4375, z + 0.4375], [x + 0.5625, y + 0.5625, z + 0.5625])
          } else if (block.state.getName() === 'minecraft:air') {
            this.addCube(position, color, [0.5, 0.5, 1], [x + 0.375, y + 0.375, z + 0.375], [x + 0.625, y + 0.625, z + 0.625])
          }
        }
      }
    }

    return {
      position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(position)),
      color: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color)),
      length: position.length / 3
    }
  }

  private addCube(positions: number[], colors: number[], color: number[], a: number[], b: number[]) {
    positions.push(a[0], a[1], a[2], a[0], a[1], b[2])
    positions.push(b[0], a[1], a[2], b[0], a[1], b[2])
    positions.push(a[0], a[1], a[2], b[0], a[1], a[2])
    positions.push(a[0], a[1], b[2], b[0], a[1], b[2])

    positions.push(a[0], a[1], a[2], a[0], b[1], a[2])
    positions.push(b[0], a[1], a[2], b[0], b[1], a[2])
    positions.push(a[0], a[1], b[2], a[0], b[1], b[2])
    positions.push(b[0], a[1], b[2], b[0], b[1], b[2])

    positions.push(a[0], b[1], a[2], a[0], b[1], b[2])
    positions.push(b[0], b[1], a[2], b[0], b[1], b[2])
    positions.push(a[0], b[1], a[2], b[0], b[1], a[2])
    positions.push(a[0], b[1], b[2], b[0], b[1], b[2])

    for (let i = 0; i < 24; i += 1) colors.push(...color)
  }

  private createBuffer(type: number, array: ArrayBuffer) {
    const buffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, array, this.gl.DYNAMIC_DRAW);
    return buffer
  }

  private updateBuffer(buffer: WebGLBuffer, type: number, array: ArrayBuffer) {
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, array, this.gl.STATIC_DRAW);
  }

  public drawGrid(viewMatrix: mat4) {
    this.setShader(this.gridShaderProgram)

    this.setVertexAttr('vertPos', 3, this.gridBuffers.position)
    this.setVertexAttr('vertColor', 3, this.gridBuffers.color)
    this.setUniform('mView', viewMatrix)
    this.setUniform('mProj', this.projMatrix)

    this.gl.drawArrays(this.gl.LINES, 0, this.gridBuffers.length)
  }

  public drawInvisibleBlocks(viewMatrix: mat4) {
    if (!this.useInvisibleBlockBuffer)
      return
    this.setShader(this.gridShaderProgram)

    this.setVertexAttr('vertPos', 3, this.invisibleBlockBuffers!.position)
    this.setVertexAttr('vertColor', 3, this.invisibleBlockBuffers!.color)
    this.setUniform('mView', viewMatrix)
    this.setUniform('mProj', this.projMatrix)

    this.gl.drawArrays(this.gl.LINES, 0, this.invisibleBlockBuffers!.length)
  }

  public drawStructure(viewMatrix: mat4) {
    this.setShader(this.shaderProgram)

    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture)

    this.setUniform('mView', viewMatrix)
    this.setUniform('mProj', this.projMatrix)

    this.chunks.forEach(x => {
      x.forEach(y => {
        y.forEach(chunk => {
          if (!chunk.buffer) return
          this.setVertexAttr('vertPos', 3, chunk.buffer.position)
          this.setVertexAttr('texCoord', 2, chunk.buffer.texCoord)
          this.setVertexAttr('tintColor', 3, chunk.buffer.tintColor)
          this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, chunk.buffer.index)

          this.gl.drawElements(this.gl.TRIANGLES, chunk.buffer.length, this.gl.UNSIGNED_SHORT, 0)
        });
      })
    })
  }

  public drawColoredStructure(viewMatrix: mat4) {
    this.setShader(this.colorShaderProgram)

    this.setUniform('mView', viewMatrix)
    this.setUniform('mProj', this.projMatrix)

    this.chunks.forEach(x => {
      x.forEach(y => {
        y.forEach(chunk => {
          if (!chunk.buffer) return
          this.setVertexAttr('vertPos', 3, chunk.buffer.position)
          this.setVertexAttr('blockPos', 3, chunk.buffer.blockPos)
          this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, chunk.buffer.index)

          this.gl.drawElements(this.gl.TRIANGLES, chunk.buffer.length, this.gl.UNSIGNED_SHORT, 0)
        });
      })
    })
  }

  public drawOutline(viewMatrix: mat4, pos: vec3) {
    this.setShader(this.gridShaderProgram)

    this.setVertexAttr('vertPos', 3, this.outlineBuffers.position)
    this.setVertexAttr('vertColor', 3, this.outlineBuffers.color)

    const translatedMatrix = mat4.create()
    mat4.copy(translatedMatrix, viewMatrix)
    mat4.translate(translatedMatrix, translatedMatrix, pos)
    this.setUniform('mView', translatedMatrix)
    this.setUniform('mProj', this.projMatrix)

    this.gl.drawArrays(this.gl.LINES, 0, this.outlineBuffers.length)
  }

  public setViewport(x: number, y: number, width: number, height: number) {
    this.gl.viewport(x, y, width, height)
    this.projMatrix = this.getPerspective()
  }

  private setShader(shader: WebGLProgram) {
    this.gl.useProgram(shader)
    this.activeShader = shader
  }

  private setVertexAttr(name: string, size: number, buffer: WebGLBuffer | null) {
    const location = this.gl.getAttribLocation(this.activeShader, name)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
    this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0)
    this.gl.enableVertexAttribArray(location)
  }

  private setUniform(name: string, value: Float32List) {
    const location = this.gl.getUniformLocation(this.activeShader, name)    
    this.gl.uniformMatrix4fv(location, false, value)
  }
}
