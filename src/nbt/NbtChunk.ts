import type { JsonValue } from '../util/index.js'
import { Json } from '../util/index.js'
import type { NbtCompressionMode } from './NbtFile.js'
import { NbtFile } from './NbtFile.js'
import type { NbtCompound } from './tags/NbtCompound.js'

export type NbtChunkResolver = (x: number, z: number) => Promise<NbtFile>

export class NbtChunk {
	private file?: NbtFile
	private dirty: boolean

	constructor(
		public readonly x: number,
		public readonly z: number,
		public compression: NbtCompressionMode,
		public timestamp: number,
		private raw: Uint8Array,
	) {
		this.dirty = false
	}

	public getFile() {
		if (this.file === undefined) {
			this.file = NbtFile.read(this.raw, { compression: this.compression })
		}
		return this.file
	}

	public getRoot() {
		return this.getFile().root
	}

	public setRoot(root: NbtCompound) {
		if (this.file === undefined) {
			this.file = NbtFile.create({ compression: this.compression })
		}
		this.file.root = root
		this.markDirty()
	}

	public markDirty() {
		this.dirty = true
	}

	public getRaw() {
		if (this.file === undefined || this.dirty === false) {
			return this.raw
		}
		this.file.compression = this.compression
		const array = this.file.write()
		this.raw = array
		this.dirty = false
		return array
	}

	public toJson() {
		return {
			x: this.x,
			z: this.z,
			compression: this.compression,
			timestamp: this.timestamp,
			size: this.raw.byteLength,
		}
	}

	public static fromJson(value: JsonValue, resolver: NbtChunkResolver) {
		const obj = Json.readObject(value)
		const x = Json.readInt(obj.x) ?? 0
		const z = Json.readInt(obj.z) ?? 0
		const compression = (Json.readString(obj.compression) ?? 'none') as NbtCompressionMode
		const timestamp = Json.readInt(obj.timestamp) ?? 0
		const size = Json.readInt(obj.size) ?? 0
		return new NbtChunk.Ref(x, z, compression, timestamp, size, resolver)
	}

	public toRef(resolver: NbtChunkResolver) {
		return new NbtChunk.Ref(this.x, this.z, this.compression, this.timestamp, this.raw.byteLength, resolver)
	}
}

export namespace NbtChunk {
	export class Ref {
		private file?: Promise<NbtFile>
		private resolved: boolean = false

		constructor(
			public readonly x: number,
			public readonly z: number,
			public readonly compression: NbtCompressionMode,
			public readonly timestamp: number,
			public readonly size: number,
			public readonly resolver: NbtChunkResolver,
		) {}

		public getFile() {
			if (this.file instanceof NbtFile) {
				return this.file as NbtFile
			}
			return undefined
		}

		public async getFileAsync() {
			if (this.file) {
				return this.file
			}
			this.file = (async () => {
				const file = this.resolver(this.x, this.z)
				this.file = file
				this.resolved = true
				return file
			})()
			return this.file
		}

		public async getRoot() {
			const file = await this.getFileAsync()
			return file.root
		}

		public isResolved() {
			return this.resolved
		}
	}
}
