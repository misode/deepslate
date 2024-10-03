import type { NbtCompound } from '../nbt/index.js'
import { Json } from '../util/index.js'
import { Identifier } from './Identifier.js'

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

	public isWaterlogged() {
		return this.is(BlockState.WATER) || this.is(BlockState.LAVA)
			|| this.is('bubble_column')
			|| this.is('kelp') || this.is('kelp_plant')
			|| this.is('seagrass') || this.is('tall_seagrass')
			|| this.properties['waterlogged'] === 'true'
	}

	public equals(other: BlockState) {
		if (!this.name.equals(other.name)) {
			return false
		}
		return Object.keys(this.properties).every(p => {
			return other.properties[p] === this.properties[p]
		})
	}

	public is(other: string | Identifier | BlockState) {
		if (typeof other === 'string') {
			return this.name.equals(Identifier.parse(other))
		}
		if (other instanceof Identifier) {
			return this.name.equals(other)
		}
		return this.name.equals(other.name)
	}

	public toString() {
		if (Object.keys(this.properties).length === 0) {
			return this.name.toString()
		}
		return `${this.name.toString()}[${Object.entries(this.properties).map(([k, v]) => k + '=' + v).join(',')}]`
	}

	public static parse(str: string) {
		const stateStart = str.indexOf('[')
		if (stateStart === -1) {
			return new BlockState(str)
		} else {
			const blockId = str.substring(0, stateStart)
			const states = str.substring(stateStart + 1, str.length - 1).split(',')
			const properties = Object.fromEntries(states.map(e => e.split('=') as [string, string]))
			return new BlockState(blockId, properties)
		}
	}

	public static fromNbt(nbt: NbtCompound) {
		const name = Identifier.parse(nbt.getString('Name'))
		const properties = nbt.getCompound('Properties')
			.map((key, value) => [key, value.getAsString()])
		return new BlockState(name, properties)
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const name = Identifier.parse(Json.readString(root.Name) ?? BlockState.STONE.name.toString())
		const properties = Json.readMap(root.Properties, p => Json.readString(p) ?? '')
		return new BlockState(name, properties)
	}
}
