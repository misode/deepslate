import type { JsonValue } from '../../util/index.js'
import { Json } from '../../util/index.js'
import type { DataInput, DataOutput } from '../io/index.js'
import { NbtAbstractList } from './NbtAbstractList.js'
import type { NbtLongPair } from './NbtLong.js'
import { NbtLong } from './NbtLong.js'
import { NbtTag } from './NbtTag.js'
import { NbtType } from './NbtType.js'

export class NbtLongArray extends NbtAbstractList<NbtLong> {
	constructor(items?: ArrayLike<NbtLongPair | bigint | NbtLong>) {
		super(Array.from(items ?? [], e => typeof e === 'bigint' || Array.isArray(e) ? new NbtLong(e) : e))
	}

	public override getId() {
		return NbtType.LongArray
	}

	public override equals(other: NbtTag): boolean {
		return other.isLongArray()
			&& this.length === other.length
			&& this.items.every((item, i) => item.equals(other.items[i]))
	}

	public override getType() {
		return NbtType.Long
	}

	public get length() {
		return this.items.length
	}

	public override toString() {
		const entries = this.items.map(e => e.toString())
		return '[I;' + entries.join(',') + ']'
	}

	public override toPrettyString() {
		return this.toString()
	}

	public override toSimplifiedJson() {
		return this.items.map(e => e.getAsPair())
	}

	public override toJson(): JsonValue {
		return this.items.map(e => e.getAsPair())
	}
	
	public override toBytes(output: DataOutput) {
		output.writeInt(this.items.length)
		for (const entry of this.items) {
			const [hi, lo] = entry.getAsPair()
			output.writeInt(hi)
			output.writeInt(lo)
		}
	}

	public static create() {
		return new NbtLongArray()
	}
	
	public static fromJson(value: JsonValue) {
		const items = Json.readArray(value, e =>
			Json.readPair(e, f => Json.readNumber(f) ?? 0) ?? ([0, 0] as NbtLongPair)
		) ?? []
		return new NbtLongArray(items)
	}

	public static fromBytes(input: DataInput) {
		const length = input.readInt()
		const items: NbtLongPair[] = []
		for (let i = 0; i < length; i += 1) {
			items.push([input.readInt(), input.readInt()])
		}
		return new NbtLongArray(items)
	}
}

NbtTag.register(NbtType.LongArray, NbtLongArray)
