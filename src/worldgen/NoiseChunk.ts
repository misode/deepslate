import type { BlockState } from '../core'
import { BlockPos, ChunkPos } from '../core'
import { computeIfAbsent } from '../util'
import type { FluidPicker } from './Aquifer'
import { Aquifer, NoiseAquifer } from './Aquifer'
import { Climate } from './biome'
import type { DensityFunction } from './DensityFunction'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings'
import { NoiseRouter } from './NoiseRouter'
import { NoiseSettings } from './NoiseSettings'

export class NoiseChunk implements DensityFunction.Context {
	public readonly cellWidth: number
	public readonly cellHeight: number
	public readonly firstCellX: number
	public readonly firstCellZ: number
	public readonly firstNoiseX: number
	public readonly firstNoiseZ: number
	public readonly noiseSizeXZ: number
	private readonly preliminarySurfaceLevel: Map<bigint, number> = new Map()
	private readonly aquifer: Aquifer
	private readonly materialRule: MaterialRule
	private readonly initialDensityWithoutJaggedness: DensityFunction
	private readonly sliceFillingContextProvider: DensityFunction.ContextProvider

	private cellStartBlockX: number = 0
	private cellStartBlockY: number = 0
	private cellStartBlockZ: number = 0
	public inCellX: number = 0
	public inCellY: number = 0
	public inCellZ: number = 0

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
		const finalDensity = this.router.finalDensity
		this.materialRule = MaterialRule.fromList([
			(context) => this.aquifer.compute(context, finalDensity.compute(context)),
		])
		this.initialDensityWithoutJaggedness = this.router.initialDensityWithoutJaggedness
		this.sliceFillingContextProvider = {
			forIndex: (i: number) => {
				this.cellStartBlockY = (i + this.cellNoiseMinY) * this.cellHeight
				this.inCellY = 0
				return this
			},
			fillAllDirectly: (arr: number[], fn: DensityFunction) => {
				for (let i = 0; i < this.cellCountY + 1; i += 1) {
					this.cellStartBlockY = (i + this.cellNoiseMinY) * this.cellHeight
					this.inCellY = 0
					arr[i + 1] = fn.compute(this)
				}
			},
		}
	}

	public cachedClimateSampler() {
		return new Climate.Sampler(this.router.temperature, this.router.vegetation, this.router.continents, this.router.erosion, this.router.depth, this.router.ridges)
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

	public advanceCellX(x: number) {
		this.cellStartBlockX = (this.firstCellX + x) * this.cellWidth
	}

	public selectCellYZ(y: number, z: number) {
		this.cellStartBlockY = (y + this.cellNoiseMinY) * this.cellHeight
		this.cellStartBlockZ = (z + this.firstCellZ) * this.cellWidth
	}

	public updateForY(blockY: number, y: number) {
		this.inCellY = blockY - this.cellStartBlockY
	}

	public updateForX(blockX: number, x: number) {
		this.inCellX = blockX - this.cellStartBlockX
	}

	public updateForZ(blockZ: number, z: number) {
		this.inCellZ = blockZ - this.cellStartBlockZ
	}

	public getAquifer() {
		return this.aquifer
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
