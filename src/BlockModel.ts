import { glMatrix, mat4, vec3 } from "gl-matrix";
import { BlockAtlas } from "./BlockAtlas";
import { mergeFloat32Arrays } from "./Util";

type Direction = 'up' | 'down' | 'north' | 'east' | 'south' | 'west'

type BlockModelElement = {
  from: number[]
  to: number[]
  rotation?: {
    origin: [number, number, number]
    axis: 'x' | 'y' | 'z',
    angle: number
  }
  faces?: {
    [key in Direction]: {
      texture: string
      uv?: number[]
    }
  }
}

export interface BlockModelProvider {
  getBlockModel(id: string): BlockModel | null
}

export class BlockModel {
  private flattened: boolean
  constructor(
    private id: string,
    private parent: string | undefined,
    private textures: { [key: string]: string } | undefined,
    private elements: BlockModelElement[] | undefined,
  ) {
    this.flattened = false
  }

  public getBuffers(atlas: BlockAtlas, offset: number, xOffset: number, yOffset: number, zOffset: number) {
    const positions: Float32Array[] = []
    const texCoord: number[] = []
    const index: number[] = []

    for (const element of this.elements ?? []) {
      const buffers = this.getElementBuffers(atlas, offset, element, xOffset, yOffset, zOffset)
      positions.push(buffers.position)
      texCoord.push(...buffers.texCoord)
      index.push(...buffers.index)
      offset += buffers.texCoord.length / 2
    }

    return {
      position: mergeFloat32Arrays(...positions),
      texCoord,
      index
    }
  }

  private getElementBuffers(atlas: BlockAtlas, i: number, e: BlockModelElement, x: number, y: number, z: number) {
    const x0 = e.from[0]
    const y0 = e.from[1]
    const z0 = e.from[2]
    const x1 = e.to[0]
    const y1 = e.to[1]
    const z1 = e.to[2]

    const pos: number[] = []
    const texCoord: number[] = []
    const index = []

    let face
    let u0 = 0
    let v0 = 0
    let uv = [0, 0, 0, 0]

    function readUv(inUv: number[]) {
      inUv.forEach((e, i) => uv[i] = atlas.part * e / 16)
    }

    function pushTexCoord() {
      texCoord.push(
        u0 + uv[0], v0 + uv[3],
        u0 + uv[2], v0 + uv[3],
        u0 + uv[2], v0 + uv[1],
        u0 + uv[0], v0 + uv[1])
    }

    if ((face = e.faces?.up) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      pos.push(x0, y1, z0,  x0, y1, z1,  x1, y1, z1,  x1, y1, z0)
      readUv(face.uv ?? [z0, 16 - x0, z1, 16 - x1])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    if ((face = e.faces?.down) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      pos.push(x0, y0, z0,  x1, y0, z0,  x1, y0, z1,  x0, y0, z1)
      readUv(face.uv ?? [16 - z0, 16 - x0, 16 - z1, 16 - x1])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    if ((face = e.faces?.south) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      pos.push(x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1)
      readUv(face.uv ?? [x0, 16 - y1, x1, 16 - y0])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = e.faces?.north) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      pos.push(x1, y0, z0,  x0, y0, z0,  x0, y1, z0,  x1, y1, z0)
      readUv(face.uv ?? [16 - x1, 16 - y1, 16 - x0, 16 - y0])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = e.faces?.east) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      pos.push(x1, y0, z1,  x1, y0, z0,  x1, y1, z0,  x1, y1, z1)
      readUv(face.uv ?? [16 - z1, 16 - y1, 16 - z0, 16 - y0])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = e.faces?.west) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      pos.push(x0, y0, z0,  x0, y0, z1,  x0, y1, z1,  x0, y1, z0)
      readUv(face.uv ?? [z1, 16 - y1, z0, 16 - y0])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    const mPos = mat4.create()
    mat4.identity(mPos)
    mat4.translate(mPos, mPos, [x, y, z])
    mat4.scale(mPos, mPos, [0.0625, 0.0625, 0.0625])
    if (e.rotation) {
      const origin = vec3.fromValues(...e.rotation.origin)
      mat4.translate(mPos, mPos, origin)
      mat4.rotate(mPos, mPos, glMatrix.toRadian(e.rotation.angle),
        e.rotation.axis === 'y' ? [0, 1, 0] : e.rotation.axis === 'x' ? [1, 0, 0] : [0, 0, 1])
      vec3.negate(origin, origin)
      mat4.translate(mPos, mPos, origin)
    }

    const position = new Float32Array(pos)
    let a = vec3.create()
    for(let i = 0; i < position.length; i += 3) {
      vec3.transformMat4(a, position.slice(i, i + 3), mPos)
      position.set(a, i)
    }

    return { position, texCoord, index }
  }

  private getTexture(textureRef: string) {
    while (textureRef.startsWith('#')) {
      textureRef = this.textures?.[textureRef.slice(1)] ?? ''
    }
    if (!textureRef.startsWith('minecraft:')) {
      textureRef = 'minecraft:' + textureRef
    }
    return textureRef
  }

  public flatten(accessor: BlockModelProvider) {
    if (!this.flattened && this.parent) {
      const parent = accessor.getBlockModel(this.parent)
      if (!parent) {
        console.warn(`parent ${this.parent} does not exist!`)
        this.flattened = true
        return
      }
      parent.flatten(accessor)
      if (!this.elements) {
        this.elements = parent.elements
      }
      if (!this.textures) {
        this.textures = {}
      }
      Object.keys(parent.textures ?? {}).forEach(t => {
        if (!this.textures![t]) {
          this.textures![t] = parent.textures![t]
        }
      })
      this.flattened = true
    }
  }

  public textureReferences() {
    return Object.values(this.textures ?? {})
      .filter(t => !t.startsWith('#'))
  }

  public static fromJson(id: string, data: any) {
    let parent = data.parent as string | undefined
    if (parent && !parent.startsWith('minecraft:')) {
      parent = 'minecraft:' + parent
    }
    return new BlockModel(id, parent, data.textures, data.elements)
  }
}
