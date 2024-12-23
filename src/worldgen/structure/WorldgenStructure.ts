import { BlockPos, Holder, HolderSet, Identifier, Registry, Rotation } from '../../core/index.js'
import type { Random } from '../../math/index.js'
import { LegacyRandom } from '../../math/index.js'
import { Json } from '../../util/Json.js'
import type { BiomeSource } from '../biome/index.js'
import { Heightmap } from '../Heightmap.js'
import { HeightProvider } from '../HeightProvider.js'
import type { LevelHeight } from '../LevelHeight.js'
import { NoiseChunkGenerator } from '../NoiseChunkGenerator.js'
import type { NoiseGeneratorSettings } from '../NoiseGeneratorSettings.js'
import { RandomState } from '../RandomState.js'
import { WorldgenRegistries } from '../WorldgenRegistries.js'
import { StructurePoolElement } from './StructurePoolElement.js'
import { StructureTemplatePool } from './StructureTemplatePool.js'

export type SufaceLevelAccessor = (posX: number, posZ: number, heightmap: Heightmap) => number

export abstract class WorldgenStructure {
	constructor(
		protected settings: WorldgenStructure.StructureSettings
	) {

	}

	public abstract findGenerationPoint(chunkX: number, chunkZ: number, random: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined

	protected onTopOfChunkCenter(context: WorldgenStructure.GenerationContext, chunkX: number, chunkZ: number, heightmap: Heightmap = 'WORLD_SURFACE_WG'): BlockPos {
		const posX = (chunkX << 4) + 8
		const posZ = (chunkZ << 4) + 8

		return [posX, context.chunkGenerator.getBaseHeight(posX, posZ, heightmap, context.randomState) - 1 , posZ] // TODO
	}

	protected getLowestY(context: WorldgenStructure.GenerationContext, minX: number, minZ: number, width: number, depth: number) {
		return Math.min(
			context.chunkGenerator.getBaseHeight(minX, minZ, 'WORLD_SURFACE_WG', context.randomState) - 1,
			context.chunkGenerator.getBaseHeight(minX, minZ + depth, 'WORLD_SURFACE_WG', context.randomState) - 1,
			context.chunkGenerator.getBaseHeight(minX + width, minZ, 'WORLD_SURFACE_WG', context.randomState) - 1,
			context.chunkGenerator.getBaseHeight(minX + width, minZ + depth, 'WORLD_SURFACE_WG', context.randomState) - 1
		)
	}

	protected getLowestYIn5by5BoxOffset7Blocks(context: WorldgenStructure.GenerationContext, chunkX: number, chunkZ: number, rotation: Rotation) {
		let width =  5
		let depth = 5
		if (rotation === Rotation.CLOCKWISE_90){
			width = -5
		} else if (rotation === Rotation.CLOCKWISE_180){
			width = -5
			depth = - 5
		} else if (rotation === Rotation.COUNTERCLOCKWISE_90){
			depth = -5
		}

		const posX = (chunkX << 4) + 7
		const posZ = (chunkZ << 4) + 7

		return BlockPos.create(posX, this.getLowestY(context, posX, posZ, width, depth), posZ)
	}

	public tryGenerate(chunkX: number, chunkZ: number, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
		const random = LegacyRandom.fromLargeFeatureSeed(context.seed, chunkX, chunkZ)

		const pos = this.findGenerationPoint(chunkX, chunkZ, random, context)
		if (pos === undefined) return undefined
		const biome = context.biomeSource.getBiome(pos[0]>>2, pos[1]>>2, pos[2]>>2, context.randomState.sampler)

		return [...this.settings.validBiomes.getEntries()].findIndex((b) => b.key()?.equals(biome)) >= 0 ? pos : undefined
	}
}

export namespace WorldgenStructure {
	export const REGISTRY = Registry.createAndRegister<WorldgenStructure>('worldgen/structure', fromJson)

	export class StructureSettings {
		constructor(
			public readonly validBiomes: HolderSet<unknown>,
		) {

		}
	}

	export class GenerationContext {
		public readonly chunkGenerator: NoiseChunkGenerator
		public readonly randomState: RandomState

		constructor(
			public readonly seed: bigint,
			public readonly biomeSource: BiomeSource,
			public readonly settings: NoiseGeneratorSettings,
			public readonly levelHeight: LevelHeight,
		) {
			this.randomState = new RandomState(settings, seed)
			this.chunkGenerator = new NoiseChunkGenerator(biomeSource, settings)
		}
	}

	const structurePoolParser = Holder.parser(StructureTemplatePool.REGISTRY, StructureTemplatePool.fromJson)

	export function fromJson(obj: unknown): WorldgenStructure {
		const BiomeTagParser = HolderSet.parser(WorldgenRegistries.BIOME)

		const root = Json.readObject(obj) ?? {}

		const biomes = BiomeTagParser(root.biomes)
		const settings = new StructureSettings(biomes.value())

		switch (Json.readString(root.type)?.replace(/^minecraft:/, '')) {
			case 'buried_treasure':
				return new BuriedTreasureStructure(settings)
			case 'desert_pyramid':
				return new DesertPyramidStructure(settings)
			case 'end_city':
				return new EndCityStructure(settings)
			case 'fortress':
				return new NetherFortressStructure(settings)
			case 'igloo':
				return new IglooStructure(settings)
			case 'jigsaw':
				const startHeight = HeightProvider.fromJson(root.start_height)
				const startPool = structurePoolParser(root.start_pool)
				const startJigsawNameString = Json.readString(root.start_jigsaw_name)
				const startJigsawName = startJigsawNameString ? Identifier.parse(startJigsawNameString) : undefined
				const heightmap = Heightmap.fromJson(root.project_start_to_heightmap)
				const dimensionPadding = JigsawStructure.DimensionPadding.fromJson(root.dimension_padding)
				return new JigsawStructure(settings, startPool, startHeight, heightmap, startJigsawName, dimensionPadding)
			case 'jungle_temple':
				return new JungleTempleStructure(settings)
			case 'mineshaft':
				const type = Json.readString(root.mineshaft_type) === 'mesa' ? 'mesa' : 'normal'
				return new MineshaftStructure(settings, type)
			case 'nether_fossil':
				return new NetherFortressStructure(settings)
			case 'ocean_monument':
				return new OceanMonumentStructure(settings)
			case 'ocean_ruin':
				return new OceanRuinStructure(settings)
			case 'ruined_portal':
				return new RuinedPortalStructure(settings)
			case 'shipwreck':
				const isBeached = Json.readBoolean(root.is_beached) ?? false
				return new ShipwreckStructure(settings, isBeached)
			case 'stronghold':
				return new StrongholdStructure(settings)
			case 'swamp_hut':
				return new SwampHutStructure(settings)
			case 'woodland_mansion':
				return new WoodlandMansionStructure(settings)
		}

		return new BuriedTreasureStructure(settings)
	}

	export class JigsawStructure extends WorldgenStructure {
		constructor(
			settings: WorldgenStructure.StructureSettings,
			private readonly startingPoolHolder: Holder<StructureTemplatePool>,
			private readonly startHeight: HeightProvider,
			private readonly projectStartToHeightmap: Heightmap | undefined,
			private readonly startJigsawName: Identifier | undefined,
			private readonly dimensionPadding: JigsawStructure.DimensionPadding
		) {
			super(settings)
		}

		public findGenerationPoint(chunkX: number, chunkZ: number, random: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			var y = this.startHeight(random, context.settings.noise)
			const pos = BlockPos.create(chunkX << 4, y, chunkZ << 4)
			
			const rotation = Rotation.getRandom(random)
			const startingPool = this.startingPoolHolder.value()
			const startingElement = startingPool.getRandomTemplate(random)

			if (startingElement instanceof StructurePoolElement.EmptyPoolElement){
				return undefined
			} else {
				var startJigsawOffset: BlockPos
				if (this.startJigsawName){
					const offset = JigsawStructure.getRandomNamedJigsaw(startingElement, this.startJigsawName, rotation, random)
					if (offset === undefined){
						return undefined
					}
					startJigsawOffset = offset
				} else {
					startJigsawOffset = BlockPos.ZERO
				}

				const templateStartPos = BlockPos.subtract(pos, startJigsawOffset)
				const boundingBox = startingElement.getBoundingBox(templateStartPos, rotation)

				const x = ((boundingBox[1][0] + boundingBox[0][0]) / 2)^0
				const z = ((boundingBox[1][2] + boundingBox[0][2]) / 2)^0
				var y: number
				if (this.projectStartToHeightmap){
					y = pos[1] + context.chunkGenerator.getBaseHeight(x, z, this.projectStartToHeightmap, context.randomState)
				} else {
					y = templateStartPos[1]
				}

				boundingBox.forEach(pos => pos[1] += y - boundingBox[0][1] - 1)
				if (JigsawStructure.isStartTooCloseToWorldHeightLimits(this.dimensionPadding, boundingBox, context.levelHeight)) {
					return undefined
				}

				const generationPoint = BlockPos.create(x, y + startJigsawOffset[1], z)

				//console.log(`Generating Jigsaw Structure in Chunk ${chunkX}, ${chunkZ}: rotation: ${rotation}, startingElement: ${startingElement.toString()}, center: ${x}, ${y}, ${z}`)

				return generationPoint
			}
		}

		public static isStartTooCloseToWorldHeightLimits(dimensionPadding: JigsawStructure.DimensionPadding, boundingBox: [BlockPos, BlockPos], levelHeight: LevelHeight ): boolean {
			if (dimensionPadding === JigsawStructure.DimensionPadding.ZERO) { // reference comparison here is correct (i.e. matching vanilla), see MC-278259
				return false
			}

			const bottomLimit = levelHeight.minY + dimensionPadding.bottom
			const topLimit = levelHeight.minY + levelHeight.height - dimensionPadding.top
			return boundingBox[0][1] < bottomLimit || boundingBox[1][1] > topLimit
		}

		private static getRandomNamedJigsaw(element: StructurePoolElement, name: Identifier, rotation: Rotation, random: Random): BlockPos | undefined{
			const jigsaws = element.getShuffledJigsawBlocks(rotation, random)
			for (const jigsaw of jigsaws){
				if (Identifier.parse(jigsaw.nbt?.getString('name') ?? 'minecraft:empty').equals(name)){
					return jigsaw.pos
				}
			}

			return undefined
		}
	}

	export namespace JigsawStructure {
		export class DimensionPadding {
			static ZERO: DimensionPadding = new DimensionPadding(0, 0)

			constructor(
				public top: number,
				public bottom: number
			) {}

			static fromJson(obj: unknown): DimensionPadding {
				if (obj === undefined) {
					return DimensionPadding.ZERO
				}
				if (typeof obj === 'number') {
					return new DimensionPadding(obj, obj)
				}

				const padding = Json.readObject(obj) ?? {}
				return new DimensionPadding(Json.readInt(padding.top) ?? 0, Json.readInt(padding.bottom) ?? 0)
			}
		}
	}

	export class BuriedTreasureStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number, _: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			return this.onTopOfChunkCenter(context, chunkX, chunkZ, 'OCEAN_FLOOR_WG')
		}
	}

	class SinglePieceStructure extends WorldgenStructure {
		constructor(
			settings: WorldgenStructure.StructureSettings,
			private readonly width: number,
			private readonly depth: number
		) {
			super(settings)
		}

		public findGenerationPoint(chunkX: number, chunkZ: number, _: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			if (this.getLowestY(context, chunkX << 4, chunkZ << 4, this.width, this.depth) < context.settings.seaLevel) {
				return undefined
			} else {
				return this.onTopOfChunkCenter(context, chunkX, chunkZ)
			}
		}
	}

	export class DesertPyramidStructure extends SinglePieceStructure {
		constructor(
			settings: WorldgenStructure.StructureSettings,
		) {
			super(settings, 21, 21)
		}
	}

	export class EndCityStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number, random: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			const rotation = Rotation.getRandom(random)
			const pos = this.getLowestYIn5by5BoxOffset7Blocks(context, chunkX, chunkZ, rotation)
			if (pos[1] < 60) return undefined
			return pos
		}
	}

	export class NetherFortressStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
			return BlockPos.create(chunkX << 4, 64, chunkZ << 4)
		}
	}

	export class IglooStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number, _: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			return this.onTopOfChunkCenter(context, chunkX, chunkZ)
		}
	}

	export class JungleTempleStructure extends SinglePieceStructure {
		constructor(
			settings: WorldgenStructure.StructureSettings,
		) {
			super(settings, 12, 15)
		}
	}

	export class MineshaftStructure extends WorldgenStructure {
		constructor(
			settings: WorldgenStructure.StructureSettings,
			private readonly type: 'normal' | 'mesa'
		) {
			super(settings)
		}

		public findGenerationPoint(chunkX: number, chunkZ: number, random: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			throw new Error('Method not implemented.')
		}
	}

	export class NetherFossilStructure extends WorldgenStructure {
		constructor(
			settings: WorldgenStructure.StructureSettings,
			private readonly height: HeightProvider
		) {
			super(settings)
		}

		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
			throw new Error('Method not implemented.')
		}
	}

	export class OceanMonumentStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
			throw new Error('Method not implemented.')
		}
	}

	export class OceanRuinStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number, _: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			return this.onTopOfChunkCenter(context, chunkX, chunkZ, 'OCEAN_FLOOR_WG')
		}
	}

	export class RuinedPortalStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
			throw new Error('Method not implemented.')
		}
	}

	export class ShipwreckStructure extends WorldgenStructure {
		constructor(
			settings: WorldgenStructure.StructureSettings,
			private readonly isBeached: boolean
		) {
			super(settings)
		}

		public findGenerationPoint(chunkX: number, chunkZ: number, _: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			return this.onTopOfChunkCenter(context, chunkX, chunkZ, this.isBeached ? 'WORLD_SURFACE_WG' : 'OCEAN_FLOOR_WG' )
		}
	}

	export class StrongholdStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
			return BlockPos.create(chunkX << 4, 0, chunkZ << 4)
		}
	}

	export class SwampHutStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number, _: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			return this.onTopOfChunkCenter(context, chunkX, chunkZ)
		}
	}

	export class WoodlandMansionStructure extends WorldgenStructure {
		public findGenerationPoint(chunkX: number, chunkZ: number, random: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			const rotation = Rotation.getRandom(random)
			const pos = this.getLowestYIn5by5BoxOffset7Blocks(context, chunkX, chunkZ, rotation)
			if (pos[1] < 60) return undefined
			return pos
		}
	}

}
