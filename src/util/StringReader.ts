export class StringReader {
	public readonly source: string
	public cursor: number

	constructor(source: string) {
		this.source = source
		this.cursor = 0
	}

	public get remainingLength() {
		return this.source.length - this.cursor
	}

	public get totalLength() {
		return this.source.length
	}

	public getRead(start = 0) {
		return this.source.substring(start, this.cursor)
	}

	public getRemaining() {
		return this.source.substring(this.cursor)
	}

	public canRead(length = 1) {
		return this.cursor + length <= this.source.length
	}

	public peek(offset = 0) {
		return this.source.charAt(this.cursor + offset)
	}

	public read() {
		return this.source.charAt(this.cursor++)
	}

	public skip() {
		this.cursor += 1
	}

	public skipWhitespace() {
		while (this.canRead() && StringReader.isWhitespace(this.peek())) {
			this.skip()
		}
	}

	public expect(c: string, skipWhitespace = false) {
		if (skipWhitespace) {
			this.skipWhitespace()
		}
		if (!this.canRead() || this.peek() !== c) {
			throw this.createError(`Expected '${c}'`)
		}
		this.skip()
	}

	public readInt() {
		const start = this.cursor
		while (this.canRead() && StringReader.isAllowedInNumber(this.peek())) {
			this.skip()
		}
		const number = this.getRead(start)
		if (number.length === 0) {
			throw this.createError('Expected integer')
		}
		try {
			const value = Number(number)
			if (isNaN(value) || !Number.isInteger(value)) {
				throw new Error()
			}
			return value
		} catch (e) {
			this.cursor = start
			throw this.createError(`Invalid integer '${number}'`)
		}
	}

	public readFloat() {
		const start = this.cursor
		while (this.canRead() && StringReader.isAllowedInNumber(this.peek())) {
			this.skip()
		}
		const number = this.getRead(start)
		if (number.length === 0) {
			throw this.createError('Expected float')
		}
		try {
			const value = Number(number)
			if (isNaN(value)) {
				throw new Error()
			}
			return value
		} catch (e) {
			this.cursor = start
			throw this.createError(`Invalid float '${number}'`)
		}
	}

	public readUnquotedString() {
		const start = this.cursor
		while (this.canRead() && StringReader.isAllowedInUnquotedString(this.peek())) {
			this.skip()
		}
		return this.getRead(start)
	}

	public readQuotedString() {
		if (!this.canRead()) {
			return ''
		}
		const c = this.peek()
		if (!StringReader.isQuotedStringStart(c)) {
			throw this.createError('Expected quote to start a string')
		}
		this.skip()
		return this.readStringUntil(c)
	}

	public readString() {
		if (!this.canRead()) {
			return ''
		}
		const c = this.peek()
		if (StringReader.isQuotedStringStart(c)) {
			this.skip()
			return this.readStringUntil(c)
		}
		return this.readUnquotedString()
	}

	public readStringUntil(terminator: string) {
		const result = []
		let escaped = false
		while (this.canRead()) {
			const c = this.read()
			if (escaped) {
				if (c === terminator || c === '\\') {
					result.push(c)
					escaped = false
				} else {
					this.cursor -= 1
					throw this.createError(`Invalid escape sequence '${c}' in quoted string`)
				}
			} else if (c === '\\') {
				escaped = true
			} else if (c === terminator) {
				return result.join('')
			} else {
				result.push(c)
			}
		}
		throw this.createError('Unclosed quoted string')
	}

	public readBoolean() {
		const start = this.cursor
		const value = this.readUnquotedString()
		if (value.length === 0) {
			throw this.createError('Expected bool')
		}
		if (value === 'true') {
			return true
		} else if (value === 'false') {
			return false
		} else {
			this.cursor = start
			throw this.createError(`Invalid bool, expected true or false but found '${value}'`)
		}
	}

	public static isAllowedInNumber(c: string) {
		return (c >= '0' && c <= '9') || c === '.' || c === '-'
	}

	public static isAllowedInUnquotedString(c: string) {
		return (c >= '0' && c <= '9')
			|| (c >= 'A' && c <= 'Z')
			|| (c >= 'a' && c <= 'z')
			|| c === '_'
			|| c === '-'
			|| c === '.'
			|| c === '+'
	}

	public static isQuotedStringStart(c: string) {
		return c === "'" || c === '"'
	}

	public static isWhitespace(c: string) {
		return c === ' ' || c === '\t' || c === '\n' || c === '\r'
	}

	public createError(message: string) {
		const cursor = Math.min(this.source.length, this.cursor)
		const context = (cursor > 10 ? '...' : '') + this.source.substring(Math.max(0, cursor - 10), cursor)
		return new Error(`${message} at position ${this.cursor}: ${context}<--[HERE]`)
	}
}
