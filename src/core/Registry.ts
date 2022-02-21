import { Identifier } from './Identifier'

export class Registry<T> {
	public static readonly REGISTRY = new Registry<Registry<unknown>>(Identifier.create('root'))

	private readonly storage = new Map<Identifier, T>()

	constructor(
		public readonly key: Identifier,
	) {}

	public register(id: Identifier, value: T) {
		this.storage.set(id, value)
	}

	public keys() {
		return [...this.storage.keys()]
	}

	public get(id: Identifier) {
		return this.storage.get(id)
	}

	public getOrThrow(id: Identifier) {
		const value = this.storage.get(id)
		if (value === undefined) {
			throw new Error(`Missing key in ${this.key.toString()}: ${id.toString()}`)
		}
		return value
	}
}
