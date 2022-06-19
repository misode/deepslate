import { Identifier } from './Identifier.js'
import type { Registry } from './Registry.js'

export interface Holder<T> {
	value(): T
	key(): Identifier | undefined
}

export namespace Holder {
	export function parser<T>(registry: Registry<T>, directParser: (obj: unknown) => T) {
		return (obj: unknown) => {
			if (typeof obj === 'string') {
				return reference(registry, Identifier.parse(obj))
			} else {
				return direct(directParser(obj))
			}
		}
	}

	export function direct<T>(value: T, id?: Identifier): Holder<T> {
		return {
			value: () => value,
			key: () => id,
		}
	}

	export function reference<T>(registry: Registry<T>, id: Identifier): Holder<T> {
		return {
			value: () => registry.getOrThrow(id),
			key: () => id,
		}
	}
}
