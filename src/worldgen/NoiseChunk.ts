import type { BlockState } from '../core/index.js'
import { BlockPos, ChunkPos } from '../core/index.js'
import { computeIfAbsent } from '../util/index.js'
import type { FluidPicker } from './Aquifer.js'
import { Aquifer, NoiseAquifer } from './Aquifer.js'
import { DensityFunction } from './DensityFunction.js'
import { NoiseSettings } from './NoiseSettings.js'
import type { RandomState } from './RandomState.js'

export class NoiseChunk {
	public readonly cellWidth: number
	public readonly cellHeight: number
	public readonly firstCellX: number
	public readonly firstCellZ: number
	public readonly firstNoiseX: number
	public readonly firstNoiseZ: number
	public readonly noiseSizeXZ: number
	private readonly preliminarySurfaceLevelCache: Map<bigint, number> = new Map()
	private readonly aquifer: Aquifer
	private readonly materialRule: MaterialRule
	private readonly preliminarySurfaceLevel: DensityFunction

	constructor(
		public readonly cellCountXZ: number,
		public readonly cellCountY: number,
		public readonly cellNoiseMinY: number,
		randomState: RandomState,
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
			this.aquifer = new NoiseAquifer(this, chunkPos, randomState.router, randomState.aquiferRandom, minY, height, fluidPicker)
		}
		const finalDensity = randomState.router.finalDensity
		this.materialRule = MaterialRule.fromList([
			(context) => this.aquifer.compute(context, finalDensity.compute(context)),
		])
		this.preliminarySurfaceLevel = randomState.router.preliminarySurfaceLevel
	}

	public getFinalState(x: number, y: number, z: number): BlockState | undefined {
		return this.materialRule({ x, y, z })
	}

	public getPreliminarySurfaceLevel(quartX: number, quartZ: number) {
		return computeIfAbsent(this.preliminarySurfaceLevelCache, ChunkPos.asLong(quartX, quartZ), () => {
			const x = quartX << 2
			const z = quartZ << 2

			return Math.floor(this.preliminarySurfaceLevel.compute(DensityFunction.context(x, 0, z)))
		})
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
