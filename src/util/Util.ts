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
	if (existing) {
		return existing
	}
	const value = getter(key)
	map.set(key, value)
	return value
}
