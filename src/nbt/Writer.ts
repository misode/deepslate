import type { NbtValues } from './Tags.js'
import { tagTypes } from './Tags.js'
import { encodeUTF8 } from './Util.js'

export interface NbtWriterOptions {
	littleEndian?: boolean
	offset?: number
}

export class NbtWriter {
	public offset: number
	private readonly littleEndian: boolean
	private buffer: ArrayBuffer
	private array: Uint8Array
	private view: DataView

	constructor(options: NbtWriterOptions = {}) {
		this.offset = options.offset ?? 0
		this.littleEndian = options.littleEndian ?? false
		this.buffer = new ArrayBuffer(1024)
		this.array = new Uint8Array(this.buffer)
		this.view = new DataView(this.buffer)
	}

	private accommodate(size: number) {
		const requiredLength = this.offset + size
		if (this.buffer.byteLength >= requiredLength) {
			return
		}

		let newLength = this.buffer.byteLength
		while (newLength < requiredLength) {
			newLength *= 2
		}

		const newBuffer = new ArrayBuffer(newLength)
		const newArray = new Uint8Array(newBuffer)
		newArray.set(this.array)

		if (this.offset > this.buffer.byteLength) {
			newArray.fill(0, this.buffer.byteLength, this.offset)
		}

		this.buffer = newBuffer
		this.view = new DataView(newBuffer)
		this.array = newArray
	}

	getData() {
		this.accommodate(0)
		return this.array.slice(0, this.offset)
	}

	end() {}
  
	private writeNum(type: 'setInt8' | 'setInt16' | 'setInt32' | 'setFloat32' | 'setFloat64', size: number, value: number) {
		this.accommodate(size)
		this.view[type](this.offset, value, this.littleEndian)
		this.offset += size
	}

	byte = this.writeNum.bind(this, 'setInt8', 1)
	short = this.writeNum.bind(this, 'setInt16', 2)
	int = this.writeNum.bind(this, 'setInt32', 4)
	float = this.writeNum.bind(this, 'setFloat32', 4)
	double = this.writeNum.bind(this, 'setFloat64', 8)

	long(value: NbtValues['long']) {
		this.int(value[0])
		this.int(value[1])
	}

	byteArray(value: NbtValues['byteArray']) {
		this.int(value.length)
		this.accommodate(value.length)
		this.array.set(value, this.offset)
		this.offset += value.length
	}

	intArray(value: NbtValues['intArray']) {
		this.int(value.length)
		for (let i = 0; i < value.length; i++) {
			this.int(value[i])
		}
	}

	longArray(value: NbtValues['longArray']) {
		this.int(value.length)
		for (let i = 0; i < value.length; i++) {
			this.long(value[i])
		}
	}

	string(value: NbtValues['string']) {
		const bytes = encodeUTF8(value)
		this.short(bytes.length)
		this.accommodate(bytes.length)
		this.array.set(bytes, this.offset)
		this.offset += bytes.length
	}

	list(value: NbtValues['list']) {
		this.byte(tagTypes[value.type])
		this.int(value.value.length)
		value.value
		for (let i = 0; i < value.value.length; i++) {
			// @ts-expect-error
			this[value.type](value.value[i])
		}
	}

	compound(value: NbtValues['compound']) {
		for (const key in value) {
			this.byte(tagTypes[value[key].type])
			this.string(key)
			// @ts-expect-error
			this[value[key].type](value[key].value)
		}
		this.byte(tagTypes.end)
	}
}
