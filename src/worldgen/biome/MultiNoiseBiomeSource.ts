import { Identifier } from '../../core/index.js'
import { Json } from '../../util/index.js'
import type { BiomeSource } from './BiomeSource.js'
import { Climate } from './Climate.js'

export class MultiNoiseBiomeSource implements BiomeSource {
	private readonly parameters: Climate.Parameters<Identifier>

	constructor(entries: Array<[Climate.ParamPoint, () => Identifier]>) {
		this.parameters = new Climate.Parameters(entries)
	}

	public getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler) {
		const target = climateSampler.sample(x, y, z)
		return this.parameters.find(target)
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const biomes = Json.readArray(root.biomes, b => (b => ({
			biome: Identifier.parse(Json.readString(b.biome) ?? 'plains'),
			parameters: Climate.ParamPoint.fromJson(b.parameters),
		}))(Json.readObject(b) ?? {})) ?? []
		const entries = biomes.map<[Climate.ParamPoint, () => Identifier]>(b => [b.parameters, () => b.biome])
		return new MultiNoiseBiomeSource(entries)
	}
}
