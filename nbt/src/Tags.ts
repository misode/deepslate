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
			value: NbtValues[Type][],
		}
	}[keyof NbtValues]
	compound: {
		[key: string]: NbtTag,
	}
}

export type NbtTag = {
	[Type in keyof NbtValues]: {
		type: Type,
		value: NbtValues[Type],
	}
}[keyof NbtValues]

export interface NamedNbtTag {
	name: string,
	value: {
		[name: string]: NbtTag,
	},
}

export const tagTypes = {
	end: 0,
	byte: 1,
	short: 2,
	int: 3,
	long: 4,
	float: 5,
	double: 6,
	byteArray: 7,
	string: 8,
	list: 9,
	compound: 10,
	intArray: 11,
	longArray: 12,
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
	'longArray',
] as const
