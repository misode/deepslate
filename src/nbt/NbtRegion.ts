import type { JsonValue } from '../util/index.js'
import { Json } from '../util/index.js'
import type { NbtChunkResolver } from './NbtChunk.js'
import { NbtChunk } from './NbtChunk.js'

abstract class NbtAbstractRegion<T extends { x: number, z: number }> {
	protected readonly chunks: (T | undefined)[]

	constructor(chunks: T[]) {
		this.chunks = Array(32 * 32).fill(undefined)
		for (const chunk of chunks) {
			const index = NbtRegion.getIndex(chunk.x, chunk.z)
			this.chunks[index] = chunk
		}
	}

	public getChunkPositions(): [number, number][] {
		return this.chunks.flatMap(c => c ? [[c.x, c.z]] : [])
	}

	public getChunk(index: number) {
		if (index < 0 || index >= 32 * 32) {
			return undefined
		}
		return this.chunks[index]
	}

	public findChunk(x: number, z: number) {
		return this.getChunk(NbtRegion.getIndex(x, z))
	}

	public getFirstChunk() {
		return this.chunks.filter(c => c !== undefined)[0]
	}

	public filter(predicate: (chunk: T) => boolean) {
		return this.chunks.filter((c): c is T => c !== undefined && predicate(c))
	}

	public map<U>(mapper: (chunk: T) => U) {
		return this.chunks.flatMap(c => c !== undefined ? [mapper(c)] : [])
	}
}

export class NbtRegion extends NbtAbstractRegion<NbtChunk> {
	constructor(chunks: NbtChunk[]) {
		super(chunks)
	}

	public write() {
		let totalSectors = 0
		for (const chunk of this.chunks) {
			if (chunk === undefined) continue
			totalSectors += Math.ceil(chunk.getRaw().length / 4096)
		}
		const array = new Uint8Array(8192 + totalSectors * 4096)
		const dataView = new DataView(array.buffer)

		let offset = 2
		for (const chunk of this.chunks) {
			if (chunk === undefined) continue
			const chunkData = chunk.getRaw()
			const i = 4 * ((chunk.x & 31) + (chunk.z & 31) * 32)
			const sectors = Math.ceil(chunkData.length / 4096)
			dataView.setInt8(i, offset >> 16)
			dataView.setInt16(i + 1, offset & 0xffff)
			dataView.setInt8(i + 3, sectors)
			dataView.setInt32(i + 4096, chunk.timestamp)
	
			const j = offset * 4096
			dataView.setInt32(j, chunkData.length + 1)
			dataView.setInt8(j + 4, chunk.compression)
			array.set(chunkData, j + 5)
	
			offset += sectors
		}
		return array
	}

	public static read(array: Uint8Array) {
		const chunks: NbtChunk[] = []
		for (let x = 0; x < 32; x += 1) {
			for (let z = 0; z < 32; z += 1) {
				const i = 4 * ((x & 31) + (z & 31) * 32)
				const sectors = array[i + 3]
				if (sectors === 0) continue

				const offset = (array[i] << 16) + (array[i + 1] << 8) + array[i + 2]
				const timestamp = (array[i + 4096] << 24) + (array[i + 4097] << 16) + (array[i + 4098] << 8) + array[i + 4099]

				const j = offset * 4096
				const length = (array[j] << 24) + (array[j + 1] << 16) + (array[j + 2] << 8) + array[j + 3]
				const compression = array[j + 4]
				const data = array.slice(j + 5, j + 4 + length)

				chunks.push(new NbtChunk(x, z, compression, timestamp, data))
			}
		}
		return new NbtRegion(chunks)
	}

	public static getIndex(x: number, z: number) {
		return (x & 31) + (z & 31) * 32
	}

	public toJson(): JsonValue {
		return {
			chunks: this.map(c => c.toJson()),
		}
	}

	public static fromJson(value: JsonValue, chunkResolver: NbtChunkResolver): NbtRegion.Ref {
		const obj = Json.readObject(value) ?? {}
		const chunks = Json.readArray(obj.chunks) ?? []
		const chunks2 = chunks.flatMap(c => c !== undefined ? [NbtChunk.fromJson(c, chunkResolver)] : [])
		return new NbtRegion.Ref(chunks2)
	}
}

export namespace NbtRegion {
	export class Ref extends NbtAbstractRegion<NbtChunk.Ref> {}
}
