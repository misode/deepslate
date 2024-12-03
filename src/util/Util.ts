
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
