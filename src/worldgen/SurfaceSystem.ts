
import type { Chunk } from '../core'
import { BlockPos, BlockState, ChunkPos, computeIfAbsent, Json, lazy } from '../core'
import type { NormalNoise, PositionalRandom, Random } from '../math'
import { lerp2, map, XoroshiroRandom } from '../math'
import type { NoiseChunk } from './NoiseChunk'
import { Noises } from './Noises'
import type { WorldgenContext } from './VerticalAnchor'
import { VerticalAnchor } from './VerticalAnchor'

export class SurfaceSystem {
	private readonly surfaceNoise: NormalNoise
	private readonly surfaceSecondaryNoise: NormalNoise
	private readonly random: PositionalRandom
	private readonly positionalRandoms: Map<string, Random>

	constructor(
		private readonly rule: SurfaceRule,
		private readonly defaultBlock: BlockState,
		seed: bigint,
	) {
		this.random = XoroshiroRandom.create(seed).forkPositional()
		this.surfaceNoise = Noises.instantiate(this.random, Noises.SURFACE)
		this.surfaceSecondaryNoise = Noises.instantiate(this.random, Noises.SURFACE_SECONDARY)
		this.positionalRandoms = new Map()
	}

	public buildSurface(chunk: Chunk, noiseChunk: NoiseChunk, worldgenContext: WorldgenContext, getBiome: (pos: BlockPos) => string) {
		const minX = ChunkPos.minBlockX(chunk.pos)
		const minZ = ChunkPos.minBlockZ(chunk.pos)
		const surfaceContext = new SurfaceContext(this, chunk, noiseChunk, worldgenContext, getBiome)
		const ruleWithContext = this.rule(surfaceContext)

		for (let x = 0; x < 16; x += 1) {
			const worldX = minX + x
			for (let z = 0; z < 1; z += 1) {
				const worldZ = minZ + z
				surfaceContext.updateXZ(worldX, worldZ)
				let stoneDepthAbove = 0
				let waterHeight = Number.MIN_SAFE_INTEGER
				let stoneDepthOffset = Number.MAX_SAFE_INTEGER

				for (let y = chunk.maxY; y >= chunk.minY; y -= 1) {
					const worldPos = BlockPos.create(worldX, y, worldZ)
					const oldState = chunk.getBlockState(worldPos)
					if (oldState.equals(BlockState.AIR)) {
						stoneDepthAbove = 0
						waterHeight = Number.MIN_SAFE_INTEGER
						continue
					}
					if (oldState.isFluid()) {
						if (waterHeight === Number.MIN_SAFE_INTEGER) {
							waterHeight = y + 1
						}
						continue
					}
					if (stoneDepthOffset >= y) {
						stoneDepthOffset = Number.MIN_SAFE_INTEGER
						for (let i = y - 1; i >= chunk.minY; i -= 1) {
							const state = chunk.getBlockState(BlockPos.create(worldX, i, worldZ))
							if (state.equals(BlockState.AIR) || state.isFluid()) {
								stoneDepthOffset = i + 1
								break
							}
						}
					}
					stoneDepthAbove += 1
					const stoneDepthBelow = y - stoneDepthOffset + 1

					if (!oldState.equals(this.defaultBlock)) {
						continue
					}
					surfaceContext.updateY(stoneDepthAbove, stoneDepthBelow, waterHeight, y)
					const newState = ruleWithContext(worldX, y, worldZ)
					if (newState) {
						chunk.setBlockState(worldPos, newState)
					}
				}
			}
		}
	}

	public getSurfaceDepth(x: number, z: number) {
		const noise = this.surfaceNoise.sample(x, 0, z)
		const offset = this.random.at(x, 0, z).nextDouble() * 0.25
		return noise * 2.75 + 3 + offset
	}

	public getSurfaceSecondary(x: number, z: number) {
		return this.surfaceSecondaryNoise.sample(x, 0, z)
	}

	public getRandom(name: string): Random {
		return computeIfAbsent(this.positionalRandoms, name, () => {
			return this.random.fromHashOf(name)
		})
	}
}

export class SurfaceContext {
	public blockX: number = 0
	public blockY: number = 0
	public blockZ: number = 0
	public stoneDepthAbove: number = 0
	public stoneDepthBelow: number = 0
	public surfaceDepth: number = 0
	public waterHeight: number = 0

	public biome: () => string = () => ''
	public surfaceSecondary: () => number = () => 0
	public minSurfaceLevel: () => number = () => 0

	constructor(
		public readonly system: SurfaceSystem,
		public readonly chunk: Chunk,
		public readonly noiseChunk: NoiseChunk,
		public readonly context: WorldgenContext,
		private readonly getBiome: (pos: BlockPos) => string,
	) {}

	public updateXZ(x: number, z: number) {
		this.blockX = x
		this.blockZ = z
		this.surfaceDepth = this.system.getSurfaceDepth(x, z)
		this.surfaceSecondary = lazy(() => this.system.getSurfaceSecondary(x, z))
		this.minSurfaceLevel = lazy(() => this.calculateMinSurfaceLevel(x, z))
	}

	public updateY(stoneDepthAbove: number, stoneDepthBelow: number, waterHeight: number, y: number) {
		this.blockY = y
		this.stoneDepthAbove = stoneDepthAbove
		this.stoneDepthBelow = stoneDepthBelow
		this.waterHeight = waterHeight
		this.biome = lazy(() => this.getBiome(BlockPos.create(this.blockX, this.blockY, this.blockZ)))
	}

