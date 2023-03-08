import { BlockPos, HolderSet } from '../core/index.js'
import type { Random } from '../math/index.js'
import { LegacyRandom } from '../math/index.js'
import { Json } from '../util/Json.js'
import type { BiomeSource, Climate } from './biome/index.js'
import { Heightmap } from './Heightmap.js'
import { HeightProvider } from './HeightProvider.js'
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
		const posX = chunkX << 4 + 8
		const posZ = chunkZ << 4 + 8

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

	public tryGenerate(seed: bigint, chunkX: number, chunkZ: number, biomeSource: BiomeSource, sampler: Climate.Sampler, context: WorldgenStructure.GenerationContext): boolean {
		const random = LegacyRandom.fromLargeFeatureSeed(seed, chunkX, chunkZ)

		const pos = this.findGenerationPoint(chunkX, chunkZ, random, context)
		if (pos === undefined) return false
		const biome = biomeSource.getBiome(pos[0]>>2, pos[1], pos[2]>>2, sampler)
		return [...this.settings.validBiomes.getBiomes()].findIndex((b) => b.key()?.equals(biome)) >= 0
	}
}

export namespace WorldgenStructure {

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
				const heightmap = Heightmap.fromJson(root.project_start_to_heightmap)
				return new JigsawStructure(settings, startHeight, heightmap)
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
			private readonly startHeight: HeightProvider,
			private readonly projectStartToHeightmap: Heightmap | undefined
		) {
			super(settings)
		}

		public findGenerationPoint(chunkX: number, chunkZ: number, random: Random, context: WorldgenStructure.GenerationContext): BlockPos | undefined {
			var y = this.startHeight(random, context.worldgenContext)

			// this is actually much more complicated, but for now this is enough
			if (this.projectStartToHeightmap) {
				y += context.surfaceLevelAccessor(chunkX << 4, chunkZ << 4, this.projectStartToHeightmap)
			}

			return BlockPos.create(chunkX << 4, y, chunkZ << 4)
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
		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
			throw new Error('Method not implemented.')
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

		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
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
		public findGenerationPoint(chunkX: number, chunkZ: number): BlockPos | undefined {
			throw new Error('Method not implemented.')
		}
	}

}
