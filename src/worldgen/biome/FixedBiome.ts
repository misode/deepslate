import type { BiomeSource } from './BiomeSource'
import type { TerrainShaper } from './TerrainShaper'

export class FixedBiome implements BiomeSource {
	constructor(
		private readonly biome: string,
		private readonly shape: TerrainShaper.Shape = { offset: 0, factor: 1, peaks: 1, nearWater: false },
	) {}

	public getBiome(x: number, y: number, z: number) {
		return this.biome
	}

	public getTerrainShape(x: number, z: number): TerrainShaper.Shape {
		return this.shape
	}
}
