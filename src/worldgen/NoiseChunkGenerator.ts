import type { Chunk } from '../core/index.js'
import { BlockState, ChunkPos } from '../core/index.js'
import type { FluidPicker } from './Aquifer.js'
import { FluidStatus } from './Aquifer.js'
import type { BiomeSource } from './biome/index.js'
import { DensityVolume } from './DensityVolume.js'
import type { Heightmap } from './Heightmap.js'
import { NoiseChunk } from './NoiseChunk.js'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'
import type { RandomState } from './RandomState.js'

export class NoiseChunkGenerator {
	private readonly globalFluidPicker: FluidPicker

	constructor(
		private readonly biomeSource: BiomeSource,
		private readonly settings: NoiseGeneratorSettings,
	) {
		const lavaStatus = new FluidStatus(-54, BlockState.LAVA)
		const seaStatus = new FluidStatus(settings.seaLevel, settings.defaultFluid)
		this.globalFluidPicker = (x, y, z) => {
			if (y < Math.min(-54, settings.seaLevel)) {
				return lavaStatus
			}
			return seaStatus
		}
	}

	public getBaseHeight(blockX: number, blockZ: number, heightmap: Heightmap, randomState: RandomState) {
		let predicate: (state: BlockState) => boolean
		if (heightmap === 'OCEAN_FLOOR' || heightmap === 'OCEAN_FLOOR_WG'){
			predicate = (state: BlockState) => !state.equals(BlockState.AIR) && !state.isFluid()
		} else {
			predicate = (state: BlockState) => !state.equals(BlockState.AIR)
		}
		return this.iterateNoiseColumn(randomState, blockX, blockZ, undefined, predicate) ?? this.settings.noise.minY
	}

	private iterateNoiseColumn(randomState: RandomState, blockX: number, blockZ: number, fillArray?: BlockState[], predicate?: (blockState: BlockState) => boolean): number | undefined {
		if (this.settings.noise.height <= 0) {
			return undefined
		}
		const volume = new DensityVolume(1, this.settings.noise.height, 1, blockX, this.settings.noise.minY, blockZ)
		const noiseChunk = new NoiseChunk(randomState, this.settings, this.globalFluidPicker, volume)
		const finalDensity = randomState.router.finalDensity
		const densityBuffer = finalDensity.computeVolume(volume)
		for (let y = volume.sizeY - 1; y >= 0; y -= 1) {
			const density = densityBuffer[volume.indexUnchecked(0, y, 0)]
			const blockY = volume.blockY(y)
			const state = noiseChunk.aquifer.computeSubstance(blockX, blockY, blockZ, density) ?? this.settings.defaultBlock
			if (fillArray !== undefined){
				fillArray[y] = state
			}
			if (predicate !== undefined && predicate(state)){
				return blockY + 1
			}
		}
		return undefined
	}

	public buildTerrain(randomState: RandomState, chunk: Chunk, onlyFirstZ?: boolean, /** @deprecated */ biome?: string) {
		const noiseChunk = this.createNoiseChunk(randomState, chunk, onlyFirstZ)
		this.doFill(chunk, noiseChunk)
		this.buildSurface(chunk, noiseChunk, biome)
	}

	private doFill(chunk: Chunk, noiseChunk: NoiseChunk, onlyFirstZ?: boolean) {
		const volume = noiseChunk.volume
		const finalDensity = noiseChunk.randomState.router.finalDensity
		const densityBuffer = finalDensity.computeVolume(volume)
		for (let z = 0; z < volume.sizeZ; z += 1) {
			const blockZ = volume.blockZ(z)
			for (let x = 0; x < volume.sizeX; x += 1) {
				const blockX = volume.blockX(x)
				for (let y = volume.sizeY - 1; y >= 0; y -= 1) {
					const blockY = volume.blockY(y)
					const section = chunk.getOrCreateSection(chunk.getSectionIndex(blockY))
					const density = densityBuffer[volume.indexUnchecked(x, y, z)]
					const state = noiseChunk.aquifer.computeSubstance(blockX, blockY, blockZ, density) ?? this.settings.defaultBlock
					section.setBlockState(x, blockY & 15, z, state)
				}
			}
		}
	}

	private buildSurface(chunk: Chunk, noiseChunk: NoiseChunk, /** @deprecated */ biome: string = 'minecraft:plains') {
		noiseChunk.randomState.surfaceSystem.buildSurface(chunk, noiseChunk, this.settings.noise, () => biome)
	}

	public computeBiome(randomState: RandomState, quartX: number, quartY: number, quartZ: number) {
		return this.biomeSource.getBiome(quartX, quartY, quartZ, randomState.sampler)
	}

	private createNoiseChunk(randomState: RandomState, chunk: Chunk, onlyFirstZ?: boolean) {
		const volume = new DensityVolume(16, this.settings.noise.height, onlyFirstZ ? 1 : 16, ChunkPos.minBlockX(chunk.pos), this.settings.noise.minY, ChunkPos.minBlockZ(chunk.pos))
		return new NoiseChunk(randomState, this.settings, this.globalFluidPicker, volume)
	}
}
