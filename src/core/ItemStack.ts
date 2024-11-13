import { NbtParser } from '../nbt/NbtParser.js'
import type { NbtTag } from '../nbt/index.js'
import { NbtCompound, NbtInt, NbtString } from '../nbt/index.js'
import { StringReader } from '../util/index.js'
import { Holder } from './Holder.js'
import { Identifier } from './Identifier.js'
import { Item } from './Item.js'

export class ItemStack {
	public readonly item: Holder<Item | undefined>

	constructor(
		id: Identifier,
		public count: number,
		public components: Map<string, NbtTag> = new Map(),
	) {
		this.item = Holder.reference(Item.getRegistry(), id, false)
	}

	public getComponent<T>(key: string | Identifier, reader: (tag: NbtTag) => T, includeDefaultComponents: boolean = true): T | undefined {
		if (typeof key === 'string') {
			key = Identifier.parse(key)
		}

		if (this.components.has('!' + key.toString())){
			return undefined
		}
		const value = this.components.get(key.toString())
		if (value) {
			return reader(value)
		}
		return includeDefaultComponents ? this.item.value()?.getComponent(key, reader) : undefined
	}

	public hasComponent(key: string | Identifier, includeDefaultComponents: boolean = true): boolean {
		if (typeof key === 'string') {
			key = Identifier.parse(key)
		}
		if (this.components.has('!' + key.toString())){
			return false
		}

		return this.components.has(key.toString()) || (includeDefaultComponents && (this.item.value()?.hasComponent(key) ?? false))
	}

	public clone(): ItemStack {
		// Component values are not cloned because they are assumed to be immutable
		const components = new Map(this.components)
		return new ItemStack(this.item.key()!, this.count, components)
	}

	public is(other: string | Identifier | ItemStack) {
		if (typeof other === 'string') {
			return this.item.key()!.equals(Identifier.parse(other))
		}
		if (other instanceof Identifier) {
			return this.item.key()!.equals(other)
		}
		return this.item.key()!.equals(other.item.key())
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
		if (!this.item.key()!.equals(other.item.key()) || this.components.size !== other.components.size) {
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
		let result = this.item.key()!.toString()
		if (this.components.size > 0) {
			result += `[${[...this.components.entries()].map(([k, v]) => `${k}=${v.toString()}`).join(',')}]`
		}
		if (this.count > 1) {
			result += ` ${this.count}`
		}
		return result
	}

	public static fromString(string: string) {
		const reader = new StringReader(string)
		
		while (reader.canRead() && reader.peek() !== '[') {
			reader.skip()
		}
		const itemId = Identifier.parse(reader.getRead())
		if (!reader.canRead()){
			return new ItemStack(itemId, 1)
		}

		const components = new Map<string, NbtTag>()
		reader.skip()
		if (reader.peek() === ']'){
			return new ItemStack(itemId, 1, components)
		}
		do{
			if (reader.peek() === '!'){
				reader.skip()
				const start = reader.cursor
				while (reader.canRead() && reader.peek() !== ']' && reader.peek() !== ',') {
					reader.skip()
				}
				components.set('!' + Identifier.parse(reader.getRead(start)).toString(), new NbtCompound())
			} else {
				const start = reader.cursor
				while (reader.canRead() && reader.peek() !== '=') {
					reader.skip()
				}
				const component = Identifier.parse(reader.getRead(start)).toString()
				if (!reader.canRead()) break;
				reader.skip()
				const tag = NbtParser.readTag(reader)
				components.set(component, tag)
			}
			if (!reader.canRead()) break;
			if (reader.peek() === ']'){
				return new ItemStack(itemId, 1, components)
			}
			if (reader.peek() !== ','){
				throw new Error('Expected , or ]')
			}
			reader.skip()
		} while (reader.canRead())
		throw new Error('Missing closing ]')
	}

	public toNbt() {
		const result = new NbtCompound()
			.set('id', new NbtString(this.item.key()!.toString()))
		if (this.count > 1) {
			result.set('count', new NbtInt(this.count))
		}
		if (this.components.size > 0) {
			result.set('components', new NbtCompound(this.components))
		}
		return result
	}

	public static fromNbt(nbt: NbtCompound) {
		const id = Identifier.parse(nbt.getString('id'))
		const count = nbt.hasNumber('count') ? nbt.getNumber('count') : 1
		const components = new Map(Object.entries(
			nbt.getCompound('components').map((key, value) => [Identifier.parse(key).toString(), value])
		))
		return new ItemStack(id, count, components)
	}
}
