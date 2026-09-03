import { BlockPos, BlockState, ChunkPos, Holder } from '../core/index.js'
import type { PositionalRandom } from '../math/index.js'
import { clamp, clampedMap, intFloor, map, quantize } from '../math/index.js'
import { computeIfAbsent, Json } from '../util/index.js'
import { DensityFunction } from './DensityFunction.js'
import { DensityVolume } from './DensityVolume.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

export interface AquiferConfig {
	barrier: DensityFunction,
	fluidLevelFloodedness: DensityFunction,
	fluidLevelSpread: DensityFunction,
	lava: DensityFunction,
	exclusion: DensityFunction,
	surfaceLevel: DensityFunction,
}
export namespace AquiferConfig {
	const fieldParser = (obj: unknown) => new DensityFunction.HolderHolder(Holder.parser(WorldgenRegistries.DENSITY_FUNCTION, DensityFunction.fromJson)(obj))

	export function fromJson(obj: unknown): AquiferConfig {
		const root = Json.readObject(obj) ?? {}
		return {
			barrier: fieldParser(root.barrier),
			fluidLevelFloodedness: fieldParser(root.fluid_level_floodedness),
			fluidLevelSpread: fieldParser(root.fluid_level_spread),
			lava: fieldParser(root.lava),
			exclusion: fieldParser(root.exclusion),
			surfaceLevel: fieldParser(root.surface_level),
		}
	}

	export function mapAll(config: AquiferConfig, visitor: DensityFunction.Visitor): AquiferConfig {
		return {
			barrier: config.barrier.mapAll(visitor),
			fluidLevelFloodedness: config.fluidLevelFloodedness.mapAll(visitor),
			fluidLevelSpread: config.fluidLevelSpread.mapAll(visitor),
			lava: config.lava.mapAll(visitor),
			exclusion: config.exclusion.mapAll(visitor),
			surfaceLevel: config.surfaceLevel.mapAll(visitor),
		}
	}
}

export class FluidStatus {
	constructor(
		public readonly level: number,
		public readonly type: BlockState,
	) {}

	public at(level: number) {
		return level < this.level ? this.type : BlockState.AIR
	}
}

export type FluidPicker = (x: number, y: number, z: number) => FluidStatus

export interface Aquifer {
	computeSubstance(blockX: number, blockY: number, blockZ: number, density: number): BlockState | undefined
}

export namespace Aquifer {
	export function createDisabled(fluidPicker: FluidPicker): Aquifer {
		return {
			computeSubstance(blockX: number, blockY: number, blockZ: number, density) {
				if (density > 0) {
					return undefined
				}
				return fluidPicker(blockX, blockY, blockZ).at(blockY)
			},
		}
	}
}

export class NoiseAquifer implements Aquifer {
	private static readonly X_SPACING = 16
	private static readonly Y_SPACING = 12
	private static readonly Z_SPACING = 16

