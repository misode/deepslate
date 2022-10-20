import type { JsonValue } from '../util/index.js'
import { Json } from '../util/index.js'
import type { NbtChunkResolver } from './NbtChunk.js'
import { NbtChunk } from './NbtChunk.js'
import type { NbtCompressionMode } from './NbtFile.js'

abstract class NbtAbstractRegion<T extends { x: number, z: number }> {
	protected readonly chunks: T[]

	constructor(chunks: T[]) {
		this.chunks = Array(NbtRegion.REGION_SIZE * NbtRegion.REGION_SIZE).fill(null)
		for (const chunk of chunks) {
			const index = NbtRegion.getIndex(chunk.x, chunk.z)
			this.chunks[index] = chunk
		}
	}

	public getChunkPositions(): [number, number][] {
		return this.chunks.map(c => [c.x, c.z])
	}

	public getChunk(index: number) {
		if (index < 0 || index >= NbtRegion.REGION_SIZE * NbtRegion.REGION_SIZE) {
			return undefined
		}
		return this.chunks[index]
	}

	public findChunk(x: number, z: number) {
		return this.getChunk(NbtRegion.getIndex(x, z))
	}

	public getFirstChunk() {
		return this.getChunk(0)
	}

	public filter(predicate: (chunk: T) => boolean) {
		return this.chunks.filter(predicate)
	}

	public map<U>(mapper: (chunk: T) => U) {
		return this.chunks.map(mapper)
	}
}

export class NbtRegion extends NbtAbstractRegion<NbtChunk> {
	public static readonly REGION_SIZE = 32
	private static readonly REGION_SIZE_MASK = NbtRegion.REGION_SIZE - 1

	constructor(chunks: NbtChunk[]) {
		super(chunks)
	}

	public write() {
		let totalSectors = 0
		for (const chunk of this.chunks) {
			totalSectors += Math.ceil(chunk.getRaw().length / 4096)
		}
		const array = new Uint8Array(8192 + totalSectors * 4096)
		const dataView = new DataView(array.buffer)

		let offset = 2
		for (const chunk of this.chunks) {
			const chunkData = chunk.getRaw()
			const i = 4 * ((chunk.x & NbtRegion.REGION_SIZE_MASK) + (chunk.z & NbtRegion.REGION_SIZE_MASK) * NbtRegion.REGION_SIZE)
			const sectors = Math.ceil(chunkData.length / 4096)
			dataView.setInt8(i, offset >> 16)
			dataView.setInt16(i + 1, offset & 0xffff)
			dataView.setInt8(i + 3, sectors)
			dataView.setInt32(i + 4096, chunk.timestamp)
	
			const j = offset * 4096
			dataView.setInt32(j, chunkData.length + 1)
			dataView.setInt8(j + 4, NbtRegion.writeCompression(chunk.compression))
			array.set(chunkData, j + 5)
	
			offset += sectors
		}
		return array
	}

	public static read(array: Uint8Array) {
		const chunks: NbtChunk[] = []
		for (let x = 0; x < NbtRegion.REGION_SIZE; x += 1) {
			for (let z = 0; z < NbtRegion.REGION_SIZE; z += 1) {
				const i = 4 * ((x & NbtRegion.REGION_SIZE_MASK) + (z & NbtRegion.REGION_SIZE_MASK) * NbtRegion.REGION_SIZE)
				const sectors = array[i + 3]
				if (sectors === 0) continue

				const offset = (array[i] << 16) + (array[i + 1] << 8) + array[i + 2]
				const timestamp = (array[i + 4096] << 24) + (array[i + 4097] << 16) + (array[i + 4098] << 8) + array[i + 4099]

				const j = offset * 4096
				const length = (array[j] << 24) + (array[j + 1] << 16) + (array[j + 2] << 8) + array[j + 3]
				const compression = array[j + 4]
				const data = array.slice(j + 5, j + 4 + length)

				chunks.push(new NbtChunk(x, z, this.readCompression(compression), timestamp, data))
			}
		}
		return new NbtRegion(chunks)
	}

	private static readCompression(value: number): NbtCompressionMode {
		switch (value) {
			case 1: return 'gzip'
			case 2: return 'zlib'
			case 3: return 'none'
			default: throw new Error(`Invalid compression mode ${value}`)
		}
	}

	private static writeCompression(value: NbtCompressionMode): number {
		switch (value) {
			case 'gzip': return 1
			case 'zlib': return 2
			case 'none': return 3
			default: throw new Error(`Invalid compression mode ${value}`)
		}
	}

	public static getIndex(x: number, z: number) {
		return (x & 31) + (z & 31) * 32
	}

	public toJson(): JsonValue {
		return {
			chunks: this.chunks.map(c => c.toJson()),
		}
	}

	public static fromJson(value: JsonValue, chunkResolver: NbtChunkResolver): NbtRegion.Ref {
		const obj = Json.readObject(value)
		const chunks = Json.readArray(obj.chunks, c => NbtChunk.fromJson(c, chunkResolver)) ?? []
		return new NbtRegion.Ref(chunks)
	}
}

export namespace NbtRegion {
	export class Ref extends NbtAbstractRegion<NbtChunk.Ref> {}
}
