import type { Direction } from '../core/index.js'

export type Cull = {[key in Direction]?: boolean}

export namespace Cull {
	export function rotate(cull: Cull, x: number, y: number) {
		let { up, down, north, east, south, west } = cull

		switch (y) {
			case 90:
				[north, east, south, west] = [east, south, west, north]
				break
			case 180:
				[north, east, south, west] = [south, west, north, east]
				break
			case 270:
				[north, east, south, west] = [west, north, east, south]
		}
	
		switch (x) {
			case 90:
				[up, north, down, south] = [north, down, south, up]
				break
			case 180:
				[up, north, down, south] = [down, south, up, north]
				break
			case 270:
				[up, north, down, south] = [south, up, north, down]
		}
	
		return { up, down, north, east, south, west }
	}

	export function none(): Cull {
		return Object.create(null)
	}
}
