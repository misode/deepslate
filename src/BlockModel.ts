import { BlockAtlas } from "./BlockAtlas";

type Direction = 'up' | 'down' | 'north' | 'east' | 'south' | 'west'

type BlockModelElement = {
  from: number[]
  to: number[]
  faces?: {
    [key in Direction]: {
      texture: string
    }
  }
}

export class BlockModel {
  constructor(
    private elements: BlockModelElement[],
    public textures: { [key: string]: string }
  ) {}

  public getBuffers(atlas: BlockAtlas, i: number, xOffset: number, yOffset: number, zOffset: number, tex: number) {
    const position: number[] = []
    const texCoord: number[] = []
    const index: number[] = []
    let indexOffset = i

    for (const element of this.elements) {
      const buffers = this.getElementBuffers(atlas, indexOffset, element, xOffset, yOffset, zOffset, tex)
      position.push(...buffers.position)
      texCoord.push(...buffers.texCoord)
      index.push(...buffers.index)
      indexOffset += buffers.texCoord.length / 2
    }
    
    return { position, texCoord, index }
  }

  private getElementBuffers(atlas: BlockAtlas, i: number, element: BlockModelElement, x: number, y: number, z: number, tex: number) {
    const p = atlas.part
    const x0 = element.from[0] / 16
    const y0 = element.from[1] / 16
    const z0 = element.from[2] / 16
    const x1 = element.to[0] / 16
    const y1 = element.to[1] / 16
    const z1 = element.to[2] / 16
    const xp0 = x0 * p
    const xq0 = (1 - x1) * p
    const yp0 = (1 - y0) * p
    const zp0 = z0 * p
    const zq0 = (1 - z1) * p
    const xp1 = x1 * p
    const xq1 = (1 - x0) * p
    const yp1 = (1 - y1) * p
    const zp1 = z1 * p
    const zq1 = (1 - z0) * p

    const position = []
    const texCoord = []
    const index = []
    let face
    let u = 0
    let v = 0
    if ((face = element.faces?.up) && face?.texture) {
      [u, v] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y1,  z + z0,
        x + x0,  y + y1,  z + z1,
        x + x1,  y + y1,  z + z1,
        x + x1,  y + y1,  z + z0)
      texCoord.push(
        u + zp0, v + xq1,
        u + zp1, v + xq1,
        u + zp1, v + xq0,
        u + zp0, v + xq0)
      index.push(
        i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    if ((face = element.faces?.down) && face?.texture) {
      [u, v] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y0,  z + z0,
        x + x1,  y + y0,  z + z0,
        x + x1,  y + y0,  z + z1,
        x + x0,  y + y0,  z + z1)
      texCoord.push(
        u + zq1, v + xq1,
        u + zq1, v + xq0,
        u + zq0, v + xq0,
        u + zq0, v + xq1)
      index.push(
        i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    if ((face = element.faces?.south) && face?.texture) {
      [u, v] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y0,  z + z1,
        x + x1,  y + y0,  z + z1,
        x + x1,  y + y1,  z + z1,
        x + x0,  y + y1,  z + z1)
      texCoord.push(
        u + xp0, v + yp0,
        u + xp1, v + yp0,
        u + xp1, v + yp1,
        u + xp0, v + yp1)
      index.push(
        i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = element.faces?.north) && face?.texture) {
      [u, v] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y0,  z + z0,
        x + x0,  y + y1,  z + z0,
        x + x1,  y + y1,  z + z0,
        x + x1,  y + y0,  z + z0)
      texCoord.push(
        u + xq1, v + yp0,
        u + xq1, v + yp1,
        u + xq0, v + yp1,
        u + xq0, v + yp0)
      index.push(
        i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = element.faces?.east) && face?.texture) {
      [u, v] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x1,  y + y0,  z + z0,
        x + x1,  y + y1,  z + z0,
        x + x1,  y + y1,  z + z1,
        x + x1,  y + y0,  z + z1)
      texCoord.push(
        u + zq1, v + yp0,
        u + zq1, v + yp1,
        u + zq0, v + yp1,
        u + zq0, v + yp0)
      index.push(
        i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }
    if ((face = element.faces?.west) && face?.texture) {
      [u, v] = atlas.getUV(this.getTexture(face.texture))
      position.push(
        x + x0,  y + y0,  z + z0,
        x + x0,  y + y0,  z + z1,
        x + x0,  y + y1,  z + z1,
        x + x0,  y + y1,  z + z0)
      texCoord.push(
        u + zp0, v + yp0,
        u + zp1, v + yp0,
        u + zp1, v + yp1,
        u + zp0, v + yp1)
      index.push(
        i+0, i+1, i+2, i+0, i+2, i+3)
      i += 4
    }

    return { position, texCoord, index }
  }

  private getTexture(textureRef: string) {
    return this.textures[textureRef.slice(1)]
  }

  public static async fromUrl(url: string) {
    const res = await fetch(url)
    const data = await res.json()
    return new BlockModel(data.elements ?? [], data.textures ?? {})
  }
}
