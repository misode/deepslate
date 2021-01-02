import { BlockAtlas } from "./BlockAtlas";


type BlockModelElement = {
  from: number[]
  to: number[]
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
    const x0 = element.from[0] / 16
    const y0 = element.from[1] / 16
    const z0 = element.from[2] / 16
    const x1 = element.to[0] / 16
    const y1 = element.to[1] / 16
    const z1 = element.to[2] / 16
    const position = [
      x + x0,  y + y0,  z + z1, // Front
      x + x1,  y + y0,  z + z1,
      x + x1,  y + y1,  z + z1,
      x + x0,  y + y1,  z + z1,
      x + x0,  y + y0,  z + z0, // Back
      x + x0,  y + y1,  z + z0,
      x + x1,  y + y1,  z + z0,
      x + x1,  y + y0,  z + z0,
      x + x0,  y + y1,  z + z0, // Top
      x + x0,  y + y1,  z + z1,
      x + x1,  y + y1,  z + z1,
      x + x1,  y + y1,  z + z0,
      x + x0,  y + y0,  z + z0, // Bottom
      x + x1,  y + y0,  z + z0,
      x + x1,  y + y0,  z + z1,
      x + x0,  y + y0,  z + z1,
      x + x1,  y + y0,  z + z0, // Bottom
      x + x1,  y + y1,  z + z0,
      x + x1,  y + y1,  z + z1,
      x + x1,  y + y0,  z + z1,
      x + x0,  y + y0,  z + z0, // Left
      x + x0,  y + y0,  z + z1,
      x + x0,  y + y1,  z + z1,
      x + x0,  y + y1,  z + z0,
    ];
    let u = atlas.part * (tex % atlas.width)
    let v = atlas.part * (Math.floor(tex / atlas.width))
    const xp0 = x0 * atlas.part
    const xq0 = (1 - x1) * atlas.part
    const yp0 = (1 - y0) * atlas.part
    const zp0 = z0 * atlas.part
    const zq0 = (1 - z1) * atlas.part
    const xp1 = x1 * atlas.part
    const xq1 = (1 - x0) * atlas.part
    const yp1 = (1 - y1) * atlas.part
    const zp1 = z1 * atlas.part
    const zq1 = (1 - z0) * atlas.part
    const texCoord = [
      u + xp0, v + yp0, // Front
      u + xp1, v + yp0,
      u + xp1, v + yp1,
      u + xp0, v + yp1,
      u + xq1, v + yp0, // Back
      u + xq1, v + yp1,
      u + xq0, v + yp1,
      u + xq0, v + yp0,
      u + zp0, v + xq1, // Top
      u + zp1, v + xq1,
      u + zp1, v + xq0,
      u + zp0, v + xq0,
      u + zq1, v + xq1, // Bottom
      u + zq1, v + xq0,
      u + zq0, v + xq0,
      u + zq0, v + xq1,
      u + zq1, v + yp0, // Right
      u + zq1, v + yp1,
      u + zq0, v + yp1,
      u + zq0, v + yp0,
      u + zp0, v + yp0, // Left
      u + zp1, v + yp0,
      u + zp1, v + yp1,
      u + zp0, v + yp1,
    ];
    const index = [
      i+0,  i+1,  i+2,    i+0,  i+2,  i+3,    // Front
      i+4,  i+5,  i+6,    i+4,  i+6,  i+7,    // Back
      i+8,  i+9,  i+10,   i+8,  i+10, i+11,   // Top
      i+12, i+13, i+14,   i+12, i+14, i+15,   // Bottom
      i+16, i+17, i+18,   i+16, i+18, i+19,   // Right
      i+20, i+21, i+22,   i+20, i+22, i+23,   // Left
    ];
    return { position, texCoord, index }
  }

  public static async fromUrl(url: string) {
    const res = await fetch(url)
    const data = await res.json()
    return new BlockModel(data.elements ?? [], data.textures ?? {})
  }
}
