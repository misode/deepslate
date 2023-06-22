import { Holder } from './Holder.js'
import type { HolderSet } from './HolderSet.js'
import { Identifier } from './Identifier.js'

export class Registry<T> {
	public static readonly REGISTRY = new Registry<Registry<unknown>>(Identifier.create('root'))

	private readonly storage = new Map<string, T | (() => T)>()
	private readonly builtin = new Map<string, T | (() => T)>()
	private tags: Registry<HolderSet<T>> | undefined = undefined

	constructor(
		public readonly key: Identifier,
		private readonly parser?: (obj: unknown) => T,
	) { }

	public static createAndRegister<T>(name: string, parser?: (obj: unknown) => T): Registry<T> {
		const registry = new Registry<T>(Identifier.create(name), parser)
		Registry.REGISTRY.register(registry.key, registry)
		return registry
	}

	public register(id: Identifier, value: T | (() => T), builtin?: boolean): Holder<T> {
		this.storage.set(id.toString(), value)
		if (builtin) {
			this.builtin.set(id.toString(), value)
		}
		return Holder.reference(this, id)
	}

	public delete(id: Identifier) {
		const deleted = this.storage.delete(id.toString())
		this.builtin.delete(id.toString())
		return deleted
	}

	public keys() {
		return [...this.storage.keys()].map(e => Identifier.parse(e))
	}

	public has(id: Identifier) {
		return this.storage.has(id.toString())
	}

	public get(id: Identifier) {
		var value = this.storage.get(id.toString())
		if (value instanceof Function){
			value = value()
			this.storage.set(id.toString(), value)
		}

		return value
	}

	public getOrThrow(id: Identifier) {
		const value = this.get(id)
		if (value === undefined) {
			throw new Error(`Missing key in ${this.key.toString()}: ${id.toString()}`)
		}
		return value
	}

	public parse(obj: unknown) {
		if (!this.parser) {
			throw new Error(`No parser exists for ${this.key.toString()}`)
		}
		return this.parser(obj)
	}

	public clear() {
		this.storage.clear()
		for (const [key, value] of this.builtin.entries()) {
			this.storage.set(key, value)
		}

		if (this.tags){
			this.tags.clear()
		}
		return this
	}

	public assign(other: Registry<T>) {
		if (!this.key.equals(other.key)) {
			throw new Error(`Cannot assign registry of type ${other.key.toString()} to registry of type ${this.key.toString()}`)
		}
		for (const key of other.keys()) {
			this.storage.set(key.toString(), other.getOrThrow(key))
		}
		return this
	}

	public cloneEmpty() {
		return new Registry(this.key, this.parser)
	}

	public forEach(fn: (key: Identifier, value: T, registry: Registry<T>) => void) {
		for (const [key, value] of this.storage.entries()) {
			fn(Identifier.parse(key), value instanceof Function ? value() : value, this)
		}
	}

	public map<U>(fn: (key: Identifier, value: T, registry: Registry<T>) => U): U[] {
		return [...this.storage.entries()].map(([key, value]) => {
			return fn(Identifier.parse(key), value instanceof Function ? value() : value, this)
		})
	}

	public getTagRegistry() {
		if (this.tags === undefined) {
			this.tags = new Registry<HolderSet<T>>(new Identifier(this.key.namespace, `tags/${this.key.path}`))
		}
		return this.tags
	}

}
