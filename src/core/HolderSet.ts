import { Json } from '../util/index.js'
import { Holder } from './Holder.js'
import { Identifier } from './Identifier.js'
import type { Registry } from './Registry.js'

export class HolderSet<T>{
	constructor(
		private readonly entries: (Holder<T | HolderSet<T> | undefined>)[]
	){}

	public static parser<T>(registry: Registry<T>, valueParser?: (obj: unknown) => Holder<T>) {

		const defaultedValueParser = valueParser ?? ((obj) => Holder.reference(registry, Identifier.parse(Json.readString(obj) ?? '')))

		return (obj: unknown) => {
			if (typeof obj === 'string') {
				if (obj.startsWith('#')) {
					return Holder.reference(registry.getTagRegistry(), Identifier.parse(obj.substring(1)))
				} else {
					return Holder.direct(new HolderSet<T>([]))
				}
			} else  {
				return Holder.direct(new HolderSet(Json.readArray(obj, defaultedValueParser) ?? []) ?? [])
			}
		}
	}

	public static fromJson<T>(registry: Registry<T>, obj: unknown, id?: Identifier): HolderSet<T>{
		const root = Json.readObject(obj) ?? {}

		const replace = Json.readBoolean(root.replace) ?? false

		const entries: Holder<T | HolderSet<T> | undefined>[] = Json.readArray(root.values, (obj) => {
			var required: boolean = true
			var id: string = ''

			if (typeof obj === 'string'){
				id = obj
			} else {
				const entry = Json.readObject(obj) ?? {}
				required = Json.readBoolean(entry.required) ?? false
				id = Json.readString(entry.id) ?? ''
			} 

			if (id.startsWith('#')){
				return Holder.reference(registry.getTagRegistry(), Identifier.parse(id.substring(1)), required)
			} else {
				return Holder.reference(registry, Identifier.parse(id), required)
			}
		}) ?? []

		if (id && !replace && registry.getTagRegistry().has(id)){
			entries?.push(Holder.direct(registry.getTagRegistry().get(id)!))
		}

		return new HolderSet(entries)
	}	

	public* getEntries(): Iterable<Holder<T>>{
		for (const entry of this.entries) {
			const value = entry.value()
			if (value === undefined){
				continue
			}
			
			if (value instanceof HolderSet) {
				yield* value.getEntries()
			} else {
				yield entry as Holder<T>
			}
		}
	}
}
