import { NbtTag } from './NbtTag.js'

export abstract class NbtAbstractList<T extends NbtTag> extends NbtTag {
	protected items: T[]

	constructor(items: T[]) {
		super()
		this.items = items
	}

	public abstract getType(): number

	public getItems() {
		return this.items.slice(0)
	}

	public getAsTuple<U>(length: 1, mapper: (t?: T) => U): [U]
	public getAsTuple<U>(length: 2, mapper: (t?: T) => U): [U, U]
	public getAsTuple<U>(length: 3, mapper: (t?: T) => U): [U, U, U]
	public getAsTuple<U>(length: 4, mapper: (t?: T) => U): [U, U, U, U]
	public getAsTuple<U>(length: number, mapper: (t?: T) => U) {
		return [...Array(length)].map((_, i) => mapper(this.items[i]))
	}

	public get(index: number) {
		index = Math.floor(index)
		if (index < 0 || index >= this.items.length) {
			return undefined
		}
		return this.items[index]
	}

	public get length() {
		return this.items.length
	}

	public map<U>(fn: (value: T, index: number) => U): U[] {
		return this.items.map(fn)
	}

	public filter(fn: (value: T, index: number) => boolean): T[] {
		return this.items.filter(fn)
	}

	public forEach(fn: (entry: T, index: number) => void) {
		this.items.forEach(fn)
	}

	public set(index: number, tag: T) {
		this.items[index] = tag
	}

	public add(tag: T) {
		this.items.push(tag)
	}

	public insert(index: number, tag: T) {
		this.items.splice(index, 0, tag)
	}

	public delete(index: number) {
		this.items.splice(index, 1)
	}

	public clear() {
		this.items = []
	}
}
