import { Identifier } from './Identifier'
import type { Registry } from './Registry'

export type Holder<T> = () => T

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

	export function direct<T>(value: T): Holder<T> {
		return () => value
	}

	export function reference<T>(registry: Registry<T>, id: Identifier): Holder<T> {
		return () => registry.getOrThrow(id)
	}
}