	private static readonly SURFACE_SAMPLING: [number, number][] = [[-2, -1], [-1, -1], [0, -1], [1, -1], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1]]

	private readonly minGridX: number
	private readonly minGridY: number
	private readonly minGridZ: number
	private readonly maxGridX: number
	private readonly maxGridY: number
	private readonly maxGridZ: number
	private readonly gridSizeX: number
	private readonly gridSizeY: number
	private readonly gridSizeZ: number

	private readonly aquiferCache: (FluidStatus | undefined)[]
	private readonly aquiferLocationCache: (BlockPos | undefined)[]
	private readonly surfaceLevelCache: Map<bigint, number>

	private readonly skipSamplingAboveY: number

	constructor(
		private readonly config: AquiferConfig,
		private readonly random: PositionalRandom,
		private readonly volume: DensityVolume,
		private readonly globalFluidPicker: FluidPicker,
	) {
		this.minGridX = this.gridX(volume.minBlockX - 5) + 0
		this.maxGridX = this.gridX(volume.maxBlockX() - 5) + 1
		this.gridSizeX = this.maxGridX - this.minGridX + 1

		this.minGridY = this.gridY(volume.minBlockY + 1) - 1
		this.maxGridY = this.gridY(volume.maxBlockY() + 1) + 1
		this.gridSizeY = this.maxGridY - this.minGridY + 1

		this.minGridZ = this.gridZ(volume.minBlockZ - 5) + 0
		this.maxGridZ = this.gridZ(volume.maxBlockZ() - 5) + 1
		this.gridSizeZ = this.maxGridZ - this.minGridZ + 1

		const totalGridSize = this.gridSizeX * this.gridSizeY * this.gridSizeZ
		this.aquiferCache = Array(totalGridSize).fill(undefined)
		this.aquiferLocationCache = Array(totalGridSize).fill(undefined)
		this.surfaceLevelCache = new Map()

		const maxAdjustedSurfaceLevel = this.adjustSurfaceLevel(
			this.maxSurfaceLevel(this.fromGridX(this.minGridX, 0), this.fromGridZ(this.minGridZ, 0), this.fromGridX(this.maxGridX, 9), this.fromGridZ(this.maxGridZ, 9))
		)
		this.skipSamplingAboveY = this.fromGridY(this.gridY(maxAdjustedSurfaceLevel + 12) + 1, 11)
	}

	public computeSubstance(blockX: number, blockY: number, blockZ: number, density: number): BlockState | undefined {
		if (density > 0) {
			return undefined
		}
		const globalFluid = this.globalFluidPicker(blockX, blockY, blockZ)
		if (blockY > this.skipSamplingAboveY) {
			return globalFluid.at(blockY)
		}
		if (globalFluid.at(blockY).is(BlockState.LAVA)) {
			return BlockState.LAVA
		}

		const xAnchor = this.gridX(blockX - 5)
		const yAnchor = this.gridY(blockY + 1)
		const zAnchor = this.gridZ(blockZ - 5)
		let distanceSqr1 = Number.MAX_SAFE_INTEGER
		let distanceSqr2 = Number.MAX_SAFE_INTEGER
		let distanceSqr3 = Number.MAX_SAFE_INTEGER
		let closestIndex1 = 0
		let closestIndex2 = 0
		let closestIndex3 = 0

		for (let x1 = 0; x1 <= 1; x1 += 1) {
			for (let y1 = -1; y1 <= 1; y1 += 1) {
				for (let z1 = 0; z1 <= 1; z1 += 1) {
					const spacedGridX = xAnchor + x1
					const spacedGridY = yAnchor + y1
					const spacedGridZ = zAnchor + z1
					const index = this.getIndex(spacedGridX, spacedGridY, spacedGridZ)
					let location = this.aquiferLocationCache[index]
					if (location === undefined) {
						const random = this.random.at(spacedGridX, spacedGridY, spacedGridZ)
						location = BlockPos.create(
							this.fromGridX(spacedGridX, random.nextInt(10)),
							this.fromGridY(spacedGridY, random.nextInt(10)),
							this.fromGridZ(spacedGridZ, random.nextInt(10)),
						)
						this.aquiferLocationCache[index] = location
					}
					const dx = location[0] - blockX
					const dy = location[1] - blockY
					const dz = location[2] - blockZ
					const newDistance = dx * dx + dy * dy + dz * dz
					if (distanceSqr1 >= newDistance) {
						closestIndex3 = closestIndex2
						closestIndex2 = closestIndex1
						closestIndex1 = index
						distanceSqr3 = distanceSqr2
						distanceSqr2 = distanceSqr1
						distanceSqr1 = newDistance
					} else if (distanceSqr2 >= newDistance) {
						closestIndex3 = closestIndex2
						closestIndex2 = index
						distanceSqr3 = distanceSqr2
						distanceSqr2 = newDistance
					} else if (distanceSqr3 >= newDistance) {
						closestIndex3 = index
						distanceSqr3 = newDistance
					}
				}
			}
		}
		const closestStatus1 = this.getAquiferStatus(closestIndex1)
		const similarity12 = NoiseAquifer.similarity(distanceSqr1, distanceSqr2)
		const fluidState = closestStatus1.at(blockY)
		if (similarity12 <= 0) {
			return fluidState
		}
		if (fluidState.is(BlockState.WATER) && this.globalFluidPicker(blockX, blockY - 1, blockZ).at(blockY - 1).is(BlockState.LAVA)) {
			return fluidState
		}
		const barrierNoise: {value: number | undefined} = {value: undefined}
		const closestStatus2 = this.getAquiferStatus(closestIndex2)
		const barrier12 = similarity12 * this.calculatePressure(blockX, blockY, blockZ, barrierNoise, closestStatus1, closestStatus2)
		if (density + barrier12 > 0) {
			return undefined
		}
		const closestStatus3 = this.getAquiferStatus(closestIndex3)
		const similarity13 = NoiseAquifer.similarity(distanceSqr1, distanceSqr3)
		if (similarity13 > 0) {
			const barrier13 = similarity12 * similarity13 * this.calculatePressure(blockX, blockY, blockZ, barrierNoise, closestStatus1, closestStatus3)
			if (density + barrier13 > 0) {
				return undefined
			}
		}
		const similarity23 = NoiseAquifer.similarity(distanceSqr2, distanceSqr3)
		if (similarity23 > 0) {
			const barrier23 = similarity12 * similarity23 * this.calculatePressure(blockX, blockY, blockZ, barrierNoise, closestStatus2, closestStatus3)
			if (density + barrier23 > 0) {
				return undefined
			}
		}
		return fluidState
	}

	private static similarity(a: number, b: number) {
		return 1 - Math.abs(b - a) / 25
	}

	private calculatePressure(blockX: number, blockY: number, blockZ: number, barrierNoise: {value: number | undefined}, statusClosest1: FluidStatus, statusCloses2: FluidStatus): number {
		const type1 = statusClosest1.at(blockY)
		const type2 = statusCloses2.at(blockY)
		if ((type1.is(BlockState.LAVA) && type2.is(BlockState.WATER)) || (type1.is(BlockState.WATER) && type2.is(BlockState.LAVA))) {
			return 2
		}
		const fluidYDiff = Math.abs(statusClosest1.level - statusCloses2.level)
		if (fluidYDiff === 0) {
			return 0
		}
		const levelAvg = (statusClosest1.level + statusCloses2.level) / 2
		const levelAvgDiff = blockY + 0.5 - levelAvg
		const p = fluidYDiff / 2 - Math.abs(levelAvgDiff)
		const gradient = levelAvgDiff > 0
			? p > 0 ? p / 1.5 : p / 2.5
			: p + 3 > 0 ? (p + 3) / 3 : (p + 3) / 10
		if (gradient < -2 || gradient > 2) {
			return 2 * gradient
		}
		if (barrierNoise.value === undefined) {
			barrierNoise.value = this.config.barrier.compute(DensityFunction.context(blockX, blockY, blockZ))
		}
		return 2 * (gradient + barrierNoise.value)
	}

	private getAquiferStatus(index: number) {
		const oldStatus = this.aquiferCache[index]
		if (oldStatus !== undefined) {
			return oldStatus
		}
		const location = this.aquiferLocationCache[index]
		if (location === undefined) {
			throw new Error(`Missing aquifer location cache at index ${index}`)
		}
		const [x, y, z] = location
		const status = this.computeFluid(x, y, z)
		this.aquiferCache[index] = status
		return status
	}

	private computeFluid(x: number, y: number, z: number) {
		const globalFluid = this.globalFluidPicker(x, y, z)
		let lowestPreliminarySurface = Number.MAX_SAFE_INTEGER
		let surfaceAtCenterIsUnderGlobalFluidLevel = false
		for (const [xOffset, zOffset] of NoiseAquifer.SURFACE_SAMPLING) {
			const sampleX = x + (zOffset << 4)
			const sampleZ = z + (zOffset << 4)
			const surfaceLevel = this.surfaceLevel(sampleX, sampleZ)
			const adjustedSurfaceLevel = this.adjustSurfaceLevel(surfaceLevel)
			const start = xOffset === 0 && zOffset === 0
			if (start && y - 12 > adjustedSurfaceLevel) {
				return globalFluid
			}
			if (start || (y + 12 > adjustedSurfaceLevel)) {
				const globalFluidAtSurface = this.globalFluidPicker(sampleX, adjustedSurfaceLevel, sampleZ)
				if (!globalFluidAtSurface.at(adjustedSurfaceLevel).is(BlockState.AIR)) {
					if (start) {
						surfaceAtCenterIsUnderGlobalFluidLevel = true
					} else {
						return globalFluidAtSurface
					}
				}
			}
			lowestPreliminarySurface = Math.min(lowestPreliminarySurface, surfaceLevel)
		}

		const fluidSurfaceLevel = this.computeSurfaceLevel(x, y, z, globalFluid, lowestPreliminarySurface, surfaceAtCenterIsUnderGlobalFluidLevel)
		return new FluidStatus(fluidSurfaceLevel, this.computeFluidType(x, y, z, globalFluid, fluidSurfaceLevel))
	}

	private surfaceLevel(blockX: number, blockZ: number): number {
		const quantizedX = (blockX >> 2) << 2
		const quantizedZ = (blockZ >> 2) << 2
		return computeIfAbsent(this.surfaceLevelCache, ChunkPos.asLong(quantizedX, quantizedZ), () => {
			return intFloor(this.config.surfaceLevel.compute(DensityFunction.context(quantizedX, 0, quantizedZ)))
		})
	}

	private maxSurfaceLevel(minBlockX: number, minBlockZ: number, maxBlockX: number, maxBlockZ: number) {
		const minQuartX = minBlockX >> 2
		const maxQuartX = maxBlockX >> 2
		const minQuartZ = minBlockZ >> 2
		const maxQuartZ = maxBlockZ >> 2
		const volume = new DensityVolume(maxQuartX - minQuartX + 1, 1, maxQuartZ - minQuartZ + 1, minQuartX << 2, 0, minQuartZ << 2, 4, 1, 4)
		const buffer = this.config.surfaceLevel.computeVolume(volume)
		let maxY = -Infinity
		for (let z = 0; z < volume.sizeZ; z += 1) {
			for (let x = 0; x < volume.sizeX; x += 1) {
				const surfaceLevel = intFloor(buffer[volume.indexUnchecked(x, 0, z)])
				this.surfaceLevelCache.set(ChunkPos.asLong(volume.blockX(x), volume.blockZ(z)), surfaceLevel)
				if (surfaceLevel > maxY) {
					maxY = surfaceLevel
				}
			}
		}
		return maxY
	}

	private adjustSurfaceLevel(preliminarySurfaceLevel: number) {
		return preliminarySurfaceLevel + 8
	}

	private computeSurfaceLevel(x: number, y: number, z: number, globalFluid: FluidStatus, lowestSurfaceLevel: number, surfaceAtCenterIsUnderGlobalFluidLevel: boolean): number {
		let partiallyFloodedness
		let fullyFloddedness
		if (this.config.exclusion.compute(DensityFunction.context(x, y, z)) > 0) {
			partiallyFloodedness = -1
			fullyFloddedness = -1
		} else {
			const distanceBelowSurface = this.adjustSurfaceLevel(lowestSurfaceLevel) - y
			const floodednessFactor = surfaceAtCenterIsUnderGlobalFluidLevel ? clampedMap(distanceBelowSurface, 0, 64, 1, 0) : 0
			const floodednessNoiseValue = clamp(this.config.fluidLevelFloodedness.compute(DensityFunction.context(x, y, z)), -1, 1)
			const fullyFloodedThreshold = map(floodednessFactor, 1, 0, -0.3, 0.8)
			const partiallyFloodedThreshold = map(floodednessFactor, 1, 0, -0.8, 0.4)
			partiallyFloodedness = floodednessNoiseValue - partiallyFloodedThreshold
			fullyFloddedness = floodednessNoiseValue - fullyFloodedThreshold
		}

		if (fullyFloddedness > 0) {
			return globalFluid.level
		} else if (partiallyFloodedness > 0) {
			return this.computeRandomizedFluidSurfaceLevel(x, y, z, lowestSurfaceLevel)
		} else {
			return Number.MIN_SAFE_INTEGER
		}
	}

	private computeRandomizedFluidSurfaceLevel(x: number, y: number, z: number, lowestSurfaceLevel: number): number {
		const fluidLevelCellX = Math.floor(x / 16)
		const fluidLevelCellY = Math.floor(y / 40)
		const fluidLevelCellZ = Math.floor(z / 40)
		const fluidCellMiddleY = fluidLevelCellY * 40 + 20
		const fluidLevelSpread = this.config.fluidLevelSpread.compute(DensityFunction.context(fluidLevelCellX, fluidLevelCellY, fluidLevelCellZ))
		const fluidLevelSpreadQuantized = quantize(fluidLevelSpread, 3)
		return Math.min(lowestSurfaceLevel, fluidCellMiddleY + fluidLevelSpreadQuantized)
	}

	private computeFluidType(x: number, y: number, z: number, globalFluid: FluidStatus, fluidSurfaceLevel: number): BlockState {
		if (fluidSurfaceLevel <= -10 && !globalFluid.type.is(BlockState.LAVA)) {
			const lava = this.config.lava.compute(DensityFunction.context(Math.floor(x / 64), Math.floor(y / 40), Math.floor(z / 64)))
			if (Math.abs(lava) > 0.3) {
				return BlockState.LAVA
			}
		}
		return globalFluid.type
	}

	private getIndex(gridX: number, gridY: number, gridZ: number) {
		const x = gridX - this.minGridX
		const y = gridY - this.minGridY
		const z = gridZ - this.minGridZ
		return (y * this.gridSizeZ + z) * this.gridSizeX + x
	}

	private gridX(blockCoord: number) {
		return Math.floor(blockCoord / NoiseAquifer.X_SPACING)
	}

	private fromGridX(gridCoord: number, blockOffset: number) {
		return (gridCoord * NoiseAquifer.X_SPACING) + blockOffset
	}

	private gridY(blockCoord: number) {
		return Math.floor(blockCoord / NoiseAquifer.Y_SPACING)
	}

	private fromGridY(gridCoord: number, blockOffset: number) {
		return (gridCoord * NoiseAquifer.Y_SPACING) + blockOffset
	}

	private gridZ(blockCoord: number) {
		return Math.floor(blockCoord / NoiseAquifer.Z_SPACING)
	}

	private fromGridZ(gridCoord: number, blockOffset: number) {
		return (gridCoord * NoiseAquifer.Z_SPACING) + blockOffset
	}
}
