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
    Object.keys(this.properties).forEach(p => {
      if (other.properties[p] !== this.properties[p]) {
        return false
      }
    })
    return true
  }
}
