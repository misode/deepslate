export namespace Json {
	export function readNumber(obj: unknown) {
		return typeof obj === 'number' ? obj : undefined
	}

	export function readInt(obj: unknown) {
		return typeof obj === 'number' ? Math.floor(obj) : undefined
	}

	export function readString(obj: unknown) {
		return typeof obj === 'string' ? obj : undefined
	}

	export function readBoolean(obj: unknown) {
		return typeof obj === 'boolean' ? obj : undefined
	}

	export function readObject(obj: unknown) {
		return typeof obj === 'object' && obj !== null
			? obj as { [key: string]: unknown }
			: undefined
	}

	export function readArray<T>(obj: unknown, parser: (obj: unknown) => T) {
		if (!Array.isArray(obj)) return undefined
		return obj.map(el => parser(el))
	}

	export function readMap<T>(obj: unknown, parser: (obj: unknown) => T) {
		const root = readObject(obj) ?? {}
		return Object.fromEntries(Object.entries(root).map(([k, v]) => [k, parser(v)]))
	}

	export function compose<T, U>(obj: unknown, parser: ((obj: unknown) => T | undefined), mapper: (result: T) => U) {
		const result = parser(obj)
		return result ? mapper(result) : undefined
	}
}
