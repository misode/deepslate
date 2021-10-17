import type { TerrainInfo } from '.'
import type { Chunk } from '../core'
import { BlockState, ChunkPos } from '../core'
import type { BiomeSource } from './biome'
import { MaterialRule } from './MaterialRule'
import { NoiseChunk } from './NoiseChunk'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings'
import { NoiseSampler } from './NoiseSampler'

export class NoiseChunkGenerator {
	private readonly cellHeight: number
	private readonly cellWidth: number
	private readonly cellCountXZ: number
	private readonly cellCountY: number
	private readonly sampler: NoiseSampler
	private readonly materialRule: MaterialRule

	constructor(
		seed: bigint,
		private readonly biomeSource: BiomeSource,
		private readonly settings: NoiseGeneratorSettings,
		/** @deprecated */
		terrainOverride?: TerrainInfo,
	) {
		this.cellHeight = settings.noise.ySize << 2
		this.cellWidth = settings.noise.xzSize << 2
		this.cellCountXZ = Math.floor(16 / this.cellWidth)
		this.cellCountY = Math.floor(settings.noise.height / this.cellHeight)

		this.sampler = new NoiseSampler(this.cellWidth, this.cellHeight, this.cellCountY, settings.noise, settings.octaves, seed, settings.legacyRandomSource, terrainOverride)

		this.materialRule = MaterialRule.fromList([
			(chunk, x, y, z) => chunk.updateNoiseAndGenerateBaseState(x, y, z),
		])
	}

	public fillBiomes(chunk: Chunk) {
		const minY = Math.max(chunk.minY, this.settings.noise.minY)
		const maxY = Math.min(chunk.maxY, this.settings.noise.minY + this.settings.noise.height)

		const minCellY = Math.floor(minY / this.cellHeight)
		const cellCountY = Math.floor((maxY - minY) / this.cellHeight)

		const minX = ChunkPos.minBlockX(chunk.pos)
		const minZ = ChunkPos.minBlockZ(chunk.pos)
		
		const noiseChunk = new NoiseChunk(this.cellWidth, this.cellHeight, this.cellCountXZ, this.cellCountY, minCellY, this.sampler, minX, minZ, () => 0)
		
		for (let i = 0; i < chunk.sectionsCount; i += 1) {
			const section = chunk.sections[i]
			const minY = section.minBlockY
			for (let dx = 0; dx < 4; dx += 1) {
				for (let dy = 0; dy < 4; dy += 1) {
					for (let dz = 0; dz < 4; dz += 1) {
						const x = minX + dx
						const y = minY + dy
						const z = minZ + dz
						const xx = noiseChunk.getShiftedX(x, z)
						const zz = noiseChunk.getShiftedZ(x, z)
						const continentalness = noiseChunk.getContinentalness(x, z)
						const erosion = noiseChunk.getErosion(x, z)
						const weirdness = noiseChunk.getWeirdness(x, z)
						const offset = noiseChunk.getTerrainInfo(x, z).offset
						const target = this.sampler.target(x, y, z, xx, zz, continentalness, erosion, weirdness, offset)
						const biome = this.biomeSource.getBiome(x, y, z, () => target)
					}
				}
			}
		}
	}

	public fill(chunk: Chunk) {
		const minY = Math.max(chunk.minY, this.settings.noise.minY)
		const maxY = Math.min(chunk.maxY, this.settings.noise.minY + this.settings.noise.height)

		const minCellY = Math.floor(minY / this.cellHeight)
		const cellCountY = Math.floor((maxY - minY) / this.cellHeight)

		const minX = ChunkPos.minBlockX(chunk.pos)
		const minZ = ChunkPos.minBlockZ(chunk.pos)

		const noiseChunk = new NoiseChunk(this.cellWidth, this.cellHeight, this.cellCountXZ, this.cellCountY, minCellY, this.sampler, minX, minZ, () => 0)

		noiseChunk.initializeForFirstCellX()
		for (let cellX = 0; cellX < this.cellCountXZ; cellX += 1) {
			noiseChunk.advanceCellX(cellX)
			for (let cellZ = 0; cellZ < this.cellCountXZ; cellZ += 1) {
				let section = chunk.getOrCreateSection(chunk.sectionsCount - 1)
				for (let cellY = cellCountY - 1; cellY >= 0; cellY -= 1) {
					noiseChunk.selectCellYZ(cellY, cellZ)

					for (let offY = this.cellHeight - 1; offY >= 0; offY -= 1) {
						const worldY = (minCellY + cellY) * this.cellHeight + offY
						const sectionY = worldY & 0xF
						const sectionIndex = chunk.getSectionIndex(worldY)
						if (chunk.getSectionIndex(section.minBlockY) !== sectionIndex) {
							section = chunk.getOrCreateSection(sectionIndex)
						}
						const y = offY / this.cellHeight
						noiseChunk.updateForY(y)
						for (let offX = 0; offX < this.cellWidth; offX += 1) {
							const worldX = minX + cellX * this.cellWidth + offX
							const sectionX = worldX & 0xF
							const x = offX / this.cellWidth
							noiseChunk.updateForX(x)
							for (let offZ = 0; offZ < this.cellWidth; offZ += 1) {
								const worldZ = minZ + cellZ * this.cellWidth + offZ
								const sectionZ = worldZ & 0xF
								const z = offZ / this.cellWidth
								noiseChunk.updateForZ(z)
								const state = this.materialRule(noiseChunk, worldX, worldY, worldZ) ?? this.settings.defaultBlock
								if (state.equals(BlockState.AIR)) {
									continue
								}
								section.setBlockState(sectionX, sectionY, sectionZ, state)
							}
						}
					}
				}
			}
			noiseChunk.swapSlices()
		}
	}
}
