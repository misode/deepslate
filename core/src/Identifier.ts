export class Identifier {
	public static readonly DEFAULT_NAMESPACE = 'minecraft'
	public static readonly SEPARATOR = ':'

	constructor(
		public readonly namespace: string,
		public readonly path: string,
	) {
		if (!namespace.match(/^[a-z0-9._-]+$/)) {
			throw new Error(`Non [a-z0-9._-] character in namespace of ${namespace}:${path}`)
		}
		if (!path.match(/^[a-z0-9/._-]+$/)) {
			throw new Error(`Non [a-z0-9/._-] character in path of ${namespace}:${path}`)
		}
	}

	public equals(other: Identifier) {
		if (this === other) {
			return true
		}
		return this.namespace === other.namespace && this.path === other.path
	}

	public toString() {
		return `${this.namespace}:${this.path}`
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
