import pako from 'pako'
import { NbtReader } from './Reader'
import type { NamedNbtTag, NbtValues } from './Tags'
import { tagTypes } from './Tags'
import { getBedrockHeader, hasGzipHeader, hasZlibHeader } from './Util'
import { NbtWriter } from './Writer'

export type NbtCompressionMode = 'gzip' | 'zlib' | 'none'

export interface NbtReadOptions {
	compression?: NbtCompressionMode
	littleEndian?: boolean
	bedrockHeader?: boolean
}

export interface NbtReadResult extends NamedNbtTag {
	compression?: Exclude<NbtCompressionMode, 'none'>
	littleEndian?: boolean
	bedrockHeader?: number
}

export function readNbt(array: Uint8Array, options: NbtReadOptions = {}): NbtReadResult {
	const bedrockHeader = options.bedrockHeader === false ? undefined : getBedrockHeader(array)
	const isGzipCompressed = options.compression === 'gzip' ||
		(!bedrockHeader && options.compression === undefined && hasGzipHeader(array))
	const isZlibCompressed = options.compression === 'zlib' ||
		(!bedrockHeader && options.compression === undefined && hasZlibHeader(array))

	const uncompressedData = (isZlibCompressed || isGzipCompressed) ? pako.inflate(array) : array
	const littleEndian = options.littleEndian === true || bedrockHeader !== undefined

	const { name, value } = readNbtRaw(uncompressedData, littleEndian, bedrockHeader && 8)

	return {
		value,
		name,
		...(isGzipCompressed || isZlibCompressed) ? { compression: isGzipCompressed ? 'gzip' : 'zlib' } : {},
		...littleEndian ? { littleEndian } : {},
		...bedrockHeader ? { bedrockHeader } : {},
	}
}

export function readNbtRaw(array: Uint8Array, littleEndian?: boolean, offset?: number): NamedNbtTag {
	const reader = new NbtReader(array, { littleEndian, offset })
	const type = reader.byte()
	if (type !== tagTypes.compound) {
		throw new Error('Top tag should be a compound')
	}
	return {
		name: reader.string(),
		value: reader.compound(),
	}
}

export interface NbtWriteOptions {
	name?: string
	compression?: NbtCompressionMode
	littleEndian?: boolean
	bedrockHeader?: number
	initialSize?: number
}

export function writeNbt(value: NbtValues['compound'], options: Partial<NbtWriteOptions> = {}) {
	const littleEndian = options.littleEndian === true || options.bedrockHeader !== undefined
	const array = writeNbtRaw({ value, name: options.name ?? '' }, littleEndian, options.bedrockHeader && 8)
	if (options.bedrockHeader) {
		const view = new DataView(array.buffer)
		view.setInt32(0, options.bedrockHeader, true)
		view.setInt32(4, array.byteLength - 8, true)
	}
	if (options.compression === 'gzip') {
		return pako.gzip(array)
	} else if (options.compression === 'zlib') {
		return pako.deflate(array)
	}
	return array
}

export function writeNbtRaw(nbt: NamedNbtTag, littleEndian?: boolean, offset?: number) {
	const writer = new NbtWriter({ littleEndian, offset })
	writer.byte(tagTypes.compound)
	writer.string(nbt.name)
	writer.compound(nbt.value)
	return writer.getData()
}

export interface NbtChunk {
	x: number,
	z: number,
	timestamp: number,
	compression: number,
	data: Uint8Array,
	nbt?: NamedNbtTag,
}

export function readRegion(array: Uint8Array): NbtChunk[] {
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

			chunks.push({ x, z, timestamp, compression, data })
		}
	}
	return chunks
}

export function writeRegion(chunks: NbtChunk[]) {
	let totalSectors = 0
	for (const chunk of chunks) {
		totalSectors += Math.ceil(chunk.data.length / 4096)
	}

	const array = new Uint8Array(8192 + totalSectors * 4096)
	const dataView = new DataView(array.buffer)
	let offset = 2
	for (const chunk of chunks) {
		const i = 4 * ((chunk.x & 31) + (chunk.z & 31) * 32)
		const sectors = Math.ceil(chunk.data.length / 4096)
		dataView.setInt8(i, offset >> 16)
		dataView.setInt16(i + 1, offset & 0xffff)
		dataView.setInt8(i + 3, sectors)
		dataView.setInt32(i + 4096, chunk.timestamp)

		const j = offset * 4096
		dataView.setInt32(j, chunk.data.length + 1)
		dataView.setInt8(j + 4, chunk.compression)
		array.set(chunk.data, j + 5)

		offset += sectors
	}
	return array
}

export function loadChunk(chunk: NbtChunk) {
	switch (chunk.compression) {
		case 1: chunk.nbt = readNbt(chunk.data, { compression: 'gzip' }); break
		case 2: chunk.nbt = readNbt(chunk.data, { compression: 'zlib' }); break
		case 3: chunk.nbt = readNbtRaw(chunk.data); break
		default: throw new Error(`Invalid compression mode ${chunk.compression}`)
	}
	return chunk
}

export function saveChunk(chunk: NbtChunk) {
	if (!chunk.nbt) {
		throw new Error('Cannot save chunk data, chunk is not loaded')
	}
	const { name, value } = chunk.nbt
	switch (chunk.compression) {
		case 1: chunk.data = writeNbt(value, { name, compression: 'gzip' }); break
		case 2: chunk.data = writeNbt(value, { name, compression: 'zlib' }); break
		case 3: chunk.data = writeNbt(value, { name }); break
		default: throw new Error(`Invalid compression mode ${chunk.compression}`)
	}
	return chunk
}
