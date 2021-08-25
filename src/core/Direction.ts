export enum Direction {
	UP = 'up',
	DOWN = 'down',
	NORTH = 'north',
	EAST = 'east',
	SOUTH = 'south',
	WEST = 'west',
}

const directionNormals: Record<Direction, [number, number, number]> = {
	[Direction.UP]: [0, 1, 0],
	[Direction.DOWN]: [0, -1, 0],
	[Direction.NORTH]: [0, 0, -1],
	[Direction.EAST]: [1, 0, 0],
	[Direction.SOUTH]: [0, 0, 1],
	[Direction.WEST]: [-1, 0, 0],
}

export namespace Direction {
	export const ALL = [Direction.UP, Direction.DOWN, Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST]

	export function normal(dir: Direction): [number, number, number] {
		return directionNormals[dir]
	}
}
