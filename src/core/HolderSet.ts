import { Json } from '../util/index.js'
import { Holder } from './Holder.js'
import { Identifier } from './Identifier.js'
import type { Registry } from './Registry.js'

export class HolderSet<T>{
	constructor(
		private readonly entries: (Holder<T | HolderSet<T>>)[]
	){}

	public* getBiomes(): Iterable<Holder<T>>{
		for (const entry of this.entries) {
			const value = entry.value()
			if (value instanceof HolderSet) {
				yield* value.getBiomes()
			} else {
				yield entry as Holder<T>
			}
		}
	}
}

export namespace HolderSet {

	export function parser<T>(registry: Registry<T>) {
		return (obj: unknown) => {
			if (typeof obj === 'string') {
				if (obj.startsWith('#')) {
					return Holder.reference(registry.getTagRegistry(), Identifier.parse(obj.substring(1)))
				} else {
					return Holder.direct(new HolderSet([Holder.reference(registry, Identifier.parse(obj))]))
				}
			} else {
				return Holder.direct(direct(registry, obj))
			}
		}
	}

	export function direct<T>(registry: Registry<T>, obj: unknown, ignore_values: boolean = false){
		const root = Json.readObject(obj) ?? {}
		const entries = Json.readArray(root.values, (obj: unknown) => {
			const str = Json.readString(obj) ?? ''
			if (str.startsWith('#')) {
				return Holder.reference(registry.getTagRegistry(), Identifier.parse(str.substring(1)))
			} else {
				if (ignore_values){
					return {
						value: () => undefined,
						key: () => Identifier.parse(str),
					}
				} else {
					return Holder.reference(registry, Identifier.parse(str))
				}
			}
		}) ?? []
		return new HolderSet(entries)
	}
}
