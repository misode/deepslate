import type { NbtTag, NbtValues } from './Tags.js'
import { tagNames } from './Tags.js'
import { decodeUTF8 } from './Util.js'

export interface NbtReaderOptions {
	littleEndian?: boolean
	offset?: number
}

export class NbtReader {
	public offset: number
	private readonly littleEndian: boolean
	private readonly array: Uint8Array
	private readonly view: DataView

	constructor(array: Uint8Array, options: NbtReaderOptions = {}) {
		this.offset = options.offset ?? 0
		this.littleEndian = options.littleEndian ?? false
		this.array = array
		this.view = new DataView(array.buffer, array.byteOffset)
	}

	end() {
		return null
	}

	private readNum(type: 'getInt8' | 'getInt16' | 'getInt32' | 'getFloat32' | 'getFloat64', size: number) {
		const value = this.view[type](this.offset, this.littleEndian)
		this.offset += size
		return value
	}

	byte = this.readNum.bind(this, 'getInt8', 1)
	short = this.readNum.bind(this, 'getInt16', 2)
	int = this.readNum.bind(this, 'getInt32', 4)
	float = this.readNum.bind(this, 'getFloat32', 4)
	double = this.readNum.bind(this, 'getFloat64', 8)

	long(): NbtValues['long'] {
		return [this.int(), this.int()]
	}

	byteArray(): NbtValues['byteArray'] {
		const length = this.int()
		const values = []
		for (let i = 0; i < length; i++) {
			values.push(this.byte())
		}
		return values
	}

	intArray(): NbtValues['intArray'] {
		const length = this.int()
		const values = []
		for (let i = 0; i < length; i++) {
			values.push(this.int())
		}
		return values
	}

	longArray(): NbtValues['longArray'] {
		const length = this.int()
		const values = []
		for (let i = 0; i < length; i++) {
			values.push(this.long())
		}
		return values
	}

	string(): NbtValues['string'] {
		const length = this.short()
		const slice = this.array.slice(this.offset,	this.offset + length)
		this.offset += length
		return decodeUTF8(slice)
	}

	list(): NbtValues['list'] {
		const type = tagNames[this.byte()]
		const length = this.int()
		const values = []
		for (let i = 0; i < length; i++) {
			values.push(this[type]())
		}
		return { type, value: values } as NbtValues['list']
	}

	compound(): NbtValues['compound'] {
		const values: { [key: string]: NbtTag } = {}
		while (true) {
			const type = tagNames[this.byte()]
			if (type === 'end') {
				break
			}
			const name = this.string()
			const value = this[type]()
			values[name] = { type, value } as NbtTag
		}
		return values
	}
}
