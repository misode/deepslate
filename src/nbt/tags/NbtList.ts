import type { JsonValue } from '../../util/index.js'
import { Json } from '../../util/index.js'
import type { DataInput, DataOutput } from '../io/index.js'
import { NbtAbstractList } from './NbtAbstractList.js'
import type { NbtByte } from './NbtByte.js'
import type { NbtByteArray } from './NbtByteArray.js'
import { NbtCompound } from './NbtCompound.js'
import type { NbtDouble } from './NbtDouble.js'
import type { NbtFloat } from './NbtFloat.js'
import type { NbtInt } from './NbtInt.js'
import type { NbtIntArray } from './NbtIntArray.js'
import type { NbtLong } from './NbtLong.js'
import type { NbtLongArray } from './NbtLongArray.js'
import type { NbtShort } from './NbtShort.js'
import type { NbtString } from './NbtString.js'
import { NbtTag } from './NbtTag.js'
import { NbtType } from './NbtType.js'

export class NbtList<T extends NbtTag = NbtTag> extends NbtAbstractList<T> {
	private type: number

	constructor(items?: T[], type?: number) {
		super(items ?? [])
		this.type = this.items.length === 0 ? NbtType.End : (type ?? this.items[0].getId()) 
	}

	public static make<U extends NbtTag, V>(factory: { new(v: V): U }, items: V[]) {
		return new NbtList(items.map(v => new factory(v)))
	}

	public override getId() {
		return NbtType.List
	}

	public override equals(other: NbtTag): boolean {
		return other.isList()
			&& this.type === other.type
			&& this.length === other.length
			&& this.items.every((item, i) => item.equals(other.items[i]))
	}

	public override getType() {
		return this.type
	}

	public getNumber(index: number) {
		const entry = this.get(index)
		if (entry?.isNumber()) {
			return entry.getAsNumber()
		}
		return 0
	}

	public getString(index: number) {
		const entry = this.get(index)
		if (entry?.isString()) {
			return entry.getAsString()
		}
		return ''
	}

	public getList(index: number, type: NbtType.Byte): NbtList<NbtByte>
	public getList(index: number, type: NbtType.Short): NbtList<NbtShort>
	public getList(index: number, type: NbtType.Int): NbtList<NbtInt>
	public getList(index: number, type: NbtType.Long): NbtList<NbtLong>
	public getList(index: number, type: NbtType.Float): NbtList<NbtFloat>
	public getList(index: number, type: NbtType.Double): NbtList<NbtDouble>
	public getList(index: number, type: NbtType.ByteArray): NbtList<NbtByteArray>
	public getList(index: number, type: NbtType.String): NbtList<NbtString>
	public getList(index: number, type: NbtType.List): NbtList<NbtList>
	public getList(index: number, type: NbtType.Compound): NbtList<NbtCompound>
	public getList(index: number, type: NbtType.IntArray): NbtList<NbtIntArray>
	public getList(index: number, type: NbtType.LongArray): NbtList<NbtLongArray>
	public getList(index: number, type: NbtType): NbtList {
		const entry = this.get(index)
		if (entry?.isList() && entry.getType() === type) {
			return entry
		}
		return NbtList.create()
	}

	public getCompound(index: number) {
		const entry = this.get(index)
		if (entry?.isCompound()) {
			return entry
		}
		return NbtCompound.create()
	}

	public set(index: number, tag: T) {
		this.updateType(tag)
		super.set(index, tag)
	}

	public add(tag: T) {
		this.updateType(tag)
		super.add(tag)
	}

	public insert(index: number, tag: T) {
		this.updateType(tag)
		super.insert(index, tag)
	}

	private updateType(tag: NbtTag) {
		if (tag.getId() === NbtType.End) {
			return
		} else if (this.type === NbtType.End) {
			this.type = tag.getId()
		} else if (this.type !== tag.getId()) {
			throw new Error(`Trying to add tag of type ${NbtType[tag.getId()]} to list of ${NbtType[this.type]}`)
		}
	}

	public clear() {
		super.clear()
		this.type = NbtType.End
	}

	public override toString() {
		return '[' + this.items.map(i => i.toString()).join(',') + ']'
	}

	public override toPrettyString(indent = '  ', depth = 0) {
		if (this.length === 0) return '[]'
		const i = indent.repeat(depth)
		const ii = indent.repeat(depth + 1)
		return '[\n' + this.map(value => {
			return ii + value.toPrettyString(indent, depth + 1)
		}).join(',\n') + '\n' + i + ']'
	}

	public override toSimplifiedJson() {
		return this.map(e => e.toSimplifiedJson())
	}

	public override toJson() {
		return {
			type: this.type,
			items: this.items.map(e => e.toJson()),
		}
	}

	public override toBytes(output: DataOutput) {
		if (this.items.length === 0) {
			this.type = NbtType.End
		} else {
			this.type = this.items[0].getId()
		}
		output.writeByte(this.type)
		output.writeInt(this.items.length)
		for (const tag of this.items) {
			tag.toBytes(output)
		}
	}

	public static create() {
		return new NbtList()
	}

	public static fromJson(value: JsonValue) {
		const obj = Json.readObject(value) ?? {}
		const type = Json.readNumber(obj.type) ?? NbtType.Compound
		const items = (Json.readArray(obj.items) ?? [])
			.flatMap(v => v !== undefined ? [NbtTag.fromJson(v, type)] : [])
		return new NbtList(items, type)
	}

	public static fromBytes(input: DataInput) {
		const type = input.readByte()
		const length = input.readInt()
		if (type === NbtType.End && length > 0) {
			throw new Error(`Missing type on ListTag but length is ${length}`)
		}
		const items = []
		for (let i = 0; i < length; i += 1) {
			items.push(NbtTag.fromBytes(input, type))
		}
		return new NbtList(items, type)
	}
}

NbtTag.register(NbtType.List, NbtList)
