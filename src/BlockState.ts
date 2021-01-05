import { glMatrix, mat4 } from "gl-matrix"
import { TextureUVProvider } from "./BlockAtlas"
import { BlockModelProvider } from "./BlockModel"
import { transformVectors } from "./Util"

type ModelVariant = {
  model: string
  x?: number
  y?: number
  uvlock?: boolean
}

type WeightedModelVariant = ModelVariant & {
  weight?: number
}

type ModelVariantEntry = ModelVariant | WeightedModelVariant[]

export interface BlockStateProvider {
  getBlockState(id: string): BlockState | null
}

export class BlockState {
  constructor(
    private id: string,
    private variants: { [key: string]: ModelVariantEntry }
  ) {
    this.variants = variants
  }

  public allModels(): ModelVariant[] {
    return Array.from(new Set(
      Object.values(this.variants)
        .map(v => Array.isArray(v) ? v : [v])
        .reduce((x, y) => [...x, ...y], [])
      ))
  }

  public getModelVariant(props: { [key: string]: string }): ModelVariant {
    const matches = Object.keys(this.variants).filter(v => this.matchesVariant(v, props))
    if (matches.length === 0) {
      throw new Error(`Cannot find a blockstate match for ${this.id} using properties ${JSON.stringify(props)}`)
    }
    const variant = this.variants[matches[0]]
    return Array.isArray(variant) ? variant[0] : variant
  }

  public getBuffers(props: { [key: string]: string }, textureUVProvider: TextureUVProvider, blockModelProvider: BlockModelProvider, offset: number) {
    const variant = this.getModelVariant(props)
    const buffers = blockModelProvider.getBlockModel(variant.model)!.getBuffers(textureUVProvider, offset)

    const t = mat4.create()
    mat4.identity(t)
    mat4.scale(t, t, [0.0625, 0.0625, 0.0625])
    if (variant.x || variant.y) {
      mat4.translate(t, t, [8, 8, 8])
      mat4.rotateX(t, t, -glMatrix.toRadian(variant.x ?? 0))
      mat4.rotateY(t, t, -glMatrix.toRadian(variant.y ?? 0))
      mat4.translate(t, t, [-8, -8, -8])
    }
    const positions = new Float32Array(buffers.position)
    transformVectors(positions, t)

    return {
      position: positions,
      texCoord: buffers.texCoord,
      index: buffers.index
    }
  }

  private matchesVariant(variant: string, props: { [key: string]: string }): boolean {
    return variant.split(',').every(p => {
      const [k, v] = p.split('=')
      return props[k] === v
    })
  }

  public static fromJson(id: string, data: any) {
    return new BlockState(id, data.variants)
  }
}
