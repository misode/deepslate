import { NbtByte, NbtCompound, NbtDouble, NbtInt, NbtList, NbtString, NbtTag } from "./index.js"

export function jsonToNbt(value: unknown): NbtTag {
	if (typeof value === 'string') {
		return new NbtString(value)
	}
	if (typeof value === 'number') {
		return Number.isInteger(value) ? new NbtInt(value) : new NbtDouble(value)
	}
	if (typeof value === 'boolean') {
		return new NbtByte(value)
	}
	if (Array.isArray(value)) {
		return new NbtList(value.map(jsonToNbt))
	}
	if (typeof value === 'object' && value !== null) {
		return new NbtCompound(
			new Map(Object.entries(value ?? {})
				.map(([k, v]) => [k, jsonToNbt(v)]))
		)
	}
	return new NbtByte(0)
}
