import { NbtByte, NbtCompound, NbtDouble, NbtInt, NbtList, NbtString, NbtTag } from "../index.js"

export function lazy<T>(getter: () => T): () => T {
	let value: T | null = null
	return () => {
		if (value == null) {
			value = getter()
		}
		return value
	}
}

export function computeIfAbsent<K, V>(map: Map<K, V>, key: K, getter: (key: K) => V): V {
	const existing = map.get(key)
	if (existing !== undefined) {
		return existing
	}
	const value = getter(key)
	map.set(key, value)
	return value
}

export function mutateWithDefault<K, V>(map: Map<K, V>, key: K, initialValue: V, mutator: (value: V, key: K) => void): V {
	const existing = map.get(key)
	const value = existing ?? initialValue
	mutator(value, key)
	map.set(key, value)
	return value
}

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
