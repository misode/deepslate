import type { ChunkPos } from '../core'
import { lerp } from '../math'

export type NoiseColumnFiller = (column: number[], x: number, z: number, cellMinY: number, cellCountY: number) => void

export class NoiseInterpolator {
	private readonly minCellX: number
	private readonly minCellZ: number
	private slice0: number[][]
	private slice1: number[][]
	private noise000: number = 0
	private noise001: number = 0
	private noise100: number = 0
	private noise101: number = 0
	private noise010: number = 0
	private noise011: number = 0
	private noise110: number = 0
	private noise111: number = 0
	private valueXZ00: number = 0
	private valueXZ10: number = 0
	private valueXZ01: number = 0
	private valueXZ11: number = 0
	private valueZ0: number = 0
	private valueZ1: number = 0

	constructor(
		cellCountX: number,
		private readonly cellCountY: number,
		private readonly cellCountZ: number,
		chunkPos: ChunkPos,
		private readonly cellMinY: number,
		private readonly filler: NoiseColumnFiller
	) {
		this.minCellX = chunkPos[0] * cellCountX
		this.minCellZ = chunkPos[1] * cellCountZ
		this.slice0 = NoiseInterpolator.allocateSlice(cellCountY, cellCountZ)
		this.slice1 = NoiseInterpolator.allocateSlice(cellCountY, cellCountZ)
	}

	private static allocateSlice(cellCountY: number, cellCountZ: number) {
		const slice: number[][] = Array(cellCountZ + 1)
		for (let i = 0; i < cellCountZ + 1; i += 1) {
			slice[i] = Array(cellCountY + 1)
		}
		return slice
	}

	public initializeForFirstCellX() {
		this.fillSlice(this.slice0, this.minCellX)
	}

	public advanceCellX(x: number) {
		this.fillSlice(this.slice1, this.minCellX + x + 1)
	}

	private fillSlice(slice: number[][], x: number) {
		for (let z = 0; z < this.cellCountZ + 1; z += 1) {
			this.filler(slice[z], x, this.minCellZ + z, this.cellMinY, this.cellCountY)
		}
	}

	public selectCellYZ(y: number, z: number) {
		this.noise000 = this.slice0[z][y]
		this.noise001 = this.slice0[z + 1][y]
		this.noise100 = this.slice1[z][y]
		this.noise101 = this.slice1[z + 1][y]
		this.noise010 = this.slice0[z][y + 1]
		this.noise011 = this.slice0[z + 1][y + 1]
		this.noise110 = this.slice1[z][y + 1]
		this.noise111 = this.slice1[z + 1][y + 1]
	}

	public updateForY(y: number) {
		this.valueXZ00 = lerp(y, this.noise000, this.noise010)
		this.valueXZ10 = lerp(y, this.noise100, this.noise110)
		this.valueXZ01 = lerp(y, this.noise001, this.noise011)
		this.valueXZ11 = lerp(y, this.noise101, this.noise111)
	}

	public updateForX(x: number) {
		this.valueZ0 = lerp(x, this.valueXZ00, this.valueXZ10)
		this.valueZ1 = lerp(x, this.valueXZ01, this.valueXZ11)
	}

	public calculateValue(z: number) {
		return lerp(z, this.valueZ0, this.valueZ1)
	}

	public swapSlices() {
		[this.slice0, this.slice1] = [this.slice1, this.slice0]
	}
}
