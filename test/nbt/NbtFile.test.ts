import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { NbtFile, NbtString } from '../../src/nbt/index.js'

describe('NbtFile', () => {
	it('write', () => {
		const file = NbtFile.create()
		file.root.set('foo', new NbtString('Hello!'))
		expect(file.write()).toEqual(new Uint8Array([10, 0, 0, 8, 0, 3, 102, 111, 111, 0, 6, 72, 101, 108, 108, 111, 33, 0]))
	})

	it('read', () => {
		const array = new Uint8Array([10, 0, 0, 8, 0, 3, 102, 111, 111, 0, 6, 72, 101, 108, 108, 111, 33, 0])
		const file = NbtFile.read(array)
		expect(file.name).toEqual('')
		expect(file.root.size).toEqual(1)
		expect(file.root.get('foo')).toEqual(new NbtString('Hello!'))
	})

	it('read (actual file)', () => {
		const uri = path.resolve(fileURLToPath(import.meta.url), '../taiga_armorer_2.nbt')
		const array = new Uint8Array(fs.readFileSync(uri))
		const file = NbtFile.read(array)
		expect(file.name).toEqual('')
		expect(file.root.getNumber('DataVersion')).toEqual(3210)
		expect(file.root.getList('entities').length).toEqual(2)
	})
})
