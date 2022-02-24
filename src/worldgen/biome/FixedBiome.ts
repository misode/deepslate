import { Identifier } from '../../core'
import { Json } from '../../util'
import type { BiomeSource } from './BiomeSource'

export class FixedBiome implements BiomeSource {
	constructor(
		private readonly biome: Identifier,
	) {}

	public getBiome() {
		return this.biome
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const biome = Identifier.parse(Json.readString(root.biome) ?? 'minecraft:the_void')
		return new FixedBiome(biome)
	}
}
