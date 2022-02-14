import type { BlockState } from '../core'
import { ChunkPos, computeIfAbsent } from '../core'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings'
import { NoiseInterpolator } from './NoiseInterpolator'
import type { FlatNoiseData, NoiseSampler } from './NoiseSampler'
import { NoiseSettings } from './NoiseSettings'

export class NoiseChunk {
	public readonly firstCellX: number
	public readonly firstCellZ: number
	public readonly firstNoiseX: number
	public readonly firstNoiseZ: number
	private readonly interpolators: NoiseInterpolator[]
	private readonly noiseData: FlatNoiseData[][]
	private readonly preliminarySurfaceLevel: Map<bigint, number>
	private readonly baseNoise: BlockStateFiller

	constructor(
		public readonly cellCountXZ: number,
		public readonly cellCountY: number,
		public readonly cellCountNoiseMinY: number,
		private readonly sampler: NoiseSampler,
		blockX: number,
		blockZ: number,
		noiseFiller: NoiseFiller,
		public readonly settings: NoiseGeneratorSettings,
	) {
		const cellWidth = NoiseSettings.cellWidth(settings.noise)
		this.firstCellX = Math.floor(blockX / cellWidth)
		this.firstCellZ = Math.floor(blockZ / cellWidth)
		this.firstNoiseX = blockX >> 2
		this.firstNoiseZ = blockZ >> 2
		this.interpolators = []

		const n = (cellCountXZ * cellWidth) >> 2
		this.noiseData = Array(n + 1)
		for (let x = 0; x <= n; x += 1) {
			const xx = this.firstNoiseX + x
			this.noiseData[x] = Array(n + 1)
			for (let z = 0; z <= n; z += 1) {
				const zz = this.firstNoiseZ + z
				this.noiseData[x][z] = sampler.noiseData(xx, zz)
			}
		}
		this.preliminarySurfaceLevel = new Map()
		this.baseNoise = sampler.makeBaseNoiseFiller(this, noiseFiller, settings.noodleCavesEnabled)
	}

	public getNoiseData(x: number, z: number) {
		return this.noiseData[x - this.firstNoiseX][z - this.firstNoiseZ]
	}

	public getPreliminarySurfaceLevel(x: number, z: number) {
		return computeIfAbsent(this.preliminarySurfaceLevel, ChunkPos.asLong(x, z), () => {
			const xx = x - this.firstNoiseX
			const zz = z - this.firstNoiseZ
			const n = this.noiseData.length
			const terrainInfo = xx >= 0 && zz >= 0 && xx < n && zz < n
				? this.noiseData[xx][zz].terrainInfo
				: this.sampler.noiseData(x, z).terrainInfo
			const level = this.sampler.getPreliminarySurfaceLevel(x << 2, z << 2, terrainInfo)
			return level
		})
	}

	public createNoiseInterpolator(filler: NoiseFiller) {
		const interpolator = new NoiseInterpolator(this, filler)
		this.interpolators.push(interpolator)
		return interpolator.sample.bind(interpolator)
	}

	public initializeForFirstCellX() {
		this.interpolators.forEach(i => i.initializeForFirstCellX())
	}

	public advanceCellX(x: number) {
		this.interpolators.forEach(i => i.advanceCellX(x))
	}

	public selectCellYZ(y: number, z: number) {
		this.interpolators.forEach(i => i.selectCellYZ(y, z))
	}

	public updateForY(y: number) {
		this.interpolators.forEach(i => i.updateForY(y))
	}

	public updateForX(x: number) {
		this.interpolators.forEach(i => i.updateForX(x))
	}

	public updateForZ(z: number) {
		this.interpolators.forEach(i => i.updateForZ(z))
	}

	public swapSlices() {
		this.interpolators.forEach(i => i.swapSlices())
	}

	public updateNoiseAndGenerateBaseState(x: number, y: number, z: number) {
		return this.baseNoise(x, y, z)
	}
}

export type NoiseFiller = (x: number, y: number, z: number) => number

export type BlockStateFiller = (x: number, y: number, z: number) => BlockState | null

export type TerrainInfo = {
	offset: number,
	factor: number,
	jaggedness: number,
}
export namespace TerrainInfo {
	export function create(offset: number, factor: number, jaggedness: number): TerrainInfo {
		return { offset, factor, jaggedness }
	}
}

export type InterpolatableNoise = (chunk: NoiseChunk) => () => number
