import type { Holder } from '../core/index.js'
import { Registry } from '../core/index.js'
import type { NormalNoise } from '../index.js'
import { BlendedNoise, computeIfAbsent, DensityFunction, Identifier, LegacyRandom, XoroshiroRandom } from '../index.js'
import type { Noise, PositionalRandom, Random } from '../math/index.js'
import { Climate } from './biome/index.js'
import { MaterialSystem } from './MaterialSystem.js'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'
import { NoiseRouter } from './NoiseRouter.js'

export class RandomState {
	private readonly noiseInstances: Map<string, Noise>
	private readonly positionalRandoms: Map<string, PositionalRandom>

	public readonly random: PositionalRandom
	public readonly surfaceSystem: MaterialSystem
	public readonly router: NoiseRouter
	public readonly sampler: Climate.Sampler

	constructor(
		settings: NoiseGeneratorSettings,
		public readonly seed: bigint,
	) {
		this.noiseInstances = new Map()
		this.positionalRandoms = new Map()

		this.random = (settings.legacyRandomSource ? new LegacyRandom(seed) : XoroshiroRandom.create(seed)).forkPositional()
		this.router = NoiseRouter.mapAll(settings.noiseRouter, this.createVisitor(settings.legacyRandomSource))
		const preliminarySurface = this.router.chunkSurfaceLevel
		this.surfaceSystem = new MaterialSystem(this, settings.defaultBlock, settings.seaLevel, preliminarySurface, this.random)
		this.sampler = Climate.Sampler.fromRouter(this.router)
	}

	public createVisitor(legacyRandom: boolean) {
		const mapped = new Map<string, DensityFunction>()
		const getNoiseSampler = (noise: Holder<NormalNoise>): Noise => {
			const key = noise.key()
			if (key === undefined) {
				throw new Error('Cannot create noise without key')
			}
			if (legacyRandom) {
				if (key.equals(Identifier.create('temperature'))) {
					return noise.value().createForLegacyNetherBiome(new LegacyRandom(this.seed + BigInt(0)))
				}
				if (key.equals(Identifier.create('vegetation'))) {
					return noise.value().createForLegacyNetherBiome(new LegacyRandom(this.seed + BigInt(1)))
				}
			}
			return this.getOrCreateNoise(key)
		}
		const visitor = {
			apply: (fn: DensityFunction): DensityFunction => {
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
				if (fn instanceof DensityFunction.NoiseFunction) {
					return new DensityFunction.NoiseFunction(fn.noise, fn.xzScale, fn.yScale, fn.shiftX, fn.shiftY, fn.shiftZ, getNoiseSampler(fn.noise))
				}
				if (fn instanceof DensityFunction.ShiftNoise) {
					return fn.withNewNoise(getNoiseSampler(fn.noise))
				}
				if (fn instanceof DensityFunction.OldBlendedNoise) {
					const oldBlendedNoiseRandom: Random = legacyRandom ? new LegacyRandom(this.seed + BigInt(0)) : this.random.fromHashOf(Identifier.create('terrain').toString())
					return new DensityFunction.OldBlendedNoise(fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier, new BlendedNoise(oldBlendedNoiseRandom, fn.xzScale, fn.yScale, fn.xzFactor, fn.yFactor, fn.smearScaleMultiplier))
				}
				if (fn instanceof DensityFunction.EndOuterIslands) {
					return new DensityFunction.EndOuterIslands(this.seed)
				}
				if (fn instanceof DensityFunction.Binary) {
					return fn.trySimplify()
				}
				return fn
			},
		}
		return visitor
	}

	public getOrCreateNoise(id: Identifier): Noise {
		const noises = Registry.REGISTRY.getOrThrow(Identifier.create('worldgen/noise')) as Registry<NormalNoise>
		return computeIfAbsent(this.noiseInstances, id.toString(), key =>
			noises.getOrThrow(id).create(this.random.fromHashOf(key))
		)
	}

	public getOrCreateRandom(id: Identifier) {
		return computeIfAbsent(this.positionalRandoms, id.toString(), key =>
			this.random.fromHashOf(key).forkPositional()
		)
	}
}
