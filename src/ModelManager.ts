import { BlockModel } from "./BlockModel";

export class ModelManager {
  private static readonly INVALID = new BlockModel([{from: [0, 0, 0], to: [16, 16, 16], faces: {up: {texture: '#invalid'}, down: {texture: '#invalid'}, north: {texture: '#invalid'}, east: {texture: '#invalid'}, south: {texture: '#invalid'}, west: {texture: '#invalid'}}}], {})
  constructor(
    private blockModels: { [id: string]: BlockModel }
  ) {}

  public getModel(id: string) {
    return this.blockModels[id] ?? ModelManager.INVALID
  }

  public static async fromIds(ids: string[]): Promise<ModelManager> {
    const manager = new ModelManager({})
    await Promise.all(ids
      .map(b => `/assets/minecraft/models/block/${b}.json`)
      .map(u => ModelManager.loadModel(u))
      ).then(blockModels => {
        blockModels.forEach((m, i) => {
          if (!m) return
          manager.blockModels[ids[i]] = m
        })
      })
    return manager
  }

  public static async loadModel(url: string) {
    try {
      const res = await fetch(url)
      const data = await res.json()
      return new BlockModel(data.elements ?? [], data.textures ?? {})
    } catch(e) {
      return null
    }
  }
}
