import { Identifier } from '../../core/index.js'
import { Json } from '../../util/index.js'
import type { BiomeSource } from './BiomeSource.js'

export class CheckerboardBiomeSource implements BiomeSource {
	private readonly n: number

	constructor(
		private readonly shift: number,
		private readonly biomes: Identifier[],
	) {
		this.n = biomes.length
	}

	public getBiome(x: number, y: number, z: number) {
		const i = (((x >> this.shift) + (z >> this.shift)) % this.n + this.n) % this.n
		return Identifier.parse(this.biomes[i].toString())
	}

	public static fromJson(obj: unknown) {
		const root = Json.readObject(obj) ?? {}
		const scale = Json.readInt(root.scale) ?? 2
		let biomes
		if (typeof root.biomes === 'string') {
			biomes = [Identifier.parse(root.biomes)]
		} else {
			biomes = Json.readArray(root.biomes, (b) => 
				Identifier.parse(Json.readString(b) ?? '')
			) ?? []
		}
		return new CheckerboardBiomeSource(scale + 2, biomes)
	}
}
