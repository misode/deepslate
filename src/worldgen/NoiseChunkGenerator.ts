import type { Chunk } from '../core'
import { BlockState, ChunkPos } from '../core'
import { clamp } from '../math'
import type { BiomeSource, TerrainShaper } from './biome'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings'
import { NoiseInterpolator } from './NoiseInterpolator'
import { NoiseSampler } from './NoiseSampler'

export class NoiseChunkGenerator {
	private readonly cellHeight: number
	private readonly cellWidth: number
	private readonly cellCountXZ: number
	private readonly cellCountY: number
	private readonly sampler: NoiseSampler

	constructor(
		private readonly seed: bigint,
		private readonly biomeSource: BiomeSource,
		private readonly settings: NoiseGeneratorSettings,
		shapeOverride?: TerrainShaper.Shape,
	) {
		this.cellHeight = settings.noise.ySize << 2
		this.cellWidth = settings.noise.xzSize << 2
		this.cellCountXZ = Math.floor(16 / this.cellWidth)
		this.cellCountY = Math.floor(settings.noise.height / this.cellHeight)

		this.sampler = new NoiseSampler(this.cellWidth, this.cellHeight, this.cellCountY, biomeSource, settings.noise, settings.octaves, seed, shapeOverride)
	}

	public fill(chunk: Chunk) {
		const minY = Math.max(chunk.minY, this.settings.noise.minY)
		const maxY = Math.min(chunk.maxY, this.settings.noise.minY + this.settings.noise.height)

		const minCellY = Math.floor(minY / this.cellHeight)
		const cellCountY = Math.floor((maxY - minY) / this.cellHeight)

		const minX = ChunkPos.minBlockX(chunk.pos)
		const minZ = ChunkPos.minBlockZ(chunk.pos)

		const baseInterpolator = new NoiseInterpolator(this.cellCountXZ, cellCountY, this.cellCountXZ, chunk.pos, minCellY,this.sampler.fillNoiseColumn.bind(this.sampler))
		const interpolators = Array(baseInterpolator)

		interpolators.forEach(i => i.initializeForFirstCellX())
		for (let cellX = 0; cellX < this.cellCountXZ; cellX += 1) {
			interpolators.forEach(i => i.advanceCellX(cellX))
			for (let cellZ = 0; cellZ < this.cellCountXZ; cellZ += 1) {
				let section = chunk.getOrCreateSection(chunk.sectionsCount - 1)
				for (let cellY = cellCountY - 1; cellY >= 0; cellY -= 1) {
					interpolators.forEach(i => i.selectCellYZ(cellY, cellZ))

					for (let offY = this.cellHeight - 1; offY >= 0; offY -= 1) {
						const worldY = (minCellY + cellY) * this.cellHeight + offY
						const sectionY = worldY & 0xF
						const sectionIndex = chunk.getSectionIndex(worldY)
						if (chunk.getSectionIndex(section.minBlockY) !== sectionIndex) {
							section = chunk.getOrCreateSection(sectionIndex)
						}
						const y = offY / this.cellHeight
						interpolators.forEach(i => i.updateForY(y))
						for (let offX = 0; offX < this.cellWidth; offX += 1) {
							const worldX = minX + cellX * this.cellWidth + offX
							const sectionX = worldX & 0xF
							const x = offX / this.cellWidth
							interpolators.forEach(i => i.updateForX(x))
							for (let offZ = 0; offZ < this.cellWidth; offZ += 1) {
								const worldZ = minZ + cellZ * this.cellWidth + offZ
								const sectionZ = worldZ & 0xF
								const z = offZ / this.cellWidth

								const noise = baseInterpolator.calculateValue(z)
								const state = this.baseState(worldX, worldY, worldZ, noise)
								if (state.equals(BlockState.AIR)) {
									continue
								}
								section.setBlockState(sectionX, sectionY, sectionZ, state)
							}
						}
					}
				}
			}
			interpolators.forEach(i => i.swapSlices())
		}
	}

	private baseState(x: number, y: number, z: number, noise: number) {
		noise = clamp(noise / 200, -1, 1)
		noise = noise / 2 - noise * noise * noise / 24
		if (noise > 0) {
			return this.settings.defaultBlock
		}
		if (y < this.settings.seaLevel) {
			return this.settings.defaultFluid
		}
		return BlockState.AIR
	}
}
