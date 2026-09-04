
import type { Chunk } from '../core/index.js'
import { BlockPos, BlockState, ChunkPos, Holder, HolderSet, Identifier } from '../core/index.js'
import type { Noise, PositionalRandom } from '../math/index.js'
import { map } from '../math/index.js'
import { computeIfAbsent, Json } from '../util/index.js'
import { DensityFunction } from './DensityFunction.js'
import type { NoiseChunk } from './NoiseChunk.js'
import type { RandomState } from './RandomState.js'
import type { WorldgenContext } from './VerticalAnchor.js'
import { VerticalAnchor } from './VerticalAnchor.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

export class MaterialSystem {
	private readonly surfaceNoise: Noise
	private readonly surfaceSecondaryNoise: Noise

	constructor(
		private readonly randomState: RandomState,
		private readonly defaultBlock: BlockState,
		private readonly seaLevel: number,
		private readonly preliminarySurface: DensityFunction,
		private readonly random: PositionalRandom,
	) {
		this.surfaceNoise = randomState.getOrCreateNoise(Identifier.create('surface'))
		this.surfaceSecondaryNoise = randomState.getOrCreateNoise(Identifier.create('surface_secondary'))
	}

	public buildSurface(chunk: Chunk, noiseChunk: NoiseChunk, sourceRule: MaterialRule, worldgenContext: WorldgenContext, biomeGetter: (pos: BlockPos) => Identifier) {
		const minX = ChunkPos.minBlockX(chunk.pos)
		const minZ = ChunkPos.minBlockZ(chunk.pos)
		const context = new MaterialRuleContext(this, this.randomState, chunk, noiseChunk, worldgenContext, biomeGetter)
		const ruleWithContext = sourceRule.compile(context)

		for (let x = 0; x < 16; x += 1) {
			const blockX = minX + x
			for (let z = 0; z < 1; z += 1) {
				const blockZ = minZ + z
				context.updateXZ(blockX, blockZ)
				let stoneAboveDepth = 0
				let waterHeight = Number.MIN_SAFE_INTEGER
				let nextCeilingStoneY = Number.MAX_SAFE_INTEGER

				for (let y = chunk.maxY; y >= chunk.minY; y -= 1) {
					const blockPos = BlockPos.create(blockX, y, blockZ)
					const old = chunk.getBlockState(blockPos)
					if (old.equals(BlockState.AIR)) {
						stoneAboveDepth = 0
						waterHeight = Number.MIN_SAFE_INTEGER
						continue
					}
					if (old.isFluid()) {
						if (waterHeight === Number.MIN_SAFE_INTEGER) {
							waterHeight = y + 1
						}
						continue
					}
					if (nextCeilingStoneY >= y) {
						nextCeilingStoneY = Number.MIN_SAFE_INTEGER
						for (let lookaheadY = y - 1; lookaheadY >= chunk.minY; lookaheadY -= 1) {
							const nextState = chunk.getBlockState(BlockPos.create(blockX, lookaheadY, blockZ))
							if (nextState.equals(BlockState.AIR) || nextState.isFluid()) {
								nextCeilingStoneY = lookaheadY + 1
								break
							}
						}
					}
					stoneAboveDepth += 1
					const stoneBelowDepth = y - nextCeilingStoneY + 1
					context.updateY(stoneAboveDepth, stoneBelowDepth, waterHeight, y)
					const state = ruleWithContext(blockX, y, blockZ)
					if (state) {
						chunk.setBlockState(blockPos, state)
					}
				}
			}
		}
	}

	public getSurfaceDepth(x: number, z: number) {
		const noise = this.surfaceNoise.get3D(x, 0, z)
		const offset = this.random.at(x, 0, z).nextDouble() * 0.25
		return noise * 2.75 + 3 + offset
	}

	public getSurfaceSecondary(x: number, z: number) {
		return this.surfaceSecondaryNoise.get3D(x, 0, z)
	}

	public getOrCreateRandom(name: Identifier): PositionalRandom {
		return this.randomState.getOrCreateRandom(name)
	}
}

export class MaterialRuleContext {
	public blockX: number = 0
	public blockY: number = 0
	public blockZ: number = 0
	public stoneDepthAbove: number = 0
	public stoneDepthBelow: number = 0
	public surfaceDepth: number = 0
	public waterHeight: number = 0

