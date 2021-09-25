import type { NamedNbtTag } from '../nbt'
import { getOptional, getTag } from '../nbt'
import { Json } from './Json'

export class BlockState {
	public static readonly AIR = new BlockState('minecraft:air')

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
		return this.name === 'minecraft:water' || this.name === 'minecraft:lava'
	}

	public equals(other: BlockState) {
		if (this.name !== other.name) {
			return false
		}
		return Object.keys(this.properties).every(p => {
			return other.properties[p] === this.properties[p]
		})
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
		const name = Json.readString(root.Name) ?? 'minecraft:stone'
		const properties = Json.readMap(root.Properties, p => Json.readString(p) ?? '')
		return new BlockState(name, properties)
	}
}
