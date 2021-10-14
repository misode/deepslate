import { lerp } from '../math'
import type { NoiseChunk, NoiseFiller } from './NoiseChunk'

export class NoiseInterpolator {
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
	private value: number = 0

	constructor(
		private readonly chunk: NoiseChunk,
		private readonly filler: NoiseFiller
	) {
		this.slice0 = NoiseInterpolator.allocateSlice(chunk.cellCountY, chunk.cellCountXZ)
		this.slice1 = NoiseInterpolator.allocateSlice(chunk.cellCountY, chunk.cellCountXZ)
	}

	private static allocateSlice(cellCountY: number, cellCountZ: number) {
		const slice: number[][] = Array(cellCountZ + 1)
		for (let i = 0; i < cellCountZ + 1; i += 1) {
			slice[i] = Array(cellCountY + 1)
		}
		return slice
	}

	public initializeForFirstCellX() {
		this.fillSlice(this.slice0, this.chunk.firstCellX)
	}

	public advanceCellX(x: number) {
		this.fillSlice(this.slice1, this.chunk.firstCellX + x + 1)
	}

	private fillSlice(slice: number[][], x: number) {
		const xx = x * this.chunk.cellWidth
		for (let z = 0; z < this.chunk.cellCountXZ + 1; z += 1) {
			const zz = (this.chunk.firstCellZ + z) * this.chunk.cellWidth
			for (let y = 0; y < this.chunk.cellCountY + 1; y += 1) {
				const yy = (this.chunk.cellCountNoiseMinY + y) * this.chunk.cellHeight
				slice[z][y] = this.filler(xx, yy, zz)
			}
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

	public updateForZ(z: number) {
		this.value = lerp(z, this.valueZ0, this.valueZ1)
	}

	public sample() {
		return this.value
	}

	public swapSlices() {
		[this.slice0, this.slice1] = [this.slice1, this.slice0]
	}
}
