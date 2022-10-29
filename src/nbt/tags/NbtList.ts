import type { JsonValue } from '../../util/index.js'
import { Json } from '../../util/index.js'
import type { DataInput, DataOutput } from '../io/index.js'
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

export abstract class NbtAbstractList<T extends NbtTag> extends NbtTag {
	protected items: T[]

	constructor(items: T[]) {
		super()
		this.items = items
	}

	public abstract getType(): number

	public getItems() {
		return this.items.slice(0)
	}

	public getAsTuple<U>(length: 1, mapper: (t?: T) => U): [U]
	public getAsTuple<U>(length: 2, mapper: (t?: T) => U): [U, U]
	public getAsTuple<U>(length: 3, mapper: (t?: T) => U): [U, U, U]
	public getAsTuple<U>(length: 4, mapper: (t?: T) => U): [U, U, U, U]
	public getAsTuple<U>(length: number, mapper: (t?: T) => U) {
		return [...Array(length)].map((_, i) => mapper(this.items[i]))
	}

	public get(index: number) {
		index = Math.floor(index)
		if (index < 0 || index >= this.items.length) {
			return undefined
		}
		return this.items[index]
	}

	public get length() {
		return this.items.length
	}

	public map<U>(fn: (value: T, index: number) => U): U[] {
		return this.items.map(fn)
	}

	public filter(fn: (value: T, index: number) => boolean): T[] {
		return this.items.filter(fn)
	}

	public forEach(fn: (entry: T, index: number) => void) {
		this.items.forEach(fn)
	}

	public set(index: number, tag: T) {
		this.items[index] = tag
	}

	public add(tag: T) {
		this.items.push(tag)
	}

	public insert(index: number, tag: T) {
		this.items.splice(index, 0, tag)
	}

	public delete(index: number) {
		this.items.splice(index, 1)
	}

	public clear() {
		this.items = []
	}
}

export class NbtList<T extends NbtTag = NbtTag> extends NbtAbstractList<T> {
	private type: number

	constructor(items?: T[], type?: number) {
		super(items ?? [])
		this.type = this.items.length === 0 ? NbtType.End : (type ?? this.items[0].getId()) 
	}

	public override getId() {
		return NbtType.List
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
			id: this.type,
			tag: this.items.map(e => e.toJson()),
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
		const id = Json.readNumber(obj.id) ?? NbtType.Compound
		const items = Json.readArray(obj.tag) ?? []
		const items2 = items.flatMap(v => v !== undefined ? [NbtTag.fromJson(v, id)] : [])
		return new NbtList(items2, id)
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
