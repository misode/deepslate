import { Direction } from './Direction'

export type BlockPos = [number, number, number]

export namespace BlockPos {
	export function create(x: number, y: number, z: number): BlockPos {
		return [x, y, z]
	}

	export function offset(pos: BlockPos, dx: number, dy: number, dz: number): BlockPos {
		return [pos[0] + dx, pos[1] + dy, pos[2] + dz]
	}

	export function towards(pos: BlockPos, dir: Direction): BlockPos {
		return BlockPos.offset(pos, ...Direction.normal(dir))
	}
}
