import { Json } from '../../core'
import type { BiomeSource } from './BiomeSource'
import { Climate } from './Climate'

export class MultiNoise implements BiomeSource {
	constructor(
		private readonly parameters: Climate.Parameters<string>,
	) {}

	public getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler) {
		const target = climateSampler(x, y, z)
		return this.parameters.find(target)
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const biomes = Json.readArray(root.biomes, b => (b => ({
			biome: Json.readString(b.biome) ?? 'minecraft:the_void',
			parameters: Climate.ParamPoint.fromJson(b.parameters),
		}))(Json.readObject(b) ?? {})) ?? []
		const parameters = biomes.map<[Climate.ParamPoint, () => string]>(b => [b.parameters, () => b.biome])
		return new MultiNoise(new Climate.Parameters(parameters))
	}
}