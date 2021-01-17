import pako from 'pako'
import { NbtReader } from './Reader'
import { hasGzipHeader } from './Utils'
import { NbtWriter } from './Writer'

export interface NbtValues {
  end: null
  byte: number
  short: number
  int: number
  long: [number, number]
  float: number
  double: number
  string: string
  byteArray: number[]
  intArray: number[]
  longArray: [number, number][]
  list: {
    [Type in keyof NbtValues]: {
      type: Type,
      value: NbtValues[Type][]
    }
  }[keyof NbtValues]
  compound: {
    [key: string]: NbtTag
  }
}

export type NbtTag = {
  [Type in keyof NbtValues]: {
    type: Type
    value: NbtValues[Type]
  }
}[keyof NbtValues]

export type NamedNbtTag = {
  name: string
  value: {
    [name: string]: NbtTag
  }
}

export type NbtChunk = {
  x: number
  z: number
  timestamp: number
  compression: number
  data: Uint8Array
  nbt?: NamedNbtTag
}

export const tagTypes = {
  'end': 0,
  'byte': 1,
  'short': 2,
  'int': 3,
  'long': 4,
  'float': 5,
  'double': 6,
  'byteArray': 7,
  'string': 8,
  'list': 9,
  'compound': 10,
  'intArray': 11,
  'longArray': 12
} as const

export const tagNames = [
  'end',
  'byte',
  'short',
  'int',
  'long',
  'float',
  'double',
  'byteArray',
  'string',
  'list',
  'compound',
  'intArray',
  'longArray'
] as const

export function readUncompressed(array: Uint8Array): NamedNbtTag {
  const reader = new NbtReader(array)
  const type = reader.byte()
  if (type !== tagTypes.compound) {
    throw new Error('Top tag should be a compound')
  }
  return {
    name: reader.string(),
    value: reader.compound()
  }
}

export function readCompressed(array: Uint8Array): NamedNbtTag {
  const uncompressed = pako.inflate(array)
  return readUncompressed(uncompressed)
}

export function read(array: Uint8Array) {
  if (hasGzipHeader(array)) {
    return { compressed: true, result: readCompressed(array) }
  } else {
    return { compressed: false, result: readUncompressed(array) }
  }
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

export function readChunk(chunks: NbtChunk[], x: number, z: number) {
  const chunk = findChunk(chunks, x, z)
  switch (chunk.compression) {
    case 1:
    case 2: chunk.nbt = readCompressed(chunk.data); break
    case 3: chunk.nbt = readUncompressed(chunk.data); break
    default: throw new Error(`Invalid compression mode ${chunk.compression}`)
  }
  return chunk
}

export function writeUncompressed(value: NamedNbtTag) {
  const writer = new NbtWriter()
  writer.byte(tagTypes.compound)
  writer.string(value.name)
  writer.compound(value.value)
  return writer.getData()
}

export function writeCompressed(value: NamedNbtTag, zlib?: boolean) {
  const uncompressed = writeUncompressed(value)
  return pako[zlib ? 'deflate' : 'gzip'](uncompressed)
}

export function write(value: NamedNbtTag, compressed: boolean) {
  if (compressed) {
    return writeCompressed(value)
  } else {
    return writeUncompressed(value)
  }
}

export function writeRegion(chunks: NbtChunk[]) {
  let totalSectors = 0
  for (const chunk of chunks) {
    totalSectors += Math.ceil(chunk.data.length / 4096)
  }

  const array = new Uint8Array(8192 + totalSectors * 4096)
  const dataView = new DataView(array.buffer)
  let offset = 0
  for (const chunk of chunks) {
    const i = 4 * ((chunk.x & 31) + (chunk.z & 31) * 32)
    const sectors = Math.ceil(chunk.data.length / 4096)
    dataView.setInt8(i, offset >> 16)
    dataView.setInt16(i + 1, offset & 15)
    dataView.setInt8(i + 3, sectors)
    dataView.setInt32(i + 4096, chunk.timestamp)

    const j = offset * 4096
    dataView.setInt32(j, chunk.data.length)
    dataView.setInt8(j + 4, chunk.compression)
    array.set(chunk.data, j + 5)

    offset += sectors
  }
  return array
}

export function writeChunk(chunks: NbtChunk[], x: number, z: number, nbt: NamedNbtTag) {
  const chunk = findChunk(chunks, x, z)
  switch (chunk.compression) {
    case 1: chunk.data = writeCompressed(nbt); break
    case 2: chunk.data = writeCompressed(nbt, true); break
    case 3: chunk.data = writeUncompressed(nbt); break
    default: throw new Error(`Invalid compression mode ${chunk.compression}`)
  }
  return chunk
}

function findChunk(chunks: NbtChunk[], x: number, z: number) {
  const chunk = chunks.find(c => c.x === x && c.z === z)
  if (chunk === undefined) {
    throw new Error(`Cannot find chunk [${x}, ${z}]`)
  }
  return chunk
}
