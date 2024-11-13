import { Identifier, NbtTag, Registry } from "../index.js"


export class Item {
	private static REGISTRY: Registry<Item>

	public static getRegistry() {
		if (this.REGISTRY === undefined){
			this.REGISTRY = Registry.createAndRegister<Item>('item')
		}
		return this.REGISTRY
	}

	constructor(
		public components: Map<string, NbtTag> = new Map(),
	) {
	}

	public getComponent<T>(key: string | Identifier, reader: (tag: NbtTag) => T) {
		if (typeof key === 'string') {
			key = Identifier.parse(key)
		}
		const value = this.components.get(key.toString())
		if (value) {
			return reader(value)
		}
		return undefined
	}

	public hasComponent(key: string | Identifier) {
		if (typeof key === 'string') {
			key = Identifier.parse(key)
		}
		return this.components.has(key.toString())
	}
}