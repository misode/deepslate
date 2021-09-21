import { Json } from '../../core'
import type { BiomeSource } from './BiomeSource'

export class FixedBiome implements BiomeSource {
	constructor(
		private readonly biome: string,
	) {}

	public getBiome() {
		return this.biome
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const biome = Json.readString(root.biome) ?? 'minecraft:the_void'
		return new FixedBiome(biome)
	}
}
