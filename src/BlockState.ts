export class BlockState {
  constructor(
    private name: string,
    private properties: { [key: string]: string } = {}
  ) {}

  getName() {
    return this.name
  }

  getProperties() {
    return this.properties
  }

  getProperty(key: string) {
    return this.properties[key]
  }

  equals(other: BlockState) {
    if (this.name !== other.name) {
      return false
    }
    return Object.keys(this.properties).every(p => {
      return other.properties[p] === this.properties[p]
    })
  }

  toString() {
    return `${this.name}[${Object.entries(this.properties).map(([k, v]) => k + '=' + v).join(',')}]`
  }
}
