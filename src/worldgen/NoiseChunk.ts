import type { BlockState } from '../core'
import { BlockPos, ChunkPos } from '../core'
import { lerp, lerp3 } from '../math'
import { computeIfAbsent } from '../util'
import type { FluidPicker } from './Aquifer'
import { Aquifer, NoiseAquifer } from './Aquifer'
import { Climate } from './biome'
import { DensityFunction } from './DensityFunction'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings'
import { NoiseRouter } from './NoiseRouter'
import { NoiseSettings } from './NoiseSettings'

export class NoiseChunk implements DensityFunction.Context, DensityFunction.ContextProvider {
	public readonly cellWidth: number
	public readonly cellHeight: number
	public readonly firstCellX: number
	public readonly firstCellZ: number
	public readonly firstNoiseX: number
	public readonly firstNoiseZ: number
	public readonly noiseSizeXZ: number
	public readonly interpolators: NoiseChunk.Interpolator[] = []
	public readonly cellCaches: NoiseChunk.CacheAllInCell[] = []
	private readonly preliminarySurfaceLevel: Map<bigint, number> = new Map()
	private readonly aquifer: Aquifer
	private readonly materialRule: MaterialRule
	private readonly initialDensityWithoutJaggedness: DensityFunction
	private readonly sliceFillingContextProvider: DensityFunction.ContextProvider

	public fillingCell: boolean = false
	public interpolating: boolean = false
	private cellStartBlockX: number = 0
	private cellStartBlockY: number = 0
	private cellStartBlockZ: number = 0
	public inCellX: number = 0
	public inCellY: number = 0
	public inCellZ: number = 0

	public interpolationCounter: number = 0
	public arrayInterpolationCounter: number = 0
	public arrayIndex: number = 0

	constructor(
		public readonly cellCountXZ: number,
		public readonly cellCountY: number,
		public readonly cellNoiseMinY: number,
		private readonly router: NoiseRouter,
		public readonly minX: number,
		public readonly minZ: number,
		public readonly settings: NoiseGeneratorSettings,
		fluidPicker: FluidPicker,
	) {
		this.cellWidth = NoiseSettings.cellWidth(settings.noise)
		this.cellHeight = NoiseSettings.cellHeight(settings.noise)
		this.firstCellX = Math.floor(minX / this.cellWidth)
		this.firstCellZ = Math.floor(minZ / this.cellWidth)
		this.firstNoiseX = minX >> 2
		this.firstNoiseZ = minZ >> 2
		this.noiseSizeXZ = (cellCountXZ * this.cellWidth) >> 2

		if (!settings.aquifersEnabled || true) { // WIP: Noise aquifers don't work yet
			this.aquifer = Aquifer.createDisabled(fluidPicker)
		} else {
			const chunkPos = ChunkPos.fromBlockPos(BlockPos.create(minX, 0, minZ))
			const minY = cellNoiseMinY * NoiseSettings.cellHeight(settings.noise)
			const height = cellCountY * NoiseSettings.cellHeight(settings.noise)
			this.aquifer = new NoiseAquifer(this, chunkPos, router.barrier, router.fluidLevelFloodedness, router.fluidLevelSpread, router.lava, router.aquiferPositionalRandomFactory, minY, height, fluidPicker)
		}
		const finalDensity = this.router.finalDensity.mapAll(this.wrap.bind(this))
		this.materialRule = MaterialRule.fromList([
			(context) => this.aquifer.compute(context, finalDensity.compute(context)),
		])
		this.initialDensityWithoutJaggedness = this.router.initialDensityWithoutJaggedness.mapAll(this.wrap.bind(this))
		this.sliceFillingContextProvider = {
			forIndex: (i: number) => {
				this.cellStartBlockY = (i + this.cellNoiseMinY) * this.cellHeight
				this.interpolationCounter += 1
				this.inCellY = 0
				this.arrayIndex = i
				return this
			},
			fillAllDirectly: (arr: number[], fn: DensityFunction) => {
				for (let i = 0; i < this.cellCountY + 1; i += 1) {
					this.cellStartBlockY = (i + this.cellNoiseMinY) * this.cellHeight
					this.interpolationCounter += 1
					this.inCellY = 0
					this.arrayIndex = i
					arr[i + 1] = fn.compute(this)
				}
			},
		}
	}

