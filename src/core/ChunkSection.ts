import { BlockState } from './BlockState.js'
import { PalettedContainer } from './PalettedContainer.js'

export class ChunkSection {
	public static readonly WIDTH = 16
	public static readonly SIZE = ChunkSection.WIDTH * ChunkSection.WIDTH * ChunkSection.WIDTH

	private readonly states: PalettedContainer<BlockState>

	constructor(
		public readonly minY: number
	) {
		this.states = new PalettedContainer(ChunkSection.SIZE, BlockState.AIR)
	}

	public get minBlockY() {
		return this.minY << 4
	}

	public getBlockState(x: number, y: number, z: number) {
		return this.states.get(x, y, z)
	}

	public setBlockState(x: number, y: number, z: number, state: BlockState) {
		this.states.set(x, y, z, state)
	}
}
