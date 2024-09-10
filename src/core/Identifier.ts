export class Identifier {
	public static readonly DEFAULT_NAMESPACE = 'minecraft'
	public static readonly SEPARATOR = ':'

	constructor(
		public readonly namespace: string,
		public readonly path: string,
	) {}

	public is(other: string) {
		return this.equals(Identifier.parse(other))
	}

	public equals(other: unknown) {
		if (this === other) {
			return true
		}
		if (!(other instanceof Identifier)) {
			return false
		}
		return this.namespace === other.namespace && this.path === other.path
	}

	public toString() {
		return this.namespace + Identifier.SEPARATOR + this.path
	}

	public withPrefix(prefix: string) {
		return new Identifier(this.namespace, prefix + this.path)
	}

	public static create(path: string) {
		return new Identifier(this.DEFAULT_NAMESPACE, path)
	}

	public static parse(id: string) {
		const sep = id.indexOf(this.SEPARATOR)
		if (sep >= 0) {
			const namespace = sep >= 1 ? id.substring(0, sep) : this.DEFAULT_NAMESPACE
			const path = id.substring(sep + 1)
			return new Identifier(namespace, path)
		}
		return new Identifier(this.DEFAULT_NAMESPACE, id)
	}
}
