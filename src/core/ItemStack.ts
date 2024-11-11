import type { NbtTag } from '../nbt/index.js'
import { NbtCompound, NbtInt, NbtString } from '../nbt/index.js'
import { Identifier } from './Identifier.js'

export interface DefaultItemComponentProvider {
	hasComponent(key: Identifier): boolean
	getComponent<T>(key: Identifier): T | undefined
}


export class ItemStack {
	constructor(
		public id: Identifier,
		public count: number,
		public components: Map<string, NbtTag | '!'> = new Map(),
	) {}

	public getComponent<T>(key: string | Identifier, reader: (tag: NbtTag) => T, defaultProvider?: DefaultItemComponentProvider): T | undefined {
		if (typeof key === 'string') {
			key = Identifier.parse(key)
		}
		const value = this.components.get(key.toString())
		if (value === '!') {
			return undefined
		}
		if (value) {
			return reader(value)
		}
		return defaultProvider?.getComponent(key)
	}

	public hasComponent(key: string | Identifier, defaultProvider?: DefaultItemComponentProvider): boolean {
		if (typeof key === 'string') {
			key = Identifier.parse(key)
		}
		const value = this.components.get(key.toString())
		if (value === '!') {
			return false
		}
		return value !== undefined || (defaultProvider?.hasComponent(key) ?? false)
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
		let result = this.id.toString()
		if (this.components.size > 0) {
			result += `[${[...this.components.entries()].map(([k, v]) => `${k}=${v.toString()}`).join(',')}]`
		}
		if (this.count > 1) {
			result += ` ${this.count}`
		}
		return result
	}

	public toNbt() {
		const result = new NbtCompound()
			.set('id', new NbtString(this.id.toString()))
		if (this.count > 1) {
			result.set('count', new NbtInt(this.count))
		}
		if (this.components.size > 0) {
			result.set('components', new NbtCompound(new Map(Array.from(this.components).map(e => e[1] === '!' ? [`!${e[0]}`, new NbtCompound()] : e as [string, NbtTag]))))
		}
		return result
	}

	public static fromNbt(nbt: NbtCompound) {
		const id = Identifier.parse(nbt.getString('id'))
		const count = nbt.hasNumber('count') ? nbt.getNumber('count') : 1
		const components: Map<string, NbtTag | '!'> = new Map(Object.entries(
			nbt.getCompound('components').map((key, value): [string, NbtTag | '!'] => {
				if (key.startsWith('!')){
					return [Identifier.parse(key.substring(1)).toString(), '!']
				} else {
					return [Identifier.parse(key).toString(), value]
				}
			})
		))
		return new ItemStack(id, count, components)
	}
}