	public cachedClimateSampler() {
		return new Climate.Sampler(this.router.temperature.mapAll(this.wrap.bind(this)), this.router.vegetation.mapAll(this.wrap.bind(this)), this.router.continents.mapAll(this.wrap.bind(this)), this.router.erosion.mapAll(this.wrap.bind(this)), this.router.depth.mapAll(this.wrap.bind(this)), this.router.ridges.mapAll(this.wrap.bind(this)))
	}

	public getInterpolatedState(): BlockState | undefined {
		return this.materialRule(this)
	}

	public x() {
		return this.cellStartBlockX + this.inCellX
	}

	public y() {
		return this.cellStartBlockY + this.inCellY
	}

	public z() {
		return this.cellStartBlockZ + this.inCellZ
	}

	public getPreliminarySurfaceLevel(x: number, z: number) {
		return computeIfAbsent(this.preliminarySurfaceLevel, ChunkPos.asLong(x, z), () => {
			const level = NoiseRouter.computePreliminarySurfaceLevelScanning(this.settings.noise, this.initialDensityWithoutJaggedness, x << 2, z << 2)
			return level
		})
	}

	private fillSlice(first: boolean, x: number) {
		this.cellStartBlockX = x * this.cellWidth
		this.inCellX = 0
		for (let i = 0; i < this.cellCountXZ + 1; i += 1) {
			const z = this.firstCellZ + i
			this.cellStartBlockZ = z * this.cellWidth
			this.inCellZ = 0
			this.arrayInterpolationCounter += 1
			this.interpolators.forEach(interpolator => {
				const arr = (first ? interpolator.slice0 : interpolator.slice1)[i]
				interpolator.fillArray(arr, this.sliceFillingContextProvider)
			})
		}
		this.arrayInterpolationCounter += 1
	}

	public initializeForFirstCellX() {
		if (this.interpolating) {
			throw new Error('Starting interpolation twice')
		}
		this.interpolating = true
		this.interpolationCounter = 0
		this.fillSlice(true, this.firstCellX)
	}

	public advanceCellX(x: number) {
		this.fillSlice(false, this.firstCellX + x + 1)
		this.cellStartBlockX = (this.firstCellX + x) * this.cellWidth
	}

	public forIndex(i: number) {
		const n = Math.floor(i / this.cellWidth)
		this.inCellX = Math.floor(n / this.cellWidth)
		this.inCellY = this.cellHeight - 1 - Math.floor(n / this.cellWidth)
		this.inCellZ = Math.floor(i / this.cellWidth)
		this.arrayIndex = i
		return this
	}

	public fillAllDirectly(arr: number[], fn: DensityFunction) {
		this.arrayIndex = 0
		for (let y = this.cellHeight - 1; y >= 0; y -= 1) {
			this.inCellY = y
			for (let x = 0; x < this.cellWidth; x += 1) {
				this.inCellX = x
				for (let z = 0; z < this.cellWidth; z += 1) {
					this.inCellZ = z
					arr[this.arrayIndex] = fn.compute(this)
					this.arrayIndex += 1
				}
			}
		}
	}

	public selectCellYZ(y: number, z: number) {
		this.interpolators.forEach(i => i.selectCellYZ(y, z))
		this.fillingCell = true
		this.cellStartBlockY = (y + this.cellNoiseMinY) * this.cellHeight
		this.cellStartBlockZ = (z + this.firstCellZ) * this.cellWidth
		this.arrayInterpolationCounter += 1
		for (const cache of this.cellCaches) {
			cache.fillArray(cache.values, this)
		}
		this.arrayInterpolationCounter += 1
		this.fillingCell = false
	}

	public updateForY(blockY: number, y: number) {
		this.inCellY = blockY - this.cellStartBlockY
		this.interpolators.forEach(i => i.updateForY(y))
	}

	public updateForX(blockX: number, x: number) {
		this.inCellX = blockX - this.cellStartBlockX
		this.interpolators.forEach(i => i.updateForX(x))
	}

