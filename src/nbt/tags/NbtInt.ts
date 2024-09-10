import type { JsonValue } from '../../util/Json.js'
import { Json } from '../../util/Json.js'
import type { DataInput, DataOutput } from '../io/index.js'
import { NbtTag } from './NbtTag.js'
import { NbtType } from './NbtType.js'

export class NbtInt extends NbtTag {
	private readonly value: number

	constructor(value: number) {
		super()
		this.value = value
	}

	public override getId() {
		return NbtType.Int
	}

	public override equals(other: NbtTag): boolean {
		return other.isInt() && this.value === other.value
	}

	public override getAsNumber() {
		return this.value
	}

	public override toString() {
		return this.value.toFixed()
	}

	public override toPrettyString() {
		return this.toString()
	}

	public override toSimplifiedJson() {
		return this.value
	}

	public override toJson() {
		return this.value
	}

	public override toBytes(output: DataOutput) {
		output.writeInt(this.value)
	}

	public static create() {
		return new NbtInt(0)
	}

	public static fromJson(value: JsonValue) {
		return new NbtInt(Json.readInt(value) ?? 0)
	}

	public static fromBytes(input: DataInput) {
		const value = input.readInt()
		return new NbtInt(value)
	}
}

NbtTag.register(NbtType.Int, NbtInt)
