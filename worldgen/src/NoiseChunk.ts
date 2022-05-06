import type { BlockState } from '@core'
import { BlockPos, ChunkPos } from '@core'
import { computeIfAbsent } from '@util'
import type { FluidPicker } from './Aquifer'
import { Aquifer, NoiseAquifer } from './Aquifer'
import type { DensityFunction } from './DensityFunction'
import { NoiseRouter } from './NoiseRouter'
import { NoiseSettings } from './NoiseSettings'

export class NoiseChunk {
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

	constructor(
		public readonly cellCountXZ: number,
		public readonly cellCountY: number,
		public readonly cellNoiseMinY: number,
		private readonly router: NoiseRouter,
		public readonly minX: number,
		public readonly minZ: number,
		public readonly settings: NoiseSettings,
		aquifersEnabled: boolean,
		fluidPicker: FluidPicker,
	) {
		this.cellWidth = NoiseSettings.cellWidth(settings)
		this.cellHeight = NoiseSettings.cellHeight(settings)
		this.firstCellX = Math.floor(minX / this.cellWidth)
		this.firstCellZ = Math.floor(minZ / this.cellWidth)
		this.firstNoiseX = minX >> 2
		this.firstNoiseZ = minZ >> 2
		this.noiseSizeXZ = (cellCountXZ * this.cellWidth) >> 2

		if (!aquifersEnabled || true) { // WIP: Noise aquifers don't work yet
			this.aquifer = Aquifer.createDisabled(fluidPicker)
		} else {
			const chunkPos = ChunkPos.fromBlockPos(BlockPos.create(minX, 0, minZ))
			const minY = cellNoiseMinY * NoiseSettings.cellHeight(settings)
			const height = cellCountY * NoiseSettings.cellHeight(settings)
			this.aquifer = new NoiseAquifer(this, chunkPos, router.barrier, router.fluidLevelFloodedness, router.fluidLevelSpread, router.lava, router.aquiferPositionalRandomFactory, minY, height, fluidPicker)
		}
		const finalDensity = this.router.finalDensity
		this.materialRule = MaterialRule.fromList([
			(context) => this.aquifer.compute(context, finalDensity.compute(context)),
		])
		this.initialDensityWithoutJaggedness = this.router.initialDensityWithoutJaggedness
	}

	public getFinalState(x: number, y: number, z: number): BlockState | undefined {
		return this.materialRule({ x, y, z })
	}

	public getPreliminarySurfaceLevel(x: number, z: number) {
		return computeIfAbsent(this.preliminarySurfaceLevel, ChunkPos.asLong(x, z), () => {
			const level = NoiseRouter.computePreliminarySurfaceLevelScanning(this.settings, this.initialDensityWithoutJaggedness, x << 2, z << 2)
			return level
		})
	}

	public getAquifer() {
		return this.aquifer
	}
}

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
