import { NbtCompound } from '../nbt/index.js'
import { Identifier } from './Identifier.js'
import { Item } from './world/Item.js'

export class ItemStack {
	private item: Item | undefined

	constructor(
		public id: Identifier,
		public count: number,
		public tag: NbtCompound = new NbtCompound(),
	) {}

	public getItem() {
		if (this.item === undefined) {
			this.item = Item.get(this.id)
		}
		return this.item
	}

	public clone(): ItemStack {
		const tag = NbtCompound.fromJson(this.tag.toJson())
		return new ItemStack(this.id, this.count, tag)
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
		return this.id.equals(other.id)
			&& this.count === other.count
			&& this.tag.toString() == other.tag.toString()
	}

	public toString() {
		return this.id.toString() + (this.tag.size > 0 ? this.tag.toString() : '') + (this.count > 1 ? ` ${this.count}` : '')
	}
}
