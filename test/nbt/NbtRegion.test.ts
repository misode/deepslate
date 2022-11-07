import Pako from 'pako'
import { describe, expect, it } from 'vitest'
import { NbtChunk, NbtFile, NbtRegion, NbtShort, NbtString } from '../../src/nbt'

const raw = new Uint8Array([10, 0, 0, 1, 0, 3, 102, 111, 111, 4, 0])
const rawCompressed = Pako.gzip(raw)
const rawZCompressed = Pako.deflate(raw)

const rawRegion = new Uint8Array(Array(4096 * 6).fill(0))
rawRegion.set([0, 0, 2, 1, 0, 0, 3, 1, 0, 0, 4, 1, 0, 0, 5, 1]) // sectors
rawRegion.set([0, 0, 0, 4, 0, 0, 1, 144], 4096) // timestamps
rawRegion.set([0, 0, 0, rawCompressed.length + 1, 1, ...rawCompressed], 4096 * 2)
rawRegion.set([0, 0, 0, rawZCompressed.length + 1, 2, ...rawZCompressed], 4096 * 3)
rawRegion.set([0, 0, 0, raw.length + 1, 3, ...raw], 4096 * 4)
rawRegion.set([0, 0, 0, 2, 14, 0], 4096 * 5) // invalid compression

describe('NbtRegion', () => {
	it('read', () => {
		const region = NbtRegion.read(rawRegion)
		expect(region.getChunkPositions()).toStrictEqual([[0, 0], [1, 0], [2, 0], [3, 0]])
		expect(region.findChunk(1, 0)?.getCompression()).toEqual('zlib')
		expect(region.findChunk(0, 0)?.timestamp).toEqual(4)
		expect(region.findChunk(1, 0)?.timestamp).toEqual(400)
	})

	it('full', () => {
		const file = NbtFile.create({ compression: 'zlib' })
		file.root.set('hello', new NbtShort(3))
		file.root.set('world', new NbtString('!'))
		const region = new NbtRegion([
			NbtChunk.create(2, 5, file),
		])
		const bytes = region.write()
		const region2 = NbtRegion.read(bytes)
		expect(region).toStrictEqual(region2)
		expect(region2.findChunk(2, 5)?.getFile()).toStrictEqual(file)
	})
})
