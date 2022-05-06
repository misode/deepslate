import { Identifier } from '@core'
import { Json } from '@util'
import type { BiomeSource } from './BiomeSource'
import { Climate } from './Climate'

export class MultiNoise implements BiomeSource {
	constructor(
		private readonly parameters: Climate.Parameters<Identifier>,
	) {}

	public getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler) {
		const target = climateSampler.sample(x, y, z)
		return this.parameters.find(target)
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const biomes = Json.readArray(root.biomes, b => (b => ({
			biome: Identifier.parse(Json.readString(b.biome) ?? 'minecraft:the_void'),
			parameters: Climate.ParamPoint.fromJson(b.parameters),
		}))(Json.readObject(b) ?? {})) ?? []
		const parameters = biomes.map<[Climate.ParamPoint, () => Identifier]>(b => [b.parameters, () => b.biome])
		return new MultiNoise(new Climate.Parameters(parameters))
	}
}