	private calculateMinSurfaceLevel(x: number, z: number) {
		const cellX = x >> 4
		const cellZ = z >> 4
		const level00 = this.noiseChunk.getPreliminarySurfaceLevel(cellX << 4, cellZ << 4)
		const level10 = this.noiseChunk.getPreliminarySurfaceLevel((cellX + 1) << 4, cellZ << 4)
		const level01 = this.noiseChunk.getPreliminarySurfaceLevel(cellX << 4, (cellZ + 1) << 4)
		const level11 = this.noiseChunk.getPreliminarySurfaceLevel((cellX + 1) << 4, (cellZ + 1) << 4)
		const level = Math.floor(lerp2((x & 0xF) / 16, (z & 0xF) / 16, level00, level10, level01, level11))
		return level + this.surfaceDepth - 8
	}
}

export type SurfaceRule = (context: SurfaceContext) => (x: number, y: number, z: number) => BlockState | undefined

export namespace SurfaceRule {
	const NOOP = () => () => undefined

	export function fromJson(obj: unknown): SurfaceRule {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'block': return block(BlockState.fromJson(root.result_state))
			case 'sequence': return sequence(Json.readArray(root.sequence, SurfaceRule.fromJson) ?? [])
			case 'condition': return condition(SurfaceCondition.fromJson(root.if_true), SurfaceRule.fromJson(root.then_run))
		}
		return NOOP
	}

	function block(state: BlockState): SurfaceRule {
		return () => () => state
	}

	function sequence(rules: SurfaceRule[]): SurfaceRule {
		return context => {
			const rulesWithContext = rules.map(rule => rule(context))
			return (x, y, z) => {
				for (const rule of rulesWithContext) {
					const result = rule(x, y, z)
					if (result) return result
				}
				return undefined
			}
		}
	}

	function condition(ifTrue: SurfaceCondition, thenRun: SurfaceRule): SurfaceRule {
		return context => (x, y, z) => {
			if (ifTrue(context)) {
				return thenRun(context)(x, y, z)
			}
			return undefined
		}
	}
}

export type SurfaceCondition = (context: SurfaceContext) => boolean

export namespace SurfaceCondition {
	const NOOP = () => false

	export function fromJson(obj: unknown): SurfaceCondition {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'above_preliminary_surface': return abovePreliminarySurface()
			case 'biome': return biome(
				Json.readArray(root.biome_is, e => Json.readString(e) ?? '') ?? []
			)
			case 'not': return not(SurfaceCondition.fromJson(root.invert))
			case 'stone_depth': return stoneDepth(
				Json.readInt(root.offset) ?? 0,
				Json.readBoolean(root.add_surface_depth) ?? false,
				Json.readInt(root.secondary_depth_range) ?? 0,
				Json.readString(root.surface_type) === 'ceiling',
			)
			case 'vertical_gradient': return verticalGradient(
				Json.readString(root.random_name) ?? '',
				VerticalAnchor.fromJson(root.true_at_and_below),
				VerticalAnchor.fromJson(root.false_at_and_above),
			)
			case 'water': return water(
				Json.readInt(root.offset) ?? 0,
				Json.readInt(root.surface_depth_multiplier) ?? 0,
				Json.readBoolean(root.add_surface_depth) ?? false,
			)
			case 'y_above': return yAbove(
				VerticalAnchor.fromJson(root.anchor),
				Json.readInt(root.surface_depth_multiplier) ?? 0,
				Json.readBoolean(root.add_surface_depth) ?? false,
			)
		}
		return NOOP
	}

	function abovePreliminarySurface(): SurfaceCondition {
		return context => context.blockY >= context.minSurfaceLevel()
	}

	function biome(biomes: string[]): SurfaceCondition {
		const biomeSet = new Set(biomes)
		return context => biomeSet.has(context.biome())
	}

	function not(invert: SurfaceCondition): SurfaceCondition {
		return context => !invert(context)
	}

	function stoneDepth(offset: number, addSurfaceDepth: boolean, secondaryDepthRange: number, ceiling: boolean): SurfaceCondition {
		return context => {
			const depth = ceiling ? context.stoneDepthBelow : context.stoneDepthAbove
			const surfaceDepth = addSurfaceDepth ? context.surfaceDepth : 0
			const secondaryDepth = secondaryDepthRange === 0 ? 0 : map(context.surfaceSecondary(), -1, 1, 0, secondaryDepthRange)
			return depth <= 1 + offset + surfaceDepth + secondaryDepth
		}
	}

	function verticalGradient(randomName: string, trueAtAndBelow: VerticalAnchor, falseAtAndAbove: VerticalAnchor): SurfaceCondition {
		return context => {
			const trueAtAndBelowY = trueAtAndBelow(context.context)
			const falseAtAndAboveY = falseAtAndAbove(context.context)
			if (context.blockY <= trueAtAndBelowY) {
				return true
			}
			if (context.blockY >= falseAtAndAboveY) {
				return false
			}
			const random = context.system.getRandom(randomName)
			const chance = map(context.blockY, trueAtAndBelowY, falseAtAndAboveY, 1, 0)
			return random.nextFloat() < chance
		}
	}

	function water(offset: number, surfaceDepthMultiplier: number, addStoneDepth: boolean): SurfaceCondition {
		return context => {
			if (context.waterHeight === Number.MIN_SAFE_INTEGER) {
				return true
			}
			const stoneDepth = addStoneDepth ? context.stoneDepthAbove : 0
			return context.blockY + stoneDepth >= context.waterHeight + offset + context.surfaceDepth * surfaceDepthMultiplier
		}
	}

	function yAbove(anchor: VerticalAnchor, surfaceDepthMultiplier: number, addStoneDepth: boolean): SurfaceCondition {
		return context => {
			const stoneDepth = addStoneDepth ? context.stoneDepthAbove : 0
			return context.blockY + stoneDepth >= anchor(context.context) + context.surfaceDepth * surfaceDepthMultiplier
		}
	}
}
