import type { NamedNbtTag, NbtChunk } from '@nbt'
import { loadChunk, readNbt, readNbtRaw, readRegion, saveChunk, writeNbt, writeNbtRaw, writeRegion } from '@nbt'
import { expect } from 'chai'
import 'mocha'
import pako from 'pako'

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
const chunks = (): NbtChunk[] => [
	{ x: 0, z: 0, compression: 1, timestamp: 4, data: rawCompressed },
	{ x: 1, z: 0, compression: 2, timestamp: 400, data: rawZCompressed },
	{ x: 2, z: 0, compression: 3, timestamp: 0, data: raw },
	{ x: 3, z: 0, compression: 14, timestamp: 0, data: new Uint8Array([0]) },
]

describe('Nbt', () => {
	it('readNbt', () => {
		expect(readNbt(raw)).deep.equal(nbt)
	})

	it('readNbt (invalid)', () => {
		const rawInvalid = new Uint8Array([2, 0, 0, 4, 10])
		expect(() => readNbt(rawInvalid)).throw()
	})

	it('readNbt (gzip compressed)', () => {
		expect(readNbt(rawCompressed)).deep.equal({ ...nbt, compression: 'gzip' })
	})

	it('readNbt (zlib compressed)', () => {
		expect(readNbt(rawZCompressed)).deep.equal({ ...nbt, compression: 'zlib' })
	})

	it('readNbt (little endian)', () => {
		const rawLittleEndian = new Uint8Array([10, 0, 0, 3, 3, 0, 102, 111, 111, 16, 58, 1, 0, 0])
		expect(readNbt(rawLittleEndian, { littleEndian: true })).deep.equal({
			value: { foo: { type: 'int', value: 80400 } },
			name: '',
			littleEndian: true,
		})
	})

	it('readNbt (bedrock header)', () => {
		const rawWithHeader = new Uint8Array([9, 0, 0, 0, 11, 0, 0, 0, 10, 0, 0, 1, 3, 0, 102, 111, 111, 4, 0])
		expect(readNbt(rawWithHeader)).deep.equal({
			...nbt,
			littleEndian: true,
			bedrockHeader: 9,
		})
	})

	it('readNbtRaw', () => {
		expect(readNbtRaw(raw)).deep.equal(nbt)
	})

	it('writeNbt', () => {
		expect(writeNbt(nbt.value)).deep.equal(raw)
	})

	it('writeNbt (gzip compressed)', () => {
		const array = writeNbt(nbt.value, { name: nbt.name, compression: 'gzip' })
		expect(array).deep.equal(rawCompressed)
	})

	it('writeNbt (zlib compressed)', () => {
		const array = writeNbt(nbt.value, { name: nbt.name, compression: 'zlib' })
		expect(array).deep.equal(rawZCompressed)
	})

	it('writeNbt (little endian)', () => {
		const array = writeNbt({ foo: { type: 'int', value: 80400 } }, { littleEndian: true })
		expect(array).deep.equal(new Uint8Array([10, 0, 0, 3, 3, 0, 102, 111, 111, 16, 58, 1, 0, 0]))
	})

	it('writeNbt (bedrock header)', () => {
		const array = writeNbt(nbt.value, { bedrockHeader: 9 })
		expect(array).deep.equal(new Uint8Array([9, 0, 0, 0, 11, 0, 0, 0, 10, 0, 0, 1, 3, 0, 102, 111, 111, 4, 0]))
	})

	it('writeNbtRaw', () => {
		expect(writeNbtRaw(nbt)).deep.equal(raw)
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

	it('loadChunk (gzip)', () => {
		const chunk = loadChunk(chunks()[0])
		expect(chunk.nbt).deep.equal({ ...nbt, compression: 'gzip' })
	})

	it('loadChunk (zlib)', () => {
		const chunk = loadChunk(chunks()[1])
		expect(chunk.nbt).deep.equal({ ...nbt, compression: 'zlib' })
	})

	it('loadChunk (raw)', () => {
		const chunk = loadChunk(chunks()[2])
		expect(chunk.nbt).deep.equal(nbt)
	})

	it('loadChunk (invalid compression)', () => {
		expect(() => loadChunk(chunks()[3])).throw()
	})

	it('saveChunk (gzip)', () => {
		const chunk = chunks()[0]
		chunk.nbt = nbt
		saveChunk(chunk)
		expect(chunk.data).deep.equal(rawCompressed)
	})

	it('saveChunk (zlib)', () => {
		const chunk = chunks()[1]
		chunk.nbt = nbt
		saveChunk(chunk)
		expect(chunk.data).deep.equal(rawZCompressed)
	})

	it('saveChunk (raw)', () => {
		const chunk = chunks()[2]
		chunk.nbt = nbt
		saveChunk(chunk)
		expect(chunk.data).deep.equal(raw)
	})

	it('saveChunk (invalid compression)', () => {
		const chunk = chunks()[3]
		chunk.nbt = nbt
		expect(() => saveChunk(chunk)).throw()
	})

	it('saveChunk (not loaded)', () => {
		const chunk = chunks()[0]
		expect(() => saveChunk(chunk)).throw()
	})
})
