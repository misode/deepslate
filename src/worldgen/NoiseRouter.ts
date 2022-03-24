import { Holder, Identifier } from '../core'
import type { PositionalRandom } from '../math'
import { BlendedNoise, clamp, LegacyRandom, XoroshiroRandom } from '../math'
import { Json } from '../util'
import { DensityFunction } from './DensityFunction'
import { Noises } from './Noises'
import { NoiseSettings } from './NoiseSettings'
import { WorldgenRegistries } from './WorldgenRegistries'

export interface SimpleNoiseRouter {
	barrier: DensityFunction,
	fluidLevelFloodedness: DensityFunction,
	fluidLevelSpread: DensityFunction,
	lava: DensityFunction,
	temperature: DensityFunction,
	vegetation: DensityFunction,
	continents: DensityFunction,
	erosion: DensityFunction,
	depth: DensityFunction,
	ridges: DensityFunction,
	initialDensityWithoutJaggedness: DensityFunction,
	finalDensity: DensityFunction,
	veinToggle: DensityFunction,
	veinRidged: DensityFunction,
	veinGap: DensityFunction,
}

export interface NoiseRouter extends SimpleNoiseRouter {
	aquiferPositionalRandomFactory: PositionalRandom,
	oreVeinsPositionalRandomFactory: PositionalRandom,
}

export namespace NoiseRouter {
	const parser = (obj: unknown) => Holder.parser(WorldgenRegistries.DENSITY_FUNCTION, DensityFunction.fromJson)(obj).value()

	export function fromJson(obj: unknown): SimpleNoiseRouter {
		const root = Json.readObject(obj) ?? {}
		return {
			barrier: parser(root.barrier),
			fluidLevelFloodedness: parser(root.fluid_level_floodedness),
			fluidLevelSpread: parser(root.fluid_level_spread),
			lava: parser(root.lava),
			temperature: parser(root.temperature),
			vegetation: parser(root.vegetation),
			continents: parser(root.continents),
			erosion: parser(root.erosion),
			depth: parser(root.depth),
			ridges: parser(root.ridges),
			initialDensityWithoutJaggedness: parser(root.initial_density_without_jaggedness),
			finalDensity: parser(root.final_density),
			veinToggle: parser(root.vein_toggle),
			veinRidged: parser(root.vein_ridged),
			veinGap: parser(root.vein_gap),
		}
	}

	export function create(router: Partial<SimpleNoiseRouter>): SimpleNoiseRouter {
		return {
			barrier: DensityFunction.Constant.ZERO,
			fluidLevelFloodedness: DensityFunction.Constant.ZERO,
			fluidLevelSpread: DensityFunction.Constant.ZERO,
			lava: DensityFunction.Constant.ZERO,
			temperature: DensityFunction.Constant.ZERO,
			vegetation: DensityFunction.Constant.ZERO,
			continents: DensityFunction.Constant.ZERO,
			erosion: DensityFunction.Constant.ZERO,
			depth: DensityFunction.Constant.ZERO,
			ridges: DensityFunction.Constant.ZERO,
			initialDensityWithoutJaggedness: DensityFunction.Constant.ZERO,
			finalDensity: DensityFunction.Constant.ZERO,
			veinToggle: DensityFunction.Constant.ZERO,
			veinRidged: DensityFunction.Constant.ZERO,
			veinGap: DensityFunction.Constant.ZERO,
			...router,
		}
	}

	export function withSettings(simple: SimpleNoiseRouter, settings: NoiseSettings, seed: bigint, legacyRandomSource: boolean = false): NoiseRouter {
		const random = (legacyRandomSource ? new LegacyRandom(seed) : XoroshiroRandom.create(seed)).forkPositional()
		const visitor = new Visitor(random, settings)
		return {
			...visitor.mapAll(simple),
			aquiferPositionalRandomFactory: random.fromHashOf(Identifier.create('aquifer').toString()).forkPositional(),
			oreVeinsPositionalRandomFactory: random.fromHashOf(Identifier.create('ore').toString()).forkPositional(),
		}
	}

	export class Visitor implements DensityFunction.Visitor {
		private readonly mapped: Map<string, DensityFunction> = new Map()

		constructor(
			private readonly random: PositionalRandom,
			private readonly settings: NoiseSettings,
		) {}

		public map(fn: DensityFunction): DensityFunction {
			if (fn instanceof DensityFunction.HolderHolder) {
				const key = fn.holder.key()
				if (key !== undefined && this.mapped.has(key.toString())) {
					return this.mapped.get(key.toString())!
				} else {
					const value = fn.holder.value().mapAll(this)
					if (key !== undefined) {
						this.mapped.set(key.toString(), value)
					}
					return value
				}
			}
			if (fn instanceof DensityFunction.Interpolated) {
				return fn.withCellSize(NoiseSettings.cellWidth(this.settings), NoiseSettings.cellHeight(this.settings))
			}
			if (fn instanceof DensityFunction.ShiftedNoise) {
				const noise = Noises.instantiate(this.random, fn.noiseData)
				return new DensityFunction.ShiftedNoise(fn.shiftX, fn.shiftY, fn.shiftZ, fn.xzScale, fn.yScale, fn.noiseData, noise)
			}
			if (fn instanceof DensityFunction.Noise) {
				return new DensityFunction.Noise(fn.xzScale, fn.yScale, fn.noiseData, Noises.instantiate(this.random, fn.noiseData))
			}
			if (fn instanceof DensityFunction.ShiftNoise) {
				return fn.withNewNoise(Noises.instantiate(this.random, fn.noiseData))
			}
			if (fn instanceof DensityFunction.WeirdScaledSampler) {
				return new DensityFunction.WeirdScaledSampler(fn.input, fn.rarityValueMapper, fn.noiseData, Noises.instantiate(this.random, fn.noiseData))
			}
			if (fn instanceof DensityFunction.OldBlendedNoise) {
				return new DensityFunction.OldBlendedNoise(fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier, new BlendedNoise( this.random.fromHashOf(Identifier.create('terrain').toString()), fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier))
			}
			if (fn instanceof DensityFunction.Mapped) {
				return fn.withMinMax()
			}
			if (fn instanceof DensityFunction.Ap2) {
				return fn.withMinMax()
			}
			return fn
		}

		public mapAll(router: SimpleNoiseRouter): SimpleNoiseRouter {
			return {
				barrier: router.barrier.mapAll(this),
				fluidLevelFloodedness: router.fluidLevelFloodedness.mapAll(this),
				fluidLevelSpread: router.fluidLevelSpread.mapAll(this),
				lava: router.lava.mapAll(this),
				temperature: router.temperature.mapAll(this),
				vegetation: router.vegetation.mapAll(this),
				continents: router.continents.mapAll(this),
				erosion: router.erosion.mapAll(this),
				depth: router.depth.mapAll(this),
				ridges: router.ridges.mapAll(this),
				initialDensityWithoutJaggedness: router.initialDensityWithoutJaggedness.mapAll(this),
				finalDensity: router.finalDensity.mapAll(this),
				veinToggle: router.veinToggle.mapAll(this),
				veinRidged: router.veinRidged.mapAll(this),
				veinGap: router.veinGap.mapAll(this),
			}
		}
	}

	export function computePreliminarySurfaceLevelScanning(settings: NoiseSettings, initialDensity: DensityFunction, x: number, z: number) {
		const maxCellY = NoiseSettings.minCellY(settings) + NoiseSettings.cellCountY(settings)
		const minCellY = NoiseSettings.minCellY(settings)
		const cellHeight = NoiseSettings.cellHeight(settings)
		for (let yCell = maxCellY; yCell >= minCellY; yCell -= 1) {
			const y = yCell * cellHeight
			const clamped = clamp(initialDensity.compute(DensityFunction.context(x, y, z)), -64, 64)
			const density = NoiseSettings.applySlides(settings, clamped, y)
			if (density >= 0.390625) {
				return y
			}
		}
		return Number.MAX_SAFE_INTEGER
	}
}