	public updateForZ(blockZ: number, z: number) {
		this.inCellZ = blockZ - this.cellStartBlockZ
		this.interpolators.forEach(i => i.updateForZ(z))
	}

	public swapSlices() {
		this.interpolators.forEach(i => i.swapSlices())
	}

	public stopInterpolation() {
		if (!this.interpolating) {
			throw new Error('Stopping interpolation twice')
		}
		this.interpolating = false
	}

	public getAquifer() {
		return this.aquifer
	}

	private wrap(fn: DensityFunction): DensityFunction {
		if (fn instanceof DensityFunction.Marker) {
			switch (fn.type) {
				case 'interpolated': return new NoiseChunk.Interpolator(this, fn)
				case 'flat_cache': return new NoiseChunk.FlatCache(this, fn)
				case 'cache_2d': return new NoiseChunk.Cache2D(this, fn)
				case 'cache_once': return new NoiseChunk.CacheOnce(this, fn)
				case 'cache_all_in_cell': return new NoiseChunk.CacheAllInCell(this, fn)
			}
		}
		if (fn instanceof DensityFunction.HolderHolder) {
			return fn.fn.value()
		}
		return fn
	}
}

export type TerrainInfo = {
	offset: number,
	factor: number,
	jaggedness: number,
}
export namespace TerrainInfo {
	export function create(offset: number, factor: number, jaggedness: number): TerrainInfo {
		return { offset, factor, jaggedness }
	}
}

export type InterpolatableNoise = (chunk: NoiseChunk) => () => number

export type MaterialRule = (context: DensityFunction.Context) => BlockState | undefined

export namespace MaterialRule {
	export function fromList(rules: MaterialRule[]): MaterialRule {
		return (context) => {
			for (const rule of rules) {
				const state = rule(context)
				if (state) return state
			}
			return undefined
		}
	}
}

export namespace NoiseChunk {
	export abstract class Wrapper extends DensityFunction {
		constructor(
			protected readonly chunk: NoiseChunk,
			protected readonly wrapped: DensityFunction,
		) {
			super()
		}
		public mapAll(visitor: DensityFunction.Visitor) {
			return this.wrapped.mapAll(visitor)
		}
		public minValue() {
			return this.wrapped.minValue()
		}
		public maxValue() {
			return this.wrapped.maxValue()
		}
	}

	export class FlatCache extends Wrapper {
		public readonly values: number[][]
		private readonly size: number
		constructor(chunk: NoiseChunk, wrapped: DensityFunction) {
			super(chunk, wrapped)
			this.size = chunk.noiseSizeXZ + 1
			this.values = [...Array(this.size)].map(() => Array(this.size).fill(0))
			for (let x = 0; x <= chunk.noiseSizeXZ; x += 1) {
				const blockX = (chunk.firstNoiseX + x) << 2
				for (let z = 0; z <= chunk.noiseSizeXZ; z += 1) {
					const blockZ = (chunk.firstNoiseZ + z) << 2
					this.values[x][z] = wrapped.compute(DensityFunction.context(blockX, 0, blockZ))
				}
			}
		}
		public compute(context: DensityFunction.Context): number {
			const x = (context.x() >> 2) - this.chunk.firstNoiseX
			const z = (context.z() >> 2) - this.chunk.firstNoiseZ
			if (x >= 0 && z >= 0 && x < this.size && z < this.size) {
				return this.values[x][z]
			}
			return this.wrapped.compute(context)
		}
	}

	export class CacheAllInCell extends Wrapper {
		public readonly values: number[]
		constructor(chunk: NoiseChunk, wrapped: DensityFunction) {
			super(chunk, wrapped)
			this.values = Array(chunk.cellWidth * chunk.cellWidth * chunk.cellHeight)
			chunk.cellCaches.push(this)
		}
		public compute(context: DensityFunction.Context) {
			if (context !== this.chunk) {
				return this.wrapped.compute(context)
			}
			if (!this.chunk.interpolating) {
				throw new Error('Trying to sample interpolator outside the interpolation loop')
			}
			const x = this.chunk.inCellX
			const y = this.chunk.inCellY
			const z = this.chunk.inCellZ
			if (x >= 0 && y >= 0 && z >= 0 && x < this.chunk.cellWidth && y < this.chunk.cellHeight && z < this.chunk.cellWidth) {
				return this.values[((this.chunk.cellHeight - 1 - y) * this.chunk.cellWidth + x) * this.chunk.cellWidth + x]
			}
			return this.wrapped.compute(context)
		}
	}