	public lastUpdateXZ: number = Number.MIN_SAFE_INTEGER
	public lastUpdateY: number = Number.MIN_SAFE_INTEGER
	private lastSurfaceDepth2Update: number = Number.MIN_SAFE_INTEGER
	private surfaceSecondary: number = 0
	private lastMinSurfaceLevelUpdate: number = Number.MIN_SAFE_INTEGER
	private minSurfaceLevel: number = 0
	private biome: Identifier | undefined
	private readonly noiseSamplers2d = new Map<string, () => number>()
	private readonly noiseSamplers3d = new Map<string, () => number>()

	constructor(
		public readonly system: MaterialSystem,
		public readonly randomState: RandomState,
		public readonly chunk: Chunk,
		public readonly noiseChunk: NoiseChunk,
		public readonly context: WorldgenContext,
		private readonly biomeGetter: (pos: BlockPos) => Identifier,
	) {}

	public updateXZ(x: number, z: number) {
		this.lastUpdateXZ += 1
		this.lastUpdateY += 1
		this.blockX = x
		this.blockZ = z
		this.surfaceDepth = this.system.getSurfaceDepth(x, z)
	}

	public updateY(stoneDepthAbove: number, stoneDepthBelow: number, waterHeight: number, y: number) {
		this.lastUpdateY += 1
		this.biome = undefined
		this.blockY = y
		this.stoneDepthAbove = stoneDepthAbove
		this.stoneDepthBelow = stoneDepthBelow
		this.waterHeight = waterHeight
	}

	public getSurfaceSecondary() {
		if (this.lastSurfaceDepth2Update !== this.lastUpdateXZ) {
			this.lastSurfaceDepth2Update = this.lastUpdateXZ
			this.surfaceSecondary = this.system.getSurfaceSecondary(this.blockX, this.blockZ)
		}
		return this.surfaceSecondary
	}

	public getMinSurfaceLevel() {
		if (this.lastMinSurfaceLevelUpdate !== this.lastUpdateXZ) {
			this.lastMinSurfaceLevelUpdate = this.lastUpdateXZ
			const preliminarySurfaceLevel = this.noiseChunk.randomState.router.chunkSurfaceLevel.compute(DensityFunction.context(this.blockX, 0, this.blockZ))
			this.minSurfaceLevel = Math.floor(preliminarySurfaceLevel) + this.surfaceDepth - 8
		}
		return this.minSurfaceLevel
	}

	public getBiome() {
		if (this.biome === undefined) {
			this.biome = this.biomeGetter(BlockPos.create(this.blockX, this.blockY, this.blockZ))
		}
		return this.biome
	}

	public resolveAnchorY(anchor: VerticalAnchor) {
		return anchor(this.context)
	}

	public getNoiseSampler(noiseId: Identifier, is3d: boolean) {
		if (is3d) {
			return computeIfAbsent(this.noiseSamplers2d, noiseId.toString(), () => this.createNoiseSampler2d(noiseId))
		} else {
			return computeIfAbsent(this.noiseSamplers3d, noiseId.toString(), () => this.createNoiseSampler3d(noiseId))
		}
	}

	private createNoiseSampler2d(noiseId: Identifier): () => number {
		const noise = this.randomState.getOrCreateNoise(noiseId)
		let lastUpdateXZ = this.lastUpdateXZ - 1
		let lastValue = 0
		return () => {
			if (lastUpdateXZ !== this.lastUpdateXZ) {
				lastValue = noise.get3D(this.blockX, 0, this.blockZ)
				lastUpdateXZ = this.lastUpdateXZ
			}
			return lastValue
		}
	}

	private createNoiseSampler3d(noiseId: Identifier): () => number {
		const noise = this.randomState.getOrCreateNoise(noiseId)
		let lastUpdateY = this.lastUpdateY - 1
		let lastValue = 0
		return () => {
			if (lastUpdateY !== this.lastUpdateY) {
				lastValue = noise.get3D(this.blockX, this.blockY, this.blockZ)
				lastUpdateY = this.lastUpdateY
			}
			return lastValue
		}
	}
}

export type RuleEvaluator = (x: number, y: number, z: number) => BlockState | undefined

export abstract class MaterialRule {
	abstract compile(context: MaterialRuleContext): RuleEvaluator
}

export namespace MaterialRule {
	export const NOOP: MaterialRule = {compile: () => () => undefined}

