import { BlockState } from './BlockState'

export class ChunkSection {
	public static readonly WIDTH = 16
	public static readonly SIZE = ChunkSection.WIDTH * ChunkSection.WIDTH * ChunkSection.WIDTH

	private readonly storage: number[]
	private readonly palette: BlockState[]

	constructor(
		public readonly minY: number
	) {
		this.storage = Array(ChunkSection.SIZE).fill(0)
		this.palette = [BlockState.AIR]
	}

	public get minBlockY() {
		return this.minY << 4
	}

	private index(x: number, y: number, z: number) {
		return (x << 8) + (y << 4) + z
	}

	public getBlockState(x: number, y: number, z: number) {
		const id = this.storage[this.index(x, y, z)]
		return this.palette[id] ?? BlockState.AIR
	}

	public setBlockState(x: number, y: number, z: number, state: BlockState) {
		let id = this.palette.findIndex(b => b.equals(state))
		if (id === -1) {
			id = this.palette.length
			this.palette.push(state)
		}
		this.storage[this.index(x, y, z)] = id
	}
}