	export class Cache2D extends Wrapper {
		private lastBlockX: number = 0
		private lastBlockZ: number = 0
		private lastValue: number = 0
		constructor(chunk: NoiseChunk, wrapped: DensityFunction) {
			super(chunk, wrapped)
		}
		public compute(context: DensityFunction.Context) {
			if (this.lastBlockX === context.x() && this.lastBlockZ === context.z()) {
				return this.lastValue
			}
			this.lastBlockX = context.x()
			this.lastBlockZ = context.z()
			this.lastValue = this.wrapped.compute(context)
			return this.lastValue
		}
		public fillArray(arr: number[], context: DensityFunction.ContextProvider) {
			this.wrapped.fillArray(arr, context)
		}
	}

	export class CacheOnce extends Wrapper {
		private lastCounter: number = 0
		private lastArrayCounter: number = 0
		private lastValue: number = 0
		private lastArray: number[] | undefined
		constructor(chunk: NoiseChunk, wrapped: DensityFunction) {
			super(chunk, wrapped)
		}
		public compute(context: DensityFunction.Context) {
			if (context !== this.chunk) {
				return this.wrapped.compute(context)
			}
			if (this.lastArray && this.lastArrayCounter === this.chunk.arrayInterpolationCounter) {
				return this.lastArray[this.chunk.arrayIndex]
			}
			if (this.lastCounter === this.chunk.interpolationCounter) {
				return this.lastValue
			}
			this.lastCounter = this.chunk.interpolationCounter
			this.lastValue = this.wrapped.compute(context)
			return this.lastValue
		}
		public fillArray(arr: number[], context: DensityFunction.ContextProvider) {
			if (this.lastArray && this.lastArrayCounter === this.chunk.arrayInterpolationCounter) {
				this.lastArray = arr.slice()
			}
			this.wrapped.fillArray(arr, context)
			this.lastArray = arr.slice()
			this.lastArrayCounter = this.chunk.arrayInterpolationCounter
		}
	}

	export class Interpolator extends Wrapper {
		public slice0: number[][]
		public slice1: number[][]
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
			chunk: NoiseChunk,
			filler: DensityFunction,
		) {
			super(chunk, filler)
			this.slice0 = Interpolator.allocateSlice(chunk.cellCountY, chunk.cellCountXZ)
			this.slice1 = Interpolator.allocateSlice(chunk.cellCountY, chunk.cellCountXZ)
			chunk.interpolators.push(this)
		}

		private static allocateSlice(cellCountY: number, cellCountZ: number) {
			const slice: number[][] = Array(cellCountZ + 1)
			for (let i = 0; i < cellCountZ + 1; i += 1) {
				slice[i] = Array(cellCountY + 1)
			}
			return slice
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

		public compute(context: DensityFunction.Context) {
			if (context !== this.chunk) {
				return this.wrapped.compute(context)
			}
			if (!this.chunk.interpolating) {
				throw new Error('Trying to sample interpolator outside the interpolation loop')
			}
			if (this.chunk.fillingCell) {
				const x = this.chunk.inCellX / this.chunk.cellWidth
				const y = this.chunk.inCellY / this.chunk.cellHeight
				const z = this.chunk.inCellZ / this.chunk.cellWidth
				return lerp3(x, y, z, this.noise000, this.noise100, this.noise010, this.noise110, this.noise001, this.noise101, this.noise011, this.noise111)
			}
			return this.value
		}

		public fillArray(arr: number[], context: DensityFunction.ContextProvider) {
			if (this.chunk.fillingCell) {
				context.fillAllDirectly(arr, this)
			} else {
				this.wrapped.fillArray(arr, context)
			}
		}

		public swapSlices() {
			[this.slice0, this.slice1] = [this.slice1, this.slice0]
		}
	}
}