	export function fromJson(obj: unknown): MaterialRule {
		if (typeof obj === 'string') {
			return new HolderHolder(Holder.reference(WorldgenRegistries.MATERIAL_RULE, Identifier.parse(obj)))
		}
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'block': return new Block(BlockState.fromJson(root.result_state))
			case 'sequence': return new Sequence(Json.readArray(root.sequence, MaterialRule.fromJson) ?? [])
			case 'condition': return new Condition(MaterialCondition.fromJson(root.if_true), MaterialRule.fromJson(root.then_run))
			default: return NOOP
		}
	}

	export class HolderHolder extends MaterialRule {
		constructor(
			private readonly holder: Holder<MaterialRule>,
		) {
			super()
		}
		compile(context: MaterialRuleContext): RuleEvaluator {
			return this.holder.value().compile(context)
		}
	}

	export class Block extends MaterialRule {
		constructor(
			private readonly resultState: BlockState,
		) {
			super()
		}
		compile(context: MaterialRuleContext): RuleEvaluator {
			return () => this.resultState
		}
	}

	export class Sequence extends MaterialRule {
		constructor(
			private readonly sequence: MaterialRule[],
		) {
			super()
		}
		compile(context: MaterialRuleContext): RuleEvaluator {
			if (this.sequence.length === 0) {
				return () => undefined
			}
			if (this.sequence.length === 1) {
				return this.sequence[0].compile(context)
			}
			const evaluators = this.sequence.map(s => s.compile(context))
			return (x, y, z) => {
				for (const rule of evaluators) {
					const state = rule(x, y, z)
					if (state) {
						return state
					}
				}
				return undefined
			}
		}
	}

	export class Condition extends MaterialRule {
		constructor(
			private readonly ifTrue: MaterialCondition,
			private readonly thenRun: MaterialRule,
		) {
			super()
		}
		compile(context: MaterialRuleContext): RuleEvaluator {
			const ifTrueEvaluator = this.ifTrue.compile(context)
			const thenRunEvaluator = this.thenRun.compile(context)
			return (x, y, z) => {
				if (ifTrueEvaluator()) {
					return thenRunEvaluator(x, y, z)
				}
				return undefined
			}
		}
	}
}

export type ConditionEvaluator = () => boolean

export abstract class MaterialCondition {
	abstract compile(context: MaterialRuleContext): ConditionEvaluator
}

export namespace MaterialCondition {
	export const ALWAYS_FALSE: MaterialCondition = {compile: () => () => false}
	export const ALWAYS_TRUE: MaterialCondition = {compile: () => () => true}

