import { NbtTag, NbtValues } from './Nbt';

export function getTag<T extends keyof NbtValues>(tag: NbtValues['compound'], name: string, type: T): NbtValues[T]
export function getTag(tags: NbtValues['compound'], name: string, type: string) {
  if (!tags[name]) {
    throw new Error(`Missing ${name} tag`)
  }
  if (tags[name].type !== type) {
    throw new Error(`Expected ${name} to be of type ${type}, but found ${tags[name].type}`)
  }
  return tags[name].value
}

export function getListTag<T extends keyof NbtValues>(tag: NbtValues['compound'], name: string, type: T, length?: number): NbtValues[T][]
export function getListTag(tags: { [key: string]: NbtTag }, name: string, type: string, length?: number) {
  const value = getTag(tags, name, 'list') as {type: string, value: any[]}
  if (value.type !== type) {
    throw new Error(`Expected ${name} to be a list of ${type}s, but found ${value.type}s`)
  }
  if (length && value.value.length !== length) {
    throw new Error(`Expected ${name} to be a list of length ${length}, but found length ${value.value.length}`)
  }
  return value.value
}

export function getOptional<T>(readResult: () => T, fallback: T) {
  try {
    return readResult()
  } catch (e) {
    return fallback
  }
}
