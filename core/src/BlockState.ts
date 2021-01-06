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
}
