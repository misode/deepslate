import { NbtTag } from "../nbt/index.js"
import { Identifier } from "./index.js"
import { Registry } from "./Registry.js"


export class Item {
	public static REGISTRY = Registry.createAndRegister<Item>('item')

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