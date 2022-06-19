import { Holder, Identifier } from '../core/index.js'
import type { NoiseParameters, PositionalRandom } from '../math/index.js'
import { BlendedNoise, clamp, LegacyRandom, NormalNoise, XoroshiroRandom } from '../math/index.js'
import { Json } from '../util/index.js'
import { DensityFunction } from './DensityFunction.js'
import { NoiseSettings } from './NoiseSettings.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

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
	const fieldParser = (obj: unknown) => new DensityFunction.HolderHolder(Holder.parser(WorldgenRegistries.DENSITY_FUNCTION, DensityFunction.fromJson)(obj))

	export function fromJson(obj: unknown): SimpleNoiseRouter {
		const root = Json.readObject(obj) ?? {}
		return {
			barrier: fieldParser(root.barrier),
			fluidLevelFloodedness: fieldParser(root.fluid_level_floodedness),
			fluidLevelSpread: fieldParser(root.fluid_level_spread),
			lava: fieldParser(root.lava),
			temperature: fieldParser(root.temperature),
			vegetation: fieldParser(root.vegetation),
			continents: fieldParser(root.continents),
			erosion: fieldParser(root.erosion),
			depth: fieldParser(root.depth),
			ridges: fieldParser(root.ridges),
			initialDensityWithoutJaggedness: fieldParser(root.initial_density_without_jaggedness),
			finalDensity: fieldParser(root.final_density),
			veinToggle: fieldParser(root.vein_toggle),
			veinRidged: fieldParser(root.vein_ridged),
			veinGap: fieldParser(root.vein_gap),
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
		const visitor = new Visitor(random, settings, seed)
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
			private readonly legacySeed?: bigint,
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
				const noise = instantiate(this.random, fn.noiseData)
				return new DensityFunction.ShiftedNoise(fn.shiftX, fn.shiftY, fn.shiftZ, fn.xzScale, fn.yScale, fn.noiseData, noise)
			}
			if (fn instanceof DensityFunction.Noise) {
				return new DensityFunction.Noise(fn.xzScale, fn.yScale, fn.noiseData, instantiate(this.random, fn.noiseData))
			}
			if (fn instanceof DensityFunction.ShiftNoise) {
				return fn.withNewNoise(instantiate(this.random, fn.noiseData))
			}
			if (fn instanceof DensityFunction.WeirdScaledSampler) {
				return new DensityFunction.WeirdScaledSampler(fn.input, fn.rarityValueMapper, fn.noiseData, instantiate(this.random, fn.noiseData))
			}
			if (fn instanceof DensityFunction.OldBlendedNoise) {
				return new DensityFunction.OldBlendedNoise(fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier, new BlendedNoise( this.random.fromHashOf(Identifier.create('terrain').toString()), fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier))
			}
			if (fn instanceof DensityFunction.EndIslands) {
				return new DensityFunction.EndIslands(this.legacySeed)
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
			const density = clamp(initialDensity.compute(DensityFunction.context(x, y, z)), -64, 64)
			if (density >= 0.390625) {
				return y
			}
		}
		return Number.MAX_SAFE_INTEGER
	}

	const noiseCache = new Map<string, [bigint | number, bigint | number, NormalNoise]>()

	export function instantiate(random: PositionalRandom, noise: Holder<NoiseParameters>): NormalNoise {
		const key = noise.key()?.toString()
		if (!key) {
			throw new Error('Cannot instantiate noise from direct holder')
		}

		const randomKey = random.seedKey()
		const cached = noiseCache.get(key)
		if (cached && cached[0] === randomKey[0] && cached[1] === randomKey[1]) {
			return cached[2]
		}
		const result = new NormalNoise(random.fromHashOf(key), noise.value())
		noiseCache.set(key, [randomKey[0], randomKey[1], result])
		return result
	}
}
