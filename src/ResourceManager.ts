import jszip from 'jszip'
import { BlockAtlas } from './BlockAtlas'
import { BlockModel, BlockModelProvider } from './BlockModel'
import { BlockDefinition } from './BlockDefinition'

export class ResourceManager implements BlockModelProvider {
  private blockDefinitions: { [id: string]: BlockDefinition }
  private blockModels: { [id: string]: BlockModel }
  private blockAtlas: BlockAtlas

  constructor() {
    this.blockDefinitions = {}
    this.blockModels = {}
    this.blockAtlas = new BlockAtlas(1)
  }

  public getBlockDefinition(id: string) {
    return this.blockDefinitions[id]
  }

  public getBlockModel(id: string) {
    return this.blockModels[id]
  }

  public getTextureUV(id: string) {
    return this.blockAtlas.getUV(id)
  }

  public getBlockAtlas() {
    return this.blockAtlas
  }

  public async loadFromZip(url: string) {
    const assetsBuffer = await (await fetch(url)).arrayBuffer()
    const assets = await jszip.loadAsync(assetsBuffer)
    await this.loadFromFolderJson(assets.folder('minecraft/blockstates')!, async (id, data) => {
      id = 'minecraft:' + id
      this.blockDefinitions[id] = BlockDefinition.fromJson(id, data)
    })
    await this.loadFromFolderJson(assets.folder('minecraft/models/block')!, async (id, data) => {
      id = 'minecraft:block/' + id
      this.blockModels[id] = BlockModel.fromJson(id, data)
    })
    const textures: { [id: string]: Blob } = {}
    await this.loadFromFolderPng(assets.folder('minecraft/textures/block')!, async (id, data) => {
      textures['minecraft:block/' + id] = data
    })
    this.blockAtlas = await BlockAtlas.fromBlobs(textures)
    Object.values(this.blockModels).forEach(m => m.flatten(this))
  }

  private loadFromFolderJson(folder: jszip, callback: (id: string, data: any) => Promise<void>) {
    const promises: Promise<void>[] = []
    folder.forEach((path, file) => {
      if (file.dir || !path.endsWith('.json')) return
      const id = path.replace(/\.json$/, '')
      promises.push(file.async('text').then(data => callback(id, JSON.parse(data))))
    })
    return Promise.all(promises)
  }

  private loadFromFolderPng(folder: jszip, callback: (id: string, data: Blob) => Promise<void>) {
    const promises: Promise<void>[] = []
    folder.forEach((path, file) => {
      if (file.dir || !path.endsWith('.png')) return
      const id = path.replace(/\.png$/, '')
      promises.push(file.async('blob').then(data => callback(id, data)))
    })
    return Promise.all(promises)
  }
}
