import { Identifier } from './Identifier.js'
import type { Registry } from './Registry.js'

export interface Holder<T> {
	value(): T
	key(): Identifier | undefined
}

export namespace Holder {
	export function parser<T>(registry: Registry<T>, directParser: (obj: unknown) => T): (obj: unknown) => Holder<T>{
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

	export function reference<T>(registry: Registry<T>, id: Identifier): Holder<T>	
	export function reference<T>(registry: Registry<T>, id: Identifier, required: true): Holder<T>	
	export function reference<T>(registry: Registry<T>, id: Identifier, required: boolean): Holder<T | undefined>	
	export function reference<T>(registry: Registry<T>, id: Identifier, required: boolean = true): Holder<T | undefined> {
		if (required){
			return {
				value: () => registry.getOrThrow(id),
				key: () => id,
			}
		} else {
			return {
				value: () => registry.get(id),
				key: () => id,
			}
		}
	}
}
