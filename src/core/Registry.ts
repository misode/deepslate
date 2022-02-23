import { Holder } from './Holder'
import { Identifier } from './Identifier'

export class Registry<T> {
	public static readonly REGISTRY = new Registry<Registry<unknown>>(Identifier.create('root'))

	private readonly storage = new Map<string, T>()
	private readonly builtin = new Map<string, T>()

	constructor(
		public readonly key: Identifier,
		private readonly parser?: (obj: unknown) => T,
	) {}

	public register(id: Identifier, value: T, builtin?: boolean): Holder<T> {
		this.storage.set(id.toString(), value)
		if (builtin) {
			this.builtin.set(id.toString(), value)
		}
		return Holder.reference(this, id)
	}

	public keys() {
		return [...this.storage.keys()].map(e => Identifier.parse(e))
	}

	public get(id: Identifier) {
		return this.storage.get(id.toString())
	}

	public getOrThrow(id: Identifier) {
		const value = this.storage.get(id.toString())
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
}
