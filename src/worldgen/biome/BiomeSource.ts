import type { TerrainShaper } from './TerrainShaper'

export interface BiomeSource {
	getBiome(x: number, y: number, z: number): string
	getTerrainShape(x: number, z: number): TerrainShaper.Shape
}
