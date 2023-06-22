
export type Heightmap = 'WORLD_SURFACE_WG' | 'WORLD_SURFACE' | 'OCEAN_FLOOR_WG' | 'OCEAN_FLOOR' | 'MOTION_BLOCKING' | 'MOTION_BLOCKING_NO_LEAVES'

export namespace Heightmap {
	export function fromJson(obj: unknown): Heightmap | undefined {
		if (typeof obj === 'string') {
			if (obj === 'WORLD_SURFACE_WG' || obj === 'WORLD_SURFACE' || obj === 'OCEAN_FLOOR_WG' || obj === 'OCEAN_FLOOR' || obj === 'MOTION_BLOCKING' || obj === 'MOTION_BLOCKING_NO_LEAVES') {
				return obj
			}
		}
	}
}
