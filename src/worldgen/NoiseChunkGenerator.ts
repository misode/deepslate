import type { Chunk } from '../core'
import { BlockState, ChunkPos } from '../core'
import { computeIfAbsent } from '../util'
import type { FluidPicker } from './Aquifer'
import { FluidStatus } from './Aquifer'
import type { BiomeSource } from './biome'
import { NoiseChunk } from './NoiseChunk'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings'
import { NoiseRouter } from './NoiseRouter'
import { NoiseSettings } from './NoiseSettings'
import { SurfaceSystem } from './SurfaceSystem'
import { WorldgenContext } from './VerticalAnchor'

export class NoiseChunkGenerator {
	private readonly router: NoiseRouter
	private readonly noiseChunkCache: Map<bigint, NoiseChunk>
	private readonly surfaceSystem: SurfaceSystem
	private readonly globalFluidPicker: FluidPicker

	constructor(
		seed: bigint,
		private readonly biomeSource: BiomeSource,
		private readonly settings: NoiseGeneratorSettings,
	) {
		this.router = NoiseRouter.create(settings.noiseRouter, settings.noise, seed, settings.legacyRandomSource)
		this.noiseChunkCache = new Map()

		this.surfaceSystem = new SurfaceSystem(settings.surfaceRule, settings.defaultBlock, seed)
		const lavaFluid = new FluidStatus(-54, BlockState.LAVA)
		const defaultFluid = new FluidStatus(settings.seaLevel, settings.defaultFluid)
		this.globalFluidPicker = (x, y, z) => {
			if (y < Math.min(-54, settings.seaLevel)) {
				return lavaFluid
			}
			return defaultFluid
		}
	}

	public fill(chunk: Chunk, /** @deprecated */ onlyFirstZ: boolean = false) {
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

		for (let cellX = 0; cellX < cellCountXZ; cellX += 1) {
			noiseChunk.advanceCellX(cellX)
			for (let cellZ = 0; cellZ < (onlyFirstZ ? 1 : cellCountXZ); cellZ += 1) {
				let section = chunk.getOrCreateSection(chunk.sectionsCount - 1)
				for (let cellY = cellCountY - 1; cellY >= 0; cellY -= 1) {
					noiseChunk.selectCellYZ(cellY, cellZ)

					for (let offY = cellHeight - 1; offY >= 0; offY -= 1) {
						const blockY = (minCellY + cellY) * cellHeight + offY
						const sectionY = blockY & 0xF
						const sectionIndex = chunk.getSectionIndex(blockY)
						if (chunk.getSectionIndex(section.minBlockY) !== sectionIndex) {
							section = chunk.getOrCreateSection(sectionIndex)
						}
						const y = offY / cellHeight
						noiseChunk.updateForY(blockY, y)
						for (let offX = 0; offX < cellWidth; offX += 1) {
							const blockX = minX + cellX * cellWidth + offX
							const sectionX = blockX & 0xF
							const x = offX / cellWidth
							noiseChunk.updateForX(blockX, x)
							for (let offZ = 0; offZ < (onlyFirstZ ? 1 : cellWidth); offZ += 1) {
								const blockZ = minZ + cellZ * cellWidth + offZ
								const sectionZ = blockZ & 0xF
								const z = offZ / cellWidth
								noiseChunk.updateForZ(blockZ, z)
								const state = noiseChunk.getInterpolatedState() ?? this.settings.defaultBlock
								section.setBlockState(sectionX, sectionY, sectionZ, state)
							}
						}
					}
				}
			}
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
	
			return new NoiseChunk(cellCountXZ, cellCountY, minCellY, this.router, minX, minZ, this.settings, this.globalFluidPicker)
		})
	}
}
