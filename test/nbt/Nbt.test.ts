import 'mocha';
import { expect } from 'chai';
import pako from 'pako'
import { NamedNbtTag, read, readChunk, readCompressed, readRegion, readUncompressed, write, writeChunk, writeCompressed, writeRegion, writeUncompressed } from '../../lib/nbt';

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
  { x: 3, z: 0, compression: 14, timestamp: 0, data: new Uint8Array([0]) }
]

describe('Nbt', () => {
  it('readUncompressed', () => {
    expect(readUncompressed(raw)).to.deep.equal(nbt)
  })

  it('readUncompressed (invalid)', () => {
    const rawInvalid = new Uint8Array([2, 0, 0, 4, 10])
    expect(() => readUncompressed(rawInvalid)).to.throw()
  })

  it('readCompressed', () => {
    expect(readCompressed(rawCompressed)).to.deep.equal(nbt)
  })

  it('read', () => {
    expect(read(raw)).to.deep.equal({
      compressed: false,
      result: nbt
    })

    expect(read(rawCompressed)).to.deep.equal({
      compressed: true,
      result: nbt
    })
  })

  it('writeUncompressed', () => {
    expect(writeUncompressed(nbt)).to.deep.equal(raw)
  })

  it('writeCncompressed', () => {
    expect(writeCompressed(nbt)).to.deep.equal(rawCompressed)
  })

  it('write', () => {
    expect(write(nbt, false)).to.deep.equal(raw)
    expect(write(nbt, true)).to.deep.equal(rawCompressed)
  })

  it('readRegion', () => {
    expect(readRegion(rawRegion)).to.deep.equal(chunks())
  })

  it('readRegion (empty)', () => {
    expect(readRegion(rawEmptyRegion)).to.be.an('array').with.lengthOf(0)
  })

  it('writeRegion', () => {
    expect(writeRegion(chunks())).to.deep.equal(rawRegion)
  })

  it('writeRegion (empty)', () => {
    expect(writeRegion([])).to.deep.equal(rawEmptyRegion)
  })

  it('readChunk (gzip)', () => {
    const chunk = readChunk(chunks(), 0, 0)
    expect(chunk.nbt).to.deep.equal(nbt)
  })

  it('readChunk (zlib)', () => {
    const chunk = readChunk(chunks(), 1, 0)
    expect(chunk.nbt).to.deep.equal(nbt)
  })

  it('readChunk (raw)', () => {
    const chunk = readChunk(chunks(), 2, 0)
    expect(chunk.nbt).to.deep.equal(nbt)
  })

  it('readChunk (invalid compression)', () => {
    expect(() => readChunk(chunks(), 3, 0)).to.throw()
  })

  it('readChunk (invalid coords)', () => {
    expect(() => readChunk(chunks(), 1, 1)).to.throw()
    expect(() => readChunk([], 0, 0)).to.throw()
  })

  it('writeChunk (gzip)', () => {
    const chunkList = chunks()
    writeChunk(chunkList, 0, 0, nbt)
    expect(chunkList[0].data).to.deep.equal(rawCompressed)
  })

  it('writeChunk (zlib)', () => {
    const chunkList = chunks()
    writeChunk(chunkList, 1, 0, nbt)
    expect(chunkList[1].data).to.deep.equal(rawZCompressed)
  })

  it('writeChunk (raw)', () => {
    const chunkList = chunks()
    writeChunk(chunkList, 2, 0, nbt)
    expect(chunkList[2].data).to.deep.equal(raw)
  })

  it('writeChunk (invalid compression)', () => {
    const chunkList = chunks()
    expect(() => writeChunk(chunkList, 3, 0, nbt)).to.throw()
  })

  it('writeChunk (invalid coords)', () => {
    expect(() => writeChunk(chunks(), 1, 1, nbt)).to.throw()
    expect(() => writeChunk([], 0, 0, nbt)).to.throw()
  })
})
