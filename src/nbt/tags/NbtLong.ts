import type { JsonValue } from '../../util/index.js'
import type { DataInput, DataOutput } from '../io/index.js'
import { NbtTag } from './NbtTag.js'
import { NbtType } from './NbtType.js'

export type NbtLongPair = [number, number]

export class NbtLong extends NbtTag {
	private static readonly dataview = new DataView(new Uint8Array(8).buffer)
	private readonly value: NbtLongPair

	constructor(value: NbtLongPair | bigint) {
		super()
		this.value = NbtLong.toPair(value)
	}

	public static toPair(value: NbtLongPair | bigint): NbtLongPair {
		return Array.isArray(value) ? value : NbtLong.bigintToPair(value)
	}

	public static bigintToPair(value: bigint): NbtLongPair {
		NbtLong.dataview.setBigInt64(0, value)
		return [NbtLong.dataview.getInt32(0), NbtLong.dataview.getInt32(4)]
	}

	public static pairToBigint(value: NbtLongPair): bigint {
		NbtLong.dataview.setInt32(0, Number(value[0]))
		NbtLong.dataview.setInt32(4, Number(value[1]))
		return NbtLong.dataview.getBigInt64(0)
	}

	public static pairToString(value: NbtLongPair): string {
		return NbtLong.pairToBigint(value).toString()
	}

	public static pairToNumber(value: NbtLongPair): number {
		return Number(NbtLong.pairToBigint(value))
	}

	public override getId() {
		return NbtType.Long
	}

	public override equals(other: NbtTag): boolean {
		return other.isLong()
			&& this.value[0] === other.value[0]
			&& this.value[1] === other.value[1]
	}

	public override getAsNumber() {
		return NbtLong.pairToNumber(this.value)
	}

	public getAsPair() {
		return this.value
	}

	public toBigInt() {
		return NbtLong.pairToBigint(this.value)
	}

	public override toString() {
		return NbtLong.pairToString(this.value) + 'L'
	}

	public override toPrettyString() {
		return this.toString()
	}

	public override toSimplifiedJson() {
		return NbtLong.pairToNumber(this.value)
	}

	public override toJson() {
		return this.value
	}
	
	public override toBytes(output: DataOutput) {
		output.writeInt(this.value[0])
		output.writeInt(this.value[1])
	}

	public static create () {
		return new NbtLong([0, 0])
	}

	public static fromJson(value: JsonValue) {
		return new NbtLong(Array.isArray(value) && value.length === 2
			? value.map(e => typeof e === 'number' ? e : 0) as NbtLongPair
			: [0, 0])
	}

	public static fromBytes(input: DataInput) {
		const lo = input.readInt()
		const hi = input.readInt()
		return new NbtLong([lo, hi])
	}
}

NbtTag.register(NbtType.Long, NbtLong)
