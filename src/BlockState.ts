
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

  public getModel(props: { [key: string]: string }): ModelVariant {
    const matches = Object.keys(this.variants).filter(v => this.matchesVariant(v, props))
    if (matches.length === 0) {
      throw new Error(`Cannot find a blockstate match for ${this.id} using properties ${JSON.stringify(props)}`)
    }
    const variant = this.variants[matches[0]]
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

  public static fromJson(id: string, data: any) {
    return new BlockState(id, data.variants)
  }
}
