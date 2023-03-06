import { Json } from '../util/index.js'
import { Holder } from './Holder.js'
import { Identifier } from './Identifier.js'
import type { Registry } from './Registry.js'

export type HolderSet<T> = Iterable<Holder<T>>

export namespace HolderSet {
	export function* create<T>(entires: (Holder<T | HolderSet<T>>)[]): HolderSet<T> {
		for (const entry of entires) {
			if (Symbol.iterator in entry.value) {
				yield* entry.value() as HolderSet<T>
			} else {
				yield entry as Holder<T>
			}
		}
	}

	export function parser<T>(registry: Registry<T>) {
		return (obj: unknown) => {
			if (typeof obj === 'string') {
				if (obj.startsWith('#')) {
					return Holder.reference(registry.getTagRegistry(), Identifier.parse(obj.substring(1)))
				} else {
					return Holder.direct(create([Holder.reference(registry, Identifier.parse(obj))]))
				}
			} else {
				const root = Json.readObject(obj) ?? {}
				const entries = Json.readArray(root.values, (obj: unknown) => {
					const str = Json.readString(obj) ?? ''
					if (str.startsWith('#')) {
						return Holder.reference(registry.getTagRegistry(), Identifier.parse(str.substring(1)))
					} else {
						return Holder.reference(registry, Identifier.parse(str))
					}
				}) ?? []
				return Holder.direct(create(entries))
			}
		}
	}
}
