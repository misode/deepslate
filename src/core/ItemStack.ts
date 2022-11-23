import { NbtCompound } from '../nbt/index.js'
import type { Identifier } from './Identifier.js'

export class ItemStack {
	constructor(
		public id: Identifier,
		public count: number,
		public tag: NbtCompound = new NbtCompound(),
	) {}

	public toString() {
		return this.id.toString() + (this.tag.size > 0 ? this.tag.toString() : '') + (this.count > 1 ? ` ${this.count}` : '')
	}
}
