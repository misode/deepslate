
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

type BlockStateVariants = {
  [key: string]: ModelVariantEntry
}

export interface BlockStateProvider {
  getBlockState(id: string): BlockState | null
}

export class BlockState {
  private variants: BlockStateVariants

  constructor(variants: BlockStateVariants) {
    this.variants = variants
  }

  public allModels(): ModelVariant[] {
    return Array.from(new Set(
      Object.values(this.variants)
        .map(v => Array.isArray(v) ? v : [v])
        .reduce((x, y) => [...x, ...y], [])
      ))
  }

  public getModel(props: { [key: string]: string }): ModelVariant {
    const v = Object.keys(this.variants).filter(v => this.matchesVariant(v, props))[0]
    const variant = this.variants[v]
    if (Array.isArray(variant)) {
      // TODO: return random variant
      return variant[0]
    } else {
      return variant
    }
  }

  private matchesVariant(variant: string, props: { [key: string]: string }): boolean {
    return variant.split(',').every(p => {
      const [k, v] = p.split('=')
      return props[k] === v
    })
  }

  public static fromJson(data: any) {
    return new BlockState(data.variants)
  }
}
