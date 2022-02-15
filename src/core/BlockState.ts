import type { NamedNbtTag } from '../nbt'
import { getOptional, getTag } from '../nbt'
import { Json } from '../util'

export class BlockState {
	public static readonly AIR = new BlockState('minecraft:air')
	public static readonly STONE = new BlockState('minecraft:stone')
	public static readonly WATER = new BlockState('minecraft:water', { level: '0' })
	public static readonly LAVA = new BlockState('minecraft:lava', { level: '0' })

	constructor(
		private readonly name: string,
		private readonly properties: { [key: string]: string } = {}
	) {}

	public getName() {
		return this.name
	}

	public getProperties() {
		return this.properties
	}

	public getProperty(key: string): string | undefined {
		return this.properties[key]
	}

	public isFluid() {
		return this.is(BlockState.WATER) || this.is(BlockState.LAVA)
	}

	public equals(other: BlockState) {
		if (this.name !== other.name) {
			return false
		}
		return Object.keys(this.properties).every(p => {
			return other.properties[p] === this.properties[p]
		})
	}

	public is(other: BlockState) {
		return this.name === other.name
	}

	public toString() {
		if (Object.keys(this.properties).length === 0) {
			return this.name
		}
		return `${this.name}[${Object.entries(this.properties).map(([k, v]) => k + '=' + v).join(',')}]`
	}

	public static fromNbt(nbt: NamedNbtTag) {
		const name = getTag(nbt.value, 'Name', 'string')
		const propsTag = getOptional(() => getTag(nbt.value, 'Properties', 'compound'), {})
		const properties = Object.keys(propsTag)
			.reduce((acc, k) => ({...acc, [k]: getTag(propsTag, k, 'string')}), {})
		return new BlockState(name, properties)
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const name = Json.readString(root.Name) ?? BlockState.STONE.name
		const properties = Json.readMap(root.Properties, p => Json.readString(p) ?? '')
		return new BlockState(name, properties)
	}
}
