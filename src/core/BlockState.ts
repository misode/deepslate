import { getOptional, getTag, NamedNbtTag } from "../nbt"

export class BlockState {
  constructor(
    private name: string,
    private properties: { [key: string]: string } = {}
  ) {}

  public getName() {
    return this.name
  }

  public getProperties() {
    return this.properties
  }

  public getProperty(key: string) {
    return this.properties[key]
  }

  public equals(other: BlockState) {
    if (this.name !== other.name) {
      return false
    }
    return Object.keys(this.properties).every(p => {
      return other.properties[p] === this.properties[p]
    })
  }

  public toString() {
    return `${this.name}[${Object.entries(this.properties).map(([k, v]) => k + '=' + v).join(',')}]`
  }

  public static fromNbt(nbt: NamedNbtTag) {
    const name = getTag(nbt.value, 'Name', 'string')
    const propsTag = getOptional(() => getTag(nbt.value, 'Properties', 'compound'), {})
    const properties = Object.keys(propsTag)
      .reduce((acc, k) => ({...acc, [k]: getTag(propsTag, k, 'string')}), {})
    return new BlockState(name, properties)
  }
}
