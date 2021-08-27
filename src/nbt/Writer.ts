import type { NbtValues } from './Tags'
import { tagTypes } from './Tags'
import { encodeUTF8 } from './Util'

export class NbtWriter {
	public offset: number
	private readonly littleEndian: boolean
	private buffer: ArrayBuffer
	private arrayView: Uint8Array
	private dataView: DataView

	constructor(littleEndian = false) {
		this.offset = 0
		this.littleEndian = littleEndian
		this.buffer = new ArrayBuffer(1024)
		this.arrayView = new Uint8Array(this.buffer)
		this.dataView = new DataView(this.buffer)
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
		const newArrayView = new Uint8Array(newBuffer)
		newArrayView.set(this.arrayView)

		if (this.offset > this.buffer.byteLength) {
			newArrayView.fill(0, this.buffer.byteLength, this.offset)
		}

		this.buffer = newBuffer
		this.dataView = new DataView(newBuffer)
		this.arrayView = newArrayView
	}

	getData() {
		this.accommodate(0)
		return this.arrayView.slice(0, this.offset)
	}

	end(value: null) {}
  
	private writeNum(type: 'setInt8' | 'setInt16' | 'setInt32' | 'setFloat32' | 'setFloat64', size: number, value: number) {
		this.accommodate(size)
		this.dataView[type](this.offset, value, this.littleEndian)
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
		this.arrayView.set(value, this.offset)
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
		this.arrayView.set(bytes, this.offset)
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
