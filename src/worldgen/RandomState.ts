import type { Holder } from '../core/index.js'
import { BlendedNoise, computeIfAbsent, DensityFunction, Identifier, LegacyRandom, NoiseParameters, NoiseSettings, NormalNoise, WorldgenRegistries, XoroshiroRandom } from '../index.js'
import type { PositionalRandom } from '../math/index.js'
import { Climate } from './biome/index.js'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'
import { NoiseRouter } from './NoiseRouter.js'
import { SurfaceSystem } from './SurfaceSystem.js'

export class RandomState {
	private readonly noiseCache: Map<string, NormalNoise>
	private readonly randomCache: Map<string, PositionalRandom>

	public readonly random: PositionalRandom
	public readonly aquiferRandom: PositionalRandom
	public readonly oreRandom: PositionalRandom
	public readonly surfaceSystem: SurfaceSystem
	public readonly router: NoiseRouter
	public readonly sampler: Climate.Sampler

	constructor (
		settings: NoiseGeneratorSettings,
		public readonly seed: bigint,
	) {
		this.noiseCache = new Map()
		this.randomCache = new Map()

		this.random = (settings.legacyRandomSource ? new LegacyRandom(seed) : XoroshiroRandom.create(seed)).forkPositional()
		this.aquiferRandom = this.random.fromHashOf(Identifier.create('aquifer').toString()).forkPositional()
		this.oreRandom = this.random.fromHashOf(Identifier.create('ore').toString()).forkPositional()
		this.surfaceSystem = new SurfaceSystem(settings.surfaceRule, settings.defaultBlock, seed)
		this.router = NoiseRouter.mapAll(settings.noiseRouter, this.createVisitor(settings.noise, settings.legacyRandomSource))
		this.sampler = Climate.Sampler.fromRouter(this.router)
	}

	public createVisitor(noiseSettings: NoiseSettings, legacyRandom: boolean) {
		const mapped = new Map<string, DensityFunction>()
		const getNoise = (noise: Holder<NoiseParameters>): NormalNoise => {
			const key = noise.key()
			if (key === undefined) {
				throw new Error('Cannot create noise without key')
			}
			if (legacyRandom) {
				if (key.equals(Identifier.create('temperature'))) {
					return new NormalNoise(new LegacyRandom(this.seed + BigInt(0)), NoiseParameters.create(-7, [1, 1]))
				}
				if (key.equals(Identifier.create('vegetation'))) {
					return new NormalNoise(new LegacyRandom(this.seed + BigInt(1)), NoiseParameters.create(-7, [1, 1]))
				}
				if (key.equals(Identifier.create('offset'))) {
					return new NormalNoise(this.random.fromHashOf('offset'), NoiseParameters.create(0, [0]))
				}
			}
			return this.getOrCreateNoise(key)
		}
		const visitor = {
			map: (fn: DensityFunction): DensityFunction => {
				if (fn instanceof DensityFunction.HolderHolder) {
					const key = fn.holder.key()
					if (key !== undefined && mapped.has(key.toString())) {
						return mapped.get(key.toString())!
					} else {
						const value = fn.holder.value().mapAll(visitor)
						if (key !== undefined) {
							mapped.set(key.toString(), value)
						}
						return value
					}
				}
				if (fn instanceof DensityFunction.Interpolated) {
					return fn.withCellSize(NoiseSettings.cellWidth(noiseSettings), NoiseSettings.cellHeight(noiseSettings))
				}
				if (fn instanceof DensityFunction.ShiftedNoise) {
					return new DensityFunction.ShiftedNoise(fn.shiftX, fn.shiftY, fn.shiftZ, fn.xzScale, fn.yScale, fn.noiseData, getNoise(fn.noiseData))
				}
				if (fn instanceof DensityFunction.Noise) {
					return new DensityFunction.Noise(fn.xzScale, fn.yScale, fn.noiseData, getNoise(fn.noiseData))
				}
				if (fn instanceof DensityFunction.ShiftNoise) {
					return fn.withNewNoise(getNoise(fn.noiseData))
				}
				if (fn instanceof DensityFunction.WeirdScaledSampler) {
					return new DensityFunction.WeirdScaledSampler(fn.input, fn.rarityValueMapper, fn.noiseData, getNoise(fn.noiseData))
				}
				if (fn instanceof DensityFunction.OldBlendedNoise) {
					return new DensityFunction.OldBlendedNoise(fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier, new BlendedNoise( this.random.fromHashOf(Identifier.create('terrain').toString()), fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier))
				}
				if (fn instanceof DensityFunction.EndIslands) {
					return new DensityFunction.EndIslands(this.seed)
				}
				if (fn instanceof DensityFunction.Mapped) {
					return fn.withMinMax()
				}
				if (fn instanceof DensityFunction.Ap2) {
					return fn.withMinMax()
				}
				return fn
			},
		}
		return visitor
	}

	public getOrCreateNoise(id: Identifier) {
		return computeIfAbsent(this.noiseCache, id.toString(), key =>
			new NormalNoise(this.random.fromHashOf(key), WorldgenRegistries.NOISE.getOrThrow(id))
		)
	}

	public getOrCreateRandom(id: Identifier) {
		return computeIfAbsent(this.randomCache, id.toString(), key =>
			this.random.fromHashOf(key).forkPositional()
		)
	}
}
