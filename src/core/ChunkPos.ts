import type { BlockPos } from '.'

export type ChunkPos = [number, number]

export namespace ChunkPos {
	export function create(x: number, z: number): ChunkPos {
		return [x, z]
	}

	export function fromBlockPos(blockPos: BlockPos): ChunkPos {
		return [blockPos[0] >> 4, blockPos[2] >> 4]
	}

	export function fromLong(long: bigint): ChunkPos {
		return [Number(long) & 0xFFFFFFFF, Number(long >> BigInt(32))]
	}

	export function minBlockX(chunkPos: ChunkPos) {
		return chunkPos[0] << 4
	}

	export function minBlockZ(chunkPos: ChunkPos) {
		return chunkPos[1] << 4
	}

	export function maxBlockX(chunkPos: ChunkPos) {
		return chunkPos[0] << 4 + 15
	}

	export function maxBlockZ(chunkPos: ChunkPos) {
		return chunkPos[1] << 4 + 15
	}
}
