export class BlockAtlas {
  public readonly width: number
  public readonly part: number
  public readonly pixelWidth: number
  private img: ImageData
  private idMap: { [id: string]: number[] }
  private ctx: OffscreenCanvasRenderingContext2D

  constructor(width: number) {
    this.width = Math.pow(2, Math.ceil(Math.log(width)/Math.log(2)))
    this.pixelWidth = this.width * 16
    this.part = 1 / this.width
    const canvas = new OffscreenCanvas(this.pixelWidth, this.pixelWidth)
    this.ctx = canvas.getContext('2d')!
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

  public static async fromIds(ids: string[]): Promise<BlockAtlas> {
    const atlas = new BlockAtlas(Math.sqrt(ids.length + 1))
    atlas.ctx.fillStyle = 'black'
    atlas.ctx.fillRect(0, 0, 16, 16)
    atlas.ctx.fillStyle = 'magenta'
    atlas.ctx.fillRect(0, 0, 8, 8)
    atlas.ctx.fillRect(8, 8, 8, 8)

    let index = 1

    await Promise.all(ids
      .map(b => `/assets/minecraft/textures/${b}.png`)
      .map(u => BlockAtlas.loadImage(u)
      )).then((blockImages) => {
      blockImages.forEach((img, i) => {
        if (!img) return
        const u = (index % atlas.width)
        const v = Math.floor(index / atlas.width)
        atlas.idMap[ids[i]] = [atlas.part * u, atlas.part * v]
        atlas.ctx.drawImage(img, 0, 0, 16, 16, 16 * u, 16 * v, 16, 16)
        index += 1
      })
      atlas.img = atlas.ctx.getImageData(0, 0, atlas.pixelWidth, atlas.pixelWidth)
    })
    return atlas
  }

  private static async loadImage(url: string): Promise<HTMLImageElement | null> {
    const img = new Image()
    return new Promise((res, rej) => {
      img.onload = () => res(img)
      img.onerror = () => res(null)
      img.src = url
    })
  }
}
