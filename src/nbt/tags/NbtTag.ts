import type { JsonValue } from '../../util/index.js'
import { Json, StringReader } from '../../util/index.js'
import type { DataInput, DataOutput } from '../io/index.js'
import type { NbtByte } from './NbtByte.js'
import type { NbtByteArray } from './NbtByteArray.js'
import type { NbtCompound } from './NbtCompound.js'
import type { NbtDouble } from './NbtDouble.js'
import type { NbtEnd } from './NbtEnd.js'
import type { NbtFloat } from './NbtFloat.js'
import type { NbtInt } from './NbtInt.js'
import type { NbtIntArray } from './NbtIntArray.js'
import type { NbtList } from './NbtList.js'
import type { NbtLong } from './NbtLong.js'
import type { NbtLongArray } from './NbtLongArray.js'
import type { NbtShort } from './NbtShort.js'
import type { NbtString } from './NbtString.js'
import { NbtType } from './NbtType.js'

interface NbtTypeTag {
	create(): NbtTag,
	getName(): string,
	fromString(reader: StringReader): NbtTag
	fromJson(value: JsonValue): NbtTag,
	fromBytes(input: DataInput): NbtTag,
}

export abstract class NbtTag {
	private static readonly TYPES = new Map<NbtType, NbtTypeTag>()

	public static register(type: NbtType, typeTag: NbtTypeTag) {
		NbtTag.TYPES.set(type, typeTag)
	}

	public isEnd(): this is NbtEnd {
		return this.getId() === NbtType.End
	}

	public isByte(): this is NbtByte {
		return this.getId() === NbtType.Byte
	}

	public isShort(): this is NbtShort {
		return this.getId() === NbtType.Short
	}

	public isInt(): this is NbtInt {
		return this.getId() === NbtType.Int
	}

	public isLong(): this is NbtLong {
		return this.getId() === NbtType.Long
	}

	public isFloat(): this is NbtFloat {
		return this.getId() === NbtType.Float
	}

	public isDouble(): this is NbtDouble {
		return this.getId() === NbtType.Double
	}

	public isByteArray(): this is NbtByteArray {
		return this.getId() === NbtType.ByteArray
	}

	public isString(): this is NbtString {
		return this.getId() === NbtType.String
	}

	public isList(): this is NbtList {
		return this.getId() === NbtType.List
	}

	public isCompound(): this is NbtCompound {
		return this.getId() === NbtType.Compound
	}

	public isIntArray(): this is NbtIntArray {
		return this.getId() === NbtType.IntArray
	}

	public isLongArray(): this is NbtLongArray {
		return this.getId() === NbtType.LongArray
	}

	public isNumber(): this is NbtByte | NbtShort | NbtInt | NbtLong | NbtFloat | NbtDouble {
		return this.isByte() || this.isShort() || this.isInt() || this.isLong() || this.isFloat() || this.isDouble()
	}

	public isArray(): this is NbtByteArray | NbtIntArray | NbtLongArray {
		return this.isByteArray() || this.isIntArray() || this.isLongArray()
	}

	public isListOrArray(): this is NbtList | NbtByteArray | NbtIntArray | NbtLongArray {
		return this.isList() || this.isArray()
	}

	public getAsNumber() {
		return 0
	}

	public getAsString() {
		return ''
	}

	public toJsonWithId(): JsonValue {
		return {
			id: this.getId(),
			tag: this.toJson(),
		}
	}

	public abstract getId(): number

	public abstract toString(): string

	public abstract toPrettyString(indent?: string, depth?: number): string

	public abstract toJson(): JsonValue

	public abstract toSimplifiedJson(): JsonValue

	public abstract toBytes(output: DataOutput): void

	private static getType(id: NbtType) {
		const type = this.TYPES.get(id)
		if (!type) {
			throw new Error(`Invalid tag id ${id}`)
		}
		return type
	}

	public static create(id: NbtType) {
		return this.getType(id).create()
	}

	public static getName(id: NbtType) {
		return this.getType(id).getName()
	}

	public static fromString(input: string | StringReader) {
		const reader = typeof input === 'string' ? new StringReader(input) : input
		return this.getType(NbtType.Compound).fromString(reader)
	}

	public static fromJson(value: JsonValue, id: NbtType = NbtType.Compound) {
		return this.getType(id).fromJson(value)
	}

	public static fromJsonWithId(value: JsonValue) {
		const obj = Json.readObject(value)
		const id = Json.readInt(obj.id) ?? 0
		return NbtTag.fromJson(obj.value ?? {}, id)
	}

	public static fromBytes(input: DataInput, id: NbtType = NbtType.Compound) {
		return this.getType(id).fromBytes(input)
	}
}
