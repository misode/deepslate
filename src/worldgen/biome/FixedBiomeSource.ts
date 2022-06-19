import { Identifier } from '../../core/index.js'
import { Json } from '../../util/index.js'
import type { BiomeSource } from './BiomeSource.js'

export class FixedBiomeSource implements BiomeSource {
	constructor(
		private readonly biome: Identifier,
	) {}

	public getBiome() {
		return this.biome
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const biome = Identifier.parse(Json.readString(root.biome) ?? 'plains')
		return new FixedBiomeSource(biome)
	}
}
