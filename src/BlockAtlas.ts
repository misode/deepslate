export class BlockAtlas {
  public readonly width: number
  public readonly part: number
  public readonly pixelWidth: number
  private img: ImageData
  private ctx: OffscreenCanvasRenderingContext2D

  private constructor(width: number) {
    this.width = Math.pow(2, Math.ceil(Math.log(width)/Math.log(2)))
    this.pixelWidth = this.width * 16
    this.part = 1 / this.width
    const canvas = new OffscreenCanvas(this.pixelWidth, this.pixelWidth)
    this.ctx = canvas.getContext('2d')!
    this.img = this.ctx.getImageData(0, 0, this.pixelWidth, this.pixelWidth)
  }

  public getImageData() {
    return this.img
  }

  public static async fromUrls(urls: string[]): Promise<BlockAtlas> {
    const atlas = new BlockAtlas(Math.sqrt(urls.length))
    await Promise.all(urls.map(u => BlockAtlas.loadImage(u))).then((blockImages) => {
      blockImages.forEach((img, i) => {
        const dx = 16 * (i % atlas.width)
        const dy = 16 * Math.floor(i / atlas.width)
        if (img) {
          atlas.ctx.drawImage(img, dx, dy)
        } else {
          atlas.ctx.fillStyle = 'black'
          atlas.ctx.fillRect(dx, dy, 16, 16)
          atlas.ctx.fillStyle = `rgb(255, 0, 255)`
          atlas.ctx.fillRect(dx, dy, 8, 8)
          atlas.ctx.fillRect(dx + 8, dy + 8, 8, 8)
        }
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
