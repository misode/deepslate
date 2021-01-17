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
  byteArray: NbtValues['byte'][]
  intArray: NbtValues['int'][]
  longArray: NbtValues['long'][]
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
    type: Type,
    value: NbtValues[Type]
  }
}[keyof NbtValues]

export type NamedNbtTag = {
  name: string,
  value: {
    [name: string]: NbtTag
  }
}

export type NbtChunk = {
  x: number,
  z: number,
  timestamp: Uint8Array,
  compression: number,
  loaded: boolean
  data: Uint8Array | NamedNbtTag
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

export function readUncompressed(buffer: ArrayBuffer): NamedNbtTag {
  const reader = new NbtReader(buffer)
  const type = reader.byte()
  if (type !== tagTypes.compound) {
    throw new Error('Top tag should be a compound')
  }
  return {
    name: reader.string(),
    value: reader.compound()
  }
}

export function readCompressed(buffer: ArrayBuffer): NamedNbtTag {
  const uncompressed = pako.ungzip(new Uint8Array(buffer))
  return readUncompressed(uncompressed.buffer)
}

export function read(buffer: ArrayBuffer) {
  if (hasGzipHeader(buffer)) {
    return { compressed: true, result: readCompressed(buffer) }
  } else {
    return { compressed: false, result: readUncompressed(buffer) }
  }
}

export function readRegionHeader(array: Uint8Array): NbtChunk[] {
  const chunks: NbtChunk[] = [];
  for (let x = 0; x < 32; x += 1) {
    for (let z = 0; z < 32; z += 1) {
      const i = 4 * ((x & 31) + (z & 31) * 32);
      const sectors = array[i + 3];
      if (sectors === 0) continue;

      const offset = (array[i] << 16) + (array[i + 1] << 8) + array[i + 2];
      const timestamp = array.slice(i + 4096, i + 4100);

      const j = offset * 4096;
      const length = (array[j] << 24) + (array[j + 1] << 16) + (array[j + 2] << 8) + array[j + 3] 
      const compression = array[j + 4]
      const data = array.slice(j + 5, j + 4 + length)

      chunks.push({ x, z, timestamp, compression, loaded: false, data });
    }
  }
  return chunks;
}

export function readChunk(chunks: NbtChunk[], x: number, z: number) {
  const chunk = chunks.find(c => c.x === x && c.z === z)
  if (chunk === undefined) {
    throw new Error(`Cannot find chunk [${x}, ${z}]`)
  }

  if (chunk.loaded) return chunk;

  if (chunk.compression !== 2) {
    throw new Error(`Invallid compression mode ${chunk.compression}`)
  }

  chunk.data = readCompressed(chunk.data as Uint8Array);
  chunk.loaded = true;
  return chunk;
}

export function writeUncompressed(value: NamedNbtTag) {
  const writer = new NbtWriter()
  writer.byte(tagTypes.compound)
  writer.string(value.name)
  writer.compound(value.value)
  return writer.getData()
}

export function writeCompressed(value: NamedNbtTag) {
  const uncompressed = writeUncompressed(value)
  return pako.gzip(new Uint8Array(uncompressed))
}

export function write(value: NamedNbtTag, compressed: boolean) {
  if (compressed) {
    return writeCompressed(value)
  } else {
    return writeUncompressed(value)
  }
}
