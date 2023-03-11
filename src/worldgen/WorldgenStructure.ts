import { BlockPos, Holder, HolderSet, Identifier, Registry } from '../core/index.js'
import { Rotation } from '../core/Rotation.js'
import type { Random } from '../math/index.js'
import { LegacyRandom } from '../math/index.js'
import { Json } from '../util/Json.js'
import type { BiomeSource, Climate } from './biome/index.js'
import { Heightmap } from './Heightmap.js'
import { HeightProvider } from './HeightProvider.js'
import { StructurePoolElement } from './StructurePoolElement.js'
import { StructureTemplatePool } from './StructureTemplatePool.js'
import type { WorldgenContext } from './VerticalAnchor.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

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

		return [posX, context.surfaceLevelAccessor(posX, posZ, heightmap) , posZ] // TODO
	}

	protected getLowestY(context: WorldgenStructure.GenerationContext, minX: number, minZ: number, width: number, depth: number) {
		return Math.min(
			context.surfaceLevelAccessor(minX, minZ, 'WORLD_SURFACE_WG'), 
			context.surfaceLevelAccessor(minX, minZ + depth, 'WORLD_SURFACE_WG'), 
			context.surfaceLevelAccessor(minX + width, minZ, 'WORLD_SURFACE_WG'), 
			context.surfaceLevelAccessor(minX + width, minZ + depth, 'WORLD_SURFACE_WG')
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

	public tryGenerate(seed: bigint, chunkX: number, chunkZ: number, biomeSource: BiomeSource, sampler: Climate.Sampler, context: WorldgenStructure.GenerationContext): boolean {
		const random = LegacyRandom.fromLargeFeatureSeed(seed, chunkX, chunkZ)

		const pos = this.findGenerationPoint(chunkX, chunkZ, random, context)
		if (pos === undefined) return false
		const biome = biomeSource.getBiome(pos[0]>>2, pos[1], pos[2]>>2, sampler)
		//		console.log(`${chunkX}, ${chunkZ} => ${pos[0]}, ${pos[1]}, ${pos[2]}: ${biome.toString()}`)

		return [...this.settings.validBiomes.getBiomes()].findIndex((b) => b.key()?.equals(biome)) >= 0
	}
}

export namespace WorldgenStructure {
	export const REGISTRY = Registry.register<WorldgenStructure>('worldgen/structure', fromJson)

	export class StructureSettings {
		constructor(
			public readonly validBiomes: HolderSet<unknown>,
		) {

		}
	}

	export class GenerationContext {

		constructor(
			public readonly surfaceLevelAccessor: SufaceLevelAccessor,
			public readonly worldgenContext: WorldgenContext,
			public readonly seaLevel: number
		) {

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
				return new JigsawStructure(settings, startPool, startHeight, heightmap, startJigsawName)
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
			private readonly startJigsawName: Identifier | undefined
		) {
			super(settings)
		}

		public findGenerationPoint(chunkX: number, chunkZ: number, random: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			var y = this.startHeight(random, context.worldgenContext)
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
					y = pos[1] + context.surfaceLevelAccessor(x, z, this.projectStartToHeightmap)
				} else {
					y = templateStartPos[1]
				}

				const generationPoint = BlockPos.create(x, y + startJigsawOffset[1], z)

				//console.log(`Generating Jigsaw Structure in Chunk ${chunkX}, ${chunkZ}: rotation: ${rotation}, startingElement: ${startingElement.toString()}, center: ${x}, ${y}, ${z}`)

				return generationPoint
			}
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
			if (this.getLowestY(context, chunkX << 4, chunkZ << 4, this.width, this.depth) < context.seaLevel) {
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
