import type { NbtTag } from '../nbt/index.js'
import { Identifier } from './Identifier.js'

export class ItemStack {
	constructor(
		public id: Identifier,
		public count: number,
		public components: Map<string, NbtTag> = new Map(),
	) {}
	
	public getComponent<T>(key: string | Identifier, reader: (tag: NbtTag) => T) {
		const value = this.components.get(key.toString())
		if (value) {
			return reader(value)
		}
		return undefined
	}

	public clone(): ItemStack {
		// Component values are not cloned because they are assumed to be immutable
		const components = new Map(this.components)
		return new ItemStack(this.id, this.count, components)
	}

	public is(other: string | Identifier | ItemStack) {
		if (typeof other === 'string') {
			return this.id.equals(Identifier.parse(other))
		}
		if (other instanceof Identifier) {
			return this.id.equals(other)
		}
		return this.id.equals(other.id)
	}

	public equals(other: unknown) {
		if (this === other) {
			return true
		}
		if (!(other instanceof ItemStack)) {
			return false
		}
		return this.count === other.count && this.isSameItemSameComponents(other)
	}

	public isSameItemSameComponents(other: ItemStack) {
		if (!this.id.equals(other.id) || this.components.size !== other.components.size) {
			return false
		}
		for (const [key, value] of this.components) {
			const otherValue = other.components.get(key)
			if (value.toString() !== otherValue?.toString()) {
				return false
			}
		}
		return true
	}

	public toString() {
		return this.id.toString() + (this.count > 1 ? ` ${this.count}` : '')
	}
}