	export function fromJson(obj: unknown): MaterialCondition {
		if (typeof obj === 'string') {
			return new HolderHolder(Holder.reference(WorldgenRegistries.MATERIAL_CONDITION, Identifier.parse(obj)))
		}
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'above_preliminary_surface': return new AbovePreliminarySurface()
			case 'biome': return new Biome(
				HolderSet.fromJson(WorldgenRegistries.BIOME, root.biome_is),
			)
			case 'noise_threshold': return new NoiseThreshold(
				Identifier.parse(Json.readString(root.noise) ?? ''),
				Json.readNumber(root.min_threshold) ?? 0,
				Json.readNumber(root.max_threshold) ?? 0,
				Json.readBoolean(root.is_3d) ?? false,
			)
			case 'not': return new Not(MaterialCondition.fromJson(root.invert))
			case 'stone_depth': return new StoneDepth(
				Json.readInt(root.offset) ?? 0,
				Json.readBoolean(root.add_surface_depth) ?? false,
				Json.readInt(root.secondary_depth_range) ?? 0,
				Json.readString(root.surface_type) === 'ceiling',
			)
			case 'vertical_gradient': return new VerticalGradient(
				Identifier.parse(Json.readString(root.random_name) ?? ''),
				VerticalAnchor.fromJson(root.true_at_and_below),
				VerticalAnchor.fromJson(root.false_at_and_above),
			)
			case 'water': return new Water(
				Json.readInt(root.offset) ?? 0,
				Json.readInt(root.surface_depth_multiplier) ?? 0,
				Json.readBoolean(root.add_surface_depth) ?? false,
			)
			case 'y_above': return new YAbove(
				VerticalAnchor.fromJson(root.anchor),
				Json.readInt(root.surface_depth_multiplier) ?? 0,
				Json.readBoolean(root.add_surface_depth) ?? false,
			)
		}
		return ALWAYS_FALSE
	}

	function lazyYCondition(context: MaterialRuleContext, evaluator: ConditionEvaluator): ConditionEvaluator {
		let lastUpdateY = context.lastUpdateY - 1
		let result = false
		return () => {
			if (context.lastUpdateY !== lastUpdateY) {
				lastUpdateY = context.lastUpdateY
				result = evaluator()
			}
			return result
		}
	}

	export class HolderHolder extends MaterialCondition {
		constructor(
			private readonly holder: Holder<MaterialCondition>,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			return this.holder.value().compile(context)
		}
	}

	export class AbovePreliminarySurface extends MaterialCondition {
		compile(context: MaterialRuleContext): ConditionEvaluator {
			return () => context.blockY >= context.getMinSurfaceLevel()
		}
	}

	export class Biome extends MaterialCondition {
		constructor(
			private readonly biomes: HolderSet<{}>,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			const biomeSet = new Set(Array(...this.biomes.getEntries()).map(h => h.key()!.toString()))
			return lazyYCondition(context, () => {
				return biomeSet.has(context.getBiome().toString())
			})
		}
	}

	export class NoiseThreshold extends MaterialCondition {
		constructor(
			private readonly noise: Identifier,
			private readonly minThreshold: number,
			private readonly maxThreshold: number,
			private readonly is3d: boolean,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			const noise = context.getNoiseSampler(this.noise, this.is3d)
			return () => {
				const value = noise()
				return this.minThreshold <= value && value <= this.maxThreshold
			}
		}
	}

	export class Not extends MaterialCondition {
		constructor(
			private readonly invert: MaterialCondition,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			const invertEvaluator = this.invert.compile(context)
			return () => !invertEvaluator()
		}
	}

	export class StoneDepth extends MaterialCondition {
		constructor(
			private readonly offset: number,
			private readonly addSurfaceDepth: boolean,
			private readonly secondaryDepthRange: number,
			private readonly ceiling: boolean,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			return lazyYCondition(context, () => {
				const stoneDepth = this.ceiling ? context.stoneDepthBelow : context.stoneDepthAbove
				const surfaceDepth = this.addSurfaceDepth ? context.surfaceDepth : 0
				const secondaryDepth = this.secondaryDepthRange === 0 ? 0 : map(context.getSurfaceSecondary(), -1, 1, 0, this.secondaryDepthRange)
				return stoneDepth <= 1 + this.offset + surfaceDepth + secondaryDepth
			})
		}
	}

	export class VerticalGradient extends MaterialCondition {
		constructor(
			private readonly randomName: Identifier,
			private readonly trueAtAndBelow: VerticalAnchor,
			private readonly falseAtAndAbove: VerticalAnchor,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			const trueAtAndBelowY = context.resolveAnchorY(this.trueAtAndBelow)
			const falseAtAndAboveY = context.resolveAnchorY(this.falseAtAndAbove)
			const randomFactory = context.system.getOrCreateRandom(this.randomName)
			return lazyYCondition(context, () => {
				if (context.blockY <= trueAtAndBelowY) {
					return true
				}
				if (context.blockY >= falseAtAndAboveY) {
					return false
				}
				const probability = map(context.blockY, trueAtAndBelowY, falseAtAndAboveY, 1, 0)
				const random = randomFactory.at(context.blockX, context.blockY, context.blockZ)
				return random.nextFloat() < probability
			})
		}
	}

	export class Water extends MaterialCondition {
		constructor(
			private readonly offset: number,
			private readonly surfaceDepthMultiplier: number,
			private readonly addStoneDepth: boolean,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			return lazyYCondition(context, () => {
				if (context.waterHeight === Number.MIN_SAFE_INTEGER) {
					return true
				}
				const stoneDepth = this.addStoneDepth ? context.stoneDepthAbove : 0
				return context.blockY + stoneDepth >= context.waterHeight + this.offset + context.surfaceDepth * this.surfaceDepthMultiplier
			})
		}
	}

	export class YAbove extends MaterialCondition {
		constructor(
			private readonly anchor: VerticalAnchor,
			private readonly surfaceDepthMultiplier: number,
			private readonly addStoneDepth: boolean,
		) {
			super()
		}
		compile(context: MaterialRuleContext): ConditionEvaluator {
			return lazyYCondition(context, () => {
				const stoneDepth = this.addStoneDepth ? context.stoneDepthAbove : 0
				return context.blockY + stoneDepth >= context.resolveAnchorY(this.anchor) + context.surfaceDepth * this.surfaceDepthMultiplier
			})
		}
	}
}
