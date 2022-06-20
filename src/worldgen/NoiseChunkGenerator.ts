import type { Chunk } from '../core/index.js'
import { BlockState, ChunkPos } from '../core/index.js'
import { computeIfAbsent } from '../util/index.js'
import type { FluidPicker } from './Aquifer.js'
import { FluidStatus } from './Aquifer.js'
import type { BiomeSource } from './biome/index.js'
import { NoiseChunk } from './NoiseChunk.js'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'
import { NoiseSettings } from './NoiseSettings.js'
import type { RandomState } from './RandomState.js'
import { WorldgenContext } from './VerticalAnchor.js'

export class NoiseChunkGenerator {
	private readonly noiseChunkCache: Map<bigint, NoiseChunk>
	private readonly globalFluidPicker: FluidPicker

	constructor(
		private readonly biomeSource: BiomeSource,
		private readonly settings: NoiseGeneratorSettings,
	) {
		this.noiseChunkCache = new Map()

		const lavaFluid = new FluidStatus(-54, BlockState.LAVA)
		const defaultFluid = new FluidStatus(settings.seaLevel, settings.defaultFluid)
		this.globalFluidPicker = (x, y, z) => {
			if (y < Math.min(-54, settings.seaLevel)) {
				return lavaFluid
			}
			return defaultFluid
		}
	}

	public fill(randomState: RandomState, chunk: Chunk, onlyFirstZ: boolean = false) {
		const minY = Math.max(chunk.minY, this.settings.noise.minY)
		const maxY = Math.min(chunk.maxY, this.settings.noise.minY + this.settings.noise.height)

		const cellWidth = NoiseSettings.cellWidth(this.settings.noise)
		const cellHeight = NoiseSettings.cellHeight(this.settings.noise)
		const cellCountXZ = Math.floor(16 / cellWidth)

		const minCellY = Math.floor(minY / cellHeight)
		const cellCountY = Math.floor((maxY - minY) / cellHeight)

		const minX = ChunkPos.minBlockX(chunk.pos)
		const minZ = ChunkPos.minBlockZ(chunk.pos)

		const noiseChunk = this.getOrCreateNoiseChunk(randomState, chunk)

		for (let cellX = 0; cellX < cellCountXZ; cellX += 1) {
			for (let cellZ = 0; cellZ < (onlyFirstZ ? 1 : cellCountXZ); cellZ += 1) {
				let section = chunk.getOrCreateSection(chunk.sectionsCount - 1)
				for (let cellY = cellCountY - 1; cellY >= 0; cellY -= 1) {
					for (let offY = cellHeight - 1; offY >= 0; offY -= 1) {
						const blockY = (minCellY + cellY) * cellHeight + offY
						const sectionY = blockY & 0xF
						const sectionIndex = chunk.getSectionIndex(blockY)
						if (chunk.getSectionIndex(section.minBlockY) !== sectionIndex) {
							section = chunk.getOrCreateSection(sectionIndex)
						}
						for (let offX = 0; offX < cellWidth; offX += 1) {
							const blockX = minX + cellX * cellWidth + offX
							const sectionX = blockX & 0xF
							for (let offZ = 0; offZ < (onlyFirstZ ? 1 : cellWidth); offZ += 1) {
								const blockZ = minZ + cellZ * cellWidth + offZ
								const sectionZ = blockZ & 0xF
								const state = noiseChunk.getFinalState(blockX, blockY, blockZ) ?? this.settings.defaultBlock
								section.setBlockState(sectionX, sectionY, sectionZ, state)
							}
						}
					}
				}
			}
		}
	}

	public buildSurface(randomState: RandomState, chunk: Chunk, /** @deprecated */ biome: string = 'minecraft:plains') {
		const noiseChunk = this.getOrCreateNoiseChunk(randomState, chunk)
		const context = WorldgenContext.create(this.settings.noise.minY, this.settings.noise.height)
		randomState.surfaceSystem.buildSurface(chunk, noiseChunk, context, () => biome)
	}

	public computeBiome(randomState: RandomState, quartX: number, quartY: number, quartZ: number) {
		return this.biomeSource.getBiome(quartX, quartY, quartZ, randomState.sampler)
	}

	private getOrCreateNoiseChunk(randomState: RandomState, chunk: Chunk) {
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
	
			return new NoiseChunk(cellCountXZ, cellCountY, minCellY, randomState, minX, minZ, this.settings.noise, this.settings.aquifersEnabled, this.globalFluidPicker)
		})
	}
}
