import { expect } from 'chai'
import 'mocha'
import pako from 'pako'
import type { NamedNbtTag } from '../../src/nbt'
import { read, readChunk, readCompressed, readRegion, readUncompressed, write, writeChunk, writeCompressed, writeRegion, writeUncompressed } from '../../src/nbt'

const raw = new Uint8Array([10, 0, 0, 1, 0, 3, 102, 111, 111, 4, 0])
const rawCompressed = pako.gzip(raw)
const rawZCompressed = pako.deflate(raw)
const nbt: NamedNbtTag = {name: '', value: { foo: { type: 'byte', value: 4 } } }

const rawEmptyRegion = new Uint8Array(Array(4096 * 2).fill(0))
const rawRegion = new Uint8Array(Array(4096 * 6).fill(0))
rawRegion.set([0, 0, 2, 1, 0, 0, 3, 1, 0, 0, 4, 1, 0, 0, 5, 1])
rawRegion.set([0, 0, 0, 4, 0, 0, 1, 144], 4096)
rawRegion.set([0, 0, 0, rawCompressed.length + 1, 1, ...rawCompressed], 4096 * 2)
rawRegion.set([0, 0, 0, rawZCompressed.length + 1, 2, ...rawZCompressed], 4096 * 3)
rawRegion.set([0, 0, 0, raw.length + 1, 3, ...raw], 4096 * 4)
rawRegion.set([0, 0, 0, 2, 14, 0], 4096 * 5)
const chunks = () => [
	{ x: 0, z: 0, compression: 1, timestamp: 4, data: rawCompressed },
	{ x: 1, z: 0, compression: 2, timestamp: 400, data: rawZCompressed },
	{ x: 2, z: 0, compression: 3, timestamp: 0, data: raw },
	{ x: 3, z: 0, compression: 14, timestamp: 0, data: new Uint8Array([0]) },
]

describe('Nbt', () => {
	it('readUncompressed', () => {
		expect(readUncompressed(raw)).deep.equal(nbt)
	})

	it('readUncompressed (invalid)', () => {
		const rawInvalid = new Uint8Array([2, 0, 0, 4, 10])
		expect(() => readUncompressed(rawInvalid)).throw()
	})

	it('readCompressed', () => {
		expect(readCompressed(rawCompressed)).deep.equal(nbt)
	})

	it('read', () => {
		expect(read(raw)).deep.equal({
			compressed: false,
			result: nbt,
		})

		expect(read(rawCompressed)).deep.equal({
			compressed: true,
			result: nbt,
		})
	})

	it('writeUncompressed', () => {
		expect(writeUncompressed(nbt)).deep.equal(raw)
	})

	it('writeCncompressed', () => {
		expect(writeCompressed(nbt)).deep.equal(rawCompressed)
	})

	it('write', () => {
		expect(write(nbt, false)).deep.equal(raw)
		expect(write(nbt, true)).deep.equal(rawCompressed)
	})

	it('readRegion', () => {
		expect(readRegion(rawRegion)).deep.equal(chunks())
	})

	it('readRegion (empty)', () => {
		expect(readRegion(rawEmptyRegion)).an('array').with.lengthOf(0)
	})

	it('writeRegion', () => {
		expect(writeRegion(chunks())).deep.equal(rawRegion)
	})

	it('writeRegion (empty)', () => {
		expect(writeRegion([])).deep.equal(rawEmptyRegion)
	})

	it('readChunk (gzip)', () => {
		const chunk = readChunk(chunks(), 0, 0)
		expect(chunk.nbt).deep.equal(nbt)
	})

	it('readChunk (zlib)', () => {
		const chunk = readChunk(chunks(), 1, 0)
		expect(chunk.nbt).deep.equal(nbt)
	})

	it('readChunk (raw)', () => {
		const chunk = readChunk(chunks(), 2, 0)
		expect(chunk.nbt).deep.equal(nbt)
	})

	it('readChunk (invalid compression)', () => {
		expect(() => readChunk(chunks(), 3, 0)).throw()
	})

	it('readChunk (invalid coords)', () => {
		expect(() => readChunk(chunks(), 1, 1)).throw()
		expect(() => readChunk([], 0, 0)).throw()
	})

	it('writeChunk (gzip)', () => {
		const chunkList = chunks()
		writeChunk(chunkList, 0, 0, nbt)
		expect(chunkList[0].data).deep.equal(rawCompressed)
	})

	it('writeChunk (zlib)', () => {
		const chunkList = chunks()
		writeChunk(chunkList, 1, 0, nbt)
		expect(chunkList[1].data).deep.equal(rawZCompressed)
	})

	it('writeChunk (raw)', () => {
		const chunkList = chunks()
		writeChunk(chunkList, 2, 0, nbt)
		expect(chunkList[2].data).deep.equal(raw)
	})

	it('writeChunk (invalid compression)', () => {
		const chunkList = chunks()
		expect(() => writeChunk(chunkList, 3, 0, nbt)).throw()
	})

	it('writeChunk (invalid coords)', () => {
		expect(() => writeChunk(chunks(), 1, 1, nbt)).throw()
		expect(() => writeChunk([], 0, 0, nbt)).throw()
	})
})
