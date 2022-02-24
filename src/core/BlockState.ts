import type { NamedNbtTag } from '../nbt'
import { getOptional, getTag } from '../nbt'
import { Json } from '../util'
import { Identifier } from './Identifier'

export class BlockState {
	public static readonly AIR = new BlockState(Identifier.create('air'))
	public static readonly STONE = new BlockState(Identifier.create('stone'))
	public static readonly WATER = new BlockState(Identifier.create('water'), { level: '0' })
	public static readonly LAVA = new BlockState(Identifier.create('lava'), { level: '0' })

	private readonly name: Identifier
	constructor(
		name: Identifier | string,
		private readonly properties: { [key: string]: string } = {}
	) {
		this.name = typeof name === 'string' ? Identifier.parse(name) : name
	}

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
		if (!this.name.equals(other.name)) {
			return false
		}
		return Object.keys(this.properties).every(p => {
			return other.properties[p] === this.properties[p]
		})
	}

	public is(other: BlockState) {
		return this.name.equals(other.name)
	}

	public toString() {
		if (Object.keys(this.properties).length === 0) {
			return this.name.toString()
		}
		return `${this.name.toString()}[${Object.entries(this.properties).map(([k, v]) => k + '=' + v).join(',')}]`
	}

	public static fromNbt(nbt: NamedNbtTag) {
		const name = Identifier.parse(getTag(nbt.value, 'Name', 'string'))
		const propsTag = getOptional(() => getTag(nbt.value, 'Properties', 'compound'), {})
		const properties = Object.keys(propsTag)
			.reduce((acc, k) => ({...acc, [k]: getTag(propsTag, k, 'string')}), {})
		return new BlockState(name, properties)
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const name = Identifier.parse(Json.readString(root.Name) ?? BlockState.STONE.name.toString())
		const properties = Json.readMap(root.Properties, p => Json.readString(p) ?? '')
		return new BlockState(name, properties)
	}
}
