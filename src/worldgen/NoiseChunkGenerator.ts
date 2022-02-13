import type { Chunk } from '../core'
import { BlockState, ChunkPos, computeIfAbsent } from '../core'
import type { BiomeSource } from './biome'
import { MaterialRule } from './MaterialRule'
import { NoiseChunk } from './NoiseChunk'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings'
import { NoiseSampler } from './NoiseSampler'
import { NoiseSettings } from './NoiseSettings'
import { SurfaceSystem } from './SurfaceSystem'
import { WorldgenContext } from './VerticalAnchor'

export class NoiseChunkGenerator {
	private readonly sampler: NoiseSampler
	private readonly noiseChunkCache: Map<bigint, NoiseChunk>
	private readonly materialRule: MaterialRule
	private readonly surfaceSystem: SurfaceSystem

	constructor(
		seed: bigint,
		private readonly biomeSource: BiomeSource,
		private readonly settings: NoiseGeneratorSettings,
	) {

		this.sampler = new NoiseSampler(settings.noise, seed, settings.legacyRandomSource)
		this.noiseChunkCache = new Map()

		this.materialRule = MaterialRule.fromList([
			(chunk, x, y, z) => chunk.updateNoiseAndGenerateBaseState(x, y, z),
		])
		this.surfaceSystem = new SurfaceSystem(settings.surfaceRule, settings.defaultBlock, seed)
	}

	public fill(chunk: Chunk) {
		const minY = Math.max(chunk.minY, this.settings.noise.minY)
		const maxY = Math.min(chunk.maxY, this.settings.noise.minY + this.settings.noise.height)

		const cellWidth = NoiseSettings.cellWidth(this.settings.noise)
		const cellHeight = NoiseSettings.cellHeight(this.settings.noise)
		const cellCountXZ = Math.floor(16 / cellWidth)

		const minCellY = Math.floor(minY / cellHeight)
		const cellCountY = Math.floor((maxY - minY) / cellHeight)

		const minX = ChunkPos.minBlockX(chunk.pos)
		const minZ = ChunkPos.minBlockZ(chunk.pos)

		const noiseChunk = this.getNoiseChunk(chunk)

		noiseChunk.initializeForFirstCellX()
		for (let cellX = 0; cellX < cellCountXZ; cellX += 1) {
			noiseChunk.advanceCellX(cellX)
			for (let cellZ = 0; cellZ < cellCountXZ; cellZ += 1) {
				let section = chunk.getOrCreateSection(chunk.sectionsCount - 1)
				for (let cellY = cellCountY - 1; cellY >= 0; cellY -= 1) {
					noiseChunk.selectCellYZ(cellY, cellZ)

					for (let offY = cellHeight - 1; offY >= 0; offY -= 1) {
						const worldY = (minCellY + cellY) * cellHeight + offY
						const sectionY = worldY & 0xF
						const sectionIndex = chunk.getSectionIndex(worldY)
						if (chunk.getSectionIndex(section.minBlockY) !== sectionIndex) {
							section = chunk.getOrCreateSection(sectionIndex)
						}
						const y = offY / cellHeight
						noiseChunk.updateForY(y)
						for (let offX = 0; offX < cellWidth; offX += 1) {
							const worldX = minX + cellX * cellWidth + offX
							const sectionX = worldX & 0xF
							const x = offX / cellWidth
							noiseChunk.updateForX(x)
							for (let offZ = 0; offZ < cellWidth; offZ += 1) {
								const worldZ = minZ + cellZ * cellWidth + offZ
								const sectionZ = worldZ & 0xF
								const z = offZ / cellWidth
								noiseChunk.updateForZ(z)
								let state = this.materialRule(noiseChunk, worldX, worldY, worldZ) ?? this.settings.defaultBlock
								if (state.equals(BlockState.AIR)) {
									if (worldY < this.settings.seaLevel) {
										state = this.settings.defaultFluid
									} else {
										continue
									}
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

	public buildSurface(chunk: Chunk, /** @deprecated */ biome: string = 'minecraft:plains') {
		const noiseChunk = this.getNoiseChunk(chunk)
		const context = WorldgenContext.create(this.settings.noise.minY, this.settings.noise.height)
		this.surfaceSystem.buildSurface(chunk, noiseChunk, context, () => biome)
	}

	private getNoiseChunk(chunk: Chunk) {
		return computeIfAbsent(this.noiseChunkCache, ChunkPos.toLong(chunk.pos), () => {
			const minY = Math.max(chunk.minY, this.settings.noise.minY)
			const maxY = Math.min(chunk.maxY, this.settings.noise.minY + this.settings.noise.height)
	
			const cellWidth = NoiseSettings.cellWidth(this.settings.noise)
			const cellHeight = NoiseSettings.cellHeight(this.settings.noise)
			const cellCountXZ = Math.floor(16 / cellWidth)
	
			const minCellY = Math.floor(minY / cellHeight)
			const cellCountY = Math.floor((maxY - minY) / cellHeight)
			const minX = ChunkPos.minBlockX(chunk.pos)
			const minZ = ChunkPos.minBlockZ(chunk.pos)
	
			return new NoiseChunk(cellCountXZ, cellCountY, minCellY, this.sampler, minX, minZ, () => 0, this.settings)
		})
	}
}
