import nbt, { NamedNbtTag, NbtTag } from "nbt"

export function parseNbt(buffer: ArrayBuffer): Promise<NamedNbtTag> {
  return new Promise((res, rej) => {
    nbt.parse(buffer, (err, data) => {
      if (err) rej(err)
      res(data)
    })
  })
}

export function read(tag: NbtTag, type: string, name?: string) {
  if (tag.type !== type) {
    if (name) {
      throw new Error(`Expected ${name} to be of type ${type}, but found ${tag.type}`)
    } else {
      throw new Error(`Expected a ${type}, but found a ${tag.type}`)
    }
  }
  return tag.value
}

export function readTag(tags: { [key: string]: NbtTag }, name: string, type: string) {
  if (!tags[name]) {
    throw new Error(`Missing ${name} tag`)
  }
  if (tags[name].type !== type) {
    throw new Error(`Expected ${name} to be of type ${type}, but found ${tags[name].type}`)
  }
  return tags[name].value
}

export function readOptional<T>(readResult: () => T, fallback: T) {
  try {
    return readResult()
  } catch (e) {
    return fallback
  }
}

export function readListTag(tags: { [key: string]: NbtTag }, name: string, type?: string, length?: number) {
  const value = readTag(tags, name, 'list') as {type: string, value: any[]}
  if (type && value.type !== type) {
    throw new Error(`Expected ${name} to be a list of ${type}s, but found ${value.type}s`)
  }
  if (length && value.value.length !== length) {
    throw new Error(`Expected ${name} to be a list of length ${length}, but found length ${value.value.length}`)
  }
  return value.value
}
