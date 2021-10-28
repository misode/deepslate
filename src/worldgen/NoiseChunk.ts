import type { BlockState } from '../core'
import { NoiseInterpolator } from './NoiseInterpolator'
import type { NoiseSampler } from './NoiseSampler'

export class NoiseChunk {
	public readonly firstCellX: number
	public readonly firstCellZ: number
	private readonly interpolators: NoiseInterpolator[]
	private readonly shiftedX: number[][]
	private readonly shiftedZ: number[][]
	private readonly continentalness: number[][]
	private readonly weirdness: number[][]
	private readonly erosion: number[][]
	private readonly terrainInfoBuffer: TerrainInfo[][]
	private readonly terrainInfo: Map<number, TerrainInfo>
	private readonly baseNoise: BlockStateFiller

	constructor(
		public readonly cellWidth: number,
		public readonly cellHeight: number,
		public readonly cellCountXZ: number,
		public readonly cellCountY: number,
		public readonly cellCountNoiseMinY: number,
		sampler: NoiseSampler,
		blockX: number,
		blockZ: number,
		noiseFiller: NoiseFiller,
	) {
		this.firstCellX = Math.floor(blockX / cellWidth)
		this.firstCellZ = Math.floor(blockZ / cellWidth)
		this.interpolators = []
		this.terrainInfo = new Map()

		const length = cellCountXZ * cellWidth + 1
		this.shiftedX = Array(length)
		this.shiftedZ = Array(length)
		this.continentalness = Array(length)
		this.weirdness = Array(length)
		this.erosion = Array(length)
		this.terrainInfoBuffer = Array(length)
		for (let x = 0; x < length; x += 1) {
			const xx = this.firstCellX + x
			this.shiftedX[x] = Array(length)
			this.shiftedZ[x] = Array(length)
			this.continentalness[x] = Array(length)
			this.weirdness[x] = Array(length)
			this.erosion[x] = Array(length)
			this.terrainInfoBuffer[x] = Array(length)
			for (let z = 0; z < length; z += 1) {
				const zz = this.firstCellZ + z
				const data = FlatNoiseData.create(sampler, xx, zz)
				this.shiftedX[x][z] = data.shiftedX
				this.shiftedZ[x][z] = data.shiftedZ
				this.continentalness[x][z] = data.continentalness
				this.weirdness[x][z] = data.weirdness
				this.erosion[x][z] = data.erosion
				this.terrainInfoBuffer[x][z] = data.terrainInfo
			}
		}
		this.baseNoise = sampler.makeBaseNoiseFiller(this, noiseFiller)
	}

	public getShiftedX(x: number, z: number) {
		return this.shiftedX[x - this.firstCellX][z - this.firstCellZ]
	}

	public getShiftedZ(x: number, z: number) {
		return this.shiftedZ[x - this.firstCellX][z - this.firstCellZ]
	}

	public getContinentalness(x: number, z: number) {
		return this.continentalness[x - this.firstCellX][z - this.firstCellZ]
	}

	public getWeirdness(x: number, z: number) {
		return this.weirdness[x - this.firstCellX][z - this.firstCellZ]
	}

	public getErosion(x: number, z: number) {
		return this.erosion[x - this.firstCellX][z - this.firstCellZ]
	}

	public getTerrainInfo(x: number, z: number) {
		return this.terrainInfoBuffer[x - this.firstCellX][z - this.firstCellZ]
	}

	public createNoiseInterpolator(filler: NoiseFiller) {
		const interpolator = new NoiseInterpolator(this, filler)
		this.interpolators.push(interpolator)
		return interpolator
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

export type FlatNoiseData = {
	shiftedX: number,
	shiftedZ: number,
	continentalness: number,
	weirdness: number,
	erosion: number,
	terrainInfo: TerrainInfo,
}
export namespace FlatNoiseData {
	export function create(sampler: NoiseSampler, x: number, z: number): FlatNoiseData {
		const shiftedX = x + sampler.getOffset(x, 0, z)
		const shiftedZ = z + sampler.getOffset(z, x, 0)
		const continentalness = sampler.getContinentalness(shiftedX, shiftedZ)
		const weirdness = sampler.getWeirdness(shiftedX, shiftedZ)
		const erosion = sampler.getErosion(shiftedX, shiftedZ)
		const terrainInfo = sampler.getTerrainInfo(shiftedX << 2, shiftedZ << 2, continentalness, weirdness, erosion)
		return { shiftedX, shiftedZ, continentalness, weirdness, erosion, terrainInfo }
	}
}

export type InterpolatableNoise = (chunk: NoiseChunk) => () => number
