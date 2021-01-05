export interface TextureUVProvider {
  part: number
  getUV(texture: string): [number, number]
}

export class BlockAtlas implements TextureUVProvider {
  public readonly width: number
  public readonly part: number
  public readonly pixelWidth: number
  private img: ImageData
  private idMap: { [id: string]: [number, number] }
  private ctx: OffscreenCanvasRenderingContext2D

  constructor(width: number) {
    this.width = Math.pow(2, Math.ceil(Math.log(width)/Math.log(2)))
    this.pixelWidth = this.width * 16
    this.part = 1 / this.width
    const canvas = new OffscreenCanvas(this.pixelWidth, this.pixelWidth)
    this.ctx = canvas.getContext('2d')!
    this.ctx.fillStyle = 'black'
    this.ctx.fillRect(0, 0, 16, 16)
    this.ctx.fillStyle = 'magenta'
    this.ctx.fillRect(0, 0, 8, 8)
    this.ctx.fillRect(8, 8, 8, 8)
    this.img = this.ctx.getImageData(0, 0, this.pixelWidth, this.pixelWidth)
    this.idMap = {}
  }

  public getImageData() {
    return this.img
  }

  public getUV(id: string) {
    return this.idMap[id] ?? [0, 0]
  }

  public createTexture(gl: WebGLRenderingContext) {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture
  }

  public static async fromBlobs(textures: { [id: string]: Blob }): Promise<BlockAtlas> {
    const textureCount = Object.keys(textures).length
    const atlas = new BlockAtlas(Math.sqrt(textureCount + 1))

    let index = 1
    await Promise.all(Object.keys(textures).map(async (id) => {
      const u = (index % atlas.width)
      const v = Math.floor(index / atlas.width)
      index += 1
      atlas.idMap[id] = [atlas.part * u, atlas.part * v]
      const img = await createImageBitmap(textures[id])
      atlas.img = atlas.ctx.getImageData(0, 0, atlas.pixelWidth, atlas.pixelWidth)
      atlas.ctx.drawImage(img, 0, 0, 16, 16, 16 * u, 16 * v, 16, 16)
    }))
    return atlas
  }
}
