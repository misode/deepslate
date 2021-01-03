import { BlockAtlas } from "./BlockAtlas";
import { ModelManager } from "./ModelManager";

type Direction = 'up' | 'down' | 'north' | 'east' | 'south' | 'west'

type BlockModelElement = {
  from: number[]
  to: number[]
  faces?: {
    [key in Direction]: {
      texture: string
      uv?: number[]
    }
  }
}

export class BlockModel {
  private flattened: boolean
  constructor(
    private parent: string | undefined,
    private textures: { [key: string]: string } | undefined,
    private elements: BlockModelElement[] | undefined,
  ) {
    this.flattened = false
  }

  public getBuffers(atlas: BlockAtlas, i: number, xOffset: number, yOffset: number, zOffset: number) {
    const position: number[] = []
    const texCoord: number[] = []
    const index: number[] = []
    let indexOffset = i

    for (const element of this.elements ?? []) {
      const buffers = this.getElementBuffers(atlas, indexOffset, element, xOffset, yOffset, zOffset)
      position.push(...buffers.position)
      texCoord.push(...buffers.texCoord)
      index.push(...buffers.index)
      indexOffset += buffers.texCoord.length / 2
    }
    
    return { position, texCoord, index }
  }

  private getElementBuffers(atlas: BlockAtlas, i: number, e: BlockModelElement, x: number, y: number, z: number) {
    const p = atlas.part
    const x0 = e.from[0] / 16
    const y0 = e.from[1] / 16
    const z0 = e.from[2] / 16
    const x1 = e.to[0] / 16
    const y1 = e.to[1] / 16
    const z1 = e.to[2] / 16

    const position = []
    const texCoord: number[] = []
    const index = []

    let face
    let u0 = 0
    let v0 = 0
    let uv = [0, 0, 0, 0]

    function transformUV(uv: number[]) {
      return uv.map(e => p * e / 16)
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
      position.push(
        x + x0,  y + y1,  z + z0,
        x + x0,  y + y1,  z + z1,
        x + x1,  y + y1,  z + z1,
        x + x1,  y + y1,  z + z0)
      uv = transformUV(face.uv ?? [e.from[2], 16-e.from[0], e.to[2], 16-e.to[0]])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    if ((face = e.faces?.down) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y0,  z + z0,
        x + x1,  y + y0,  z + z0,
        x + x1,  y + y0,  z + z1,
        x + x0,  y + y0,  z + z1)
      uv = transformUV(face.uv ?? [16-e.from[2], 16-e.from[0], 16-e.to[2], 16-e.to[0]])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    if ((face = e.faces?.south) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y0,  z + z1,
        x + x1,  y + y0,  z + z1,
        x + x1,  y + y1,  z + z1,
        x + x0,  y + y1,  z + z1)
      uv = transformUV(face.uv ?? [e.from[0], 16-e.to[1], e.to[0], 16-e.from[1]])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = e.faces?.north) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x1,  y + y0,  z + z0,
        x + x0,  y + y0,  z + z0,
        x + x0,  y + y1,  z + z0,
        x + x1,  y + y1,  z + z0)
      uv = transformUV(face.uv ?? [16-e.to[0], 16-e.to[1], 16-e.from[0], 16-e.from[1]])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = e.faces?.east) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x1,  y + y0,  z + z1,
        x + x1,  y + y0,  z + z0,
        x + x1,  y + y1,  z + z0,
        x + x1,  y + y1,  z + z1)
      uv = transformUV(face.uv ?? [16-e.to[2], 16-e.to[1], 16-e.from[2], 16-e.from[1]])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = e.faces?.west) && face?.texture) {
      [u0, v0] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y0,  z + z0,
        x + x0,  y + y0,  z + z1,
        x + x0,  y + y1,  z + z1,
        x + x0,  y + y1,  z + z0)
      uv = transformUV(face.uv ?? [e.to[2], 16-e.to[1], e.from[2], 16-e.from[1]])
      pushTexCoord()
      index.push(i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    return { position, texCoord, index }
  }

  private getTexture(textureRef: string) {
    while (textureRef.startsWith('#')) {
      textureRef = this.textures?.[textureRef.slice(1)] ?? ''
    }
    return textureRef
  }

  public flatten(manager: ModelManager) {
    if (!this.flattened && this.parent) {
      const parent = manager.getModel(this.parent)
      parent.flatten(manager)
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
}
