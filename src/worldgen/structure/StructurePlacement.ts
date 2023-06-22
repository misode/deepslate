import type { ChunkPos } from '../../core/index.js'
import { BlockPos, Holder, HolderSet, Identifier } from '../../core/index.js'
import type { Random } from '../../math/index.js'
import { LegacyRandom } from '../../math/index.js'
import { Json } from '../../util/index.js'
import { WorldgenRegistries } from '../WorldgenRegistries.js'
import type { Climate } from '../biome/index.js'
import { BiomeSource } from '../biome/index.js'
import { StructureSet } from './StructureSet.js'

export abstract class StructurePlacement {
	protected constructor(
		protected readonly locateOffset: BlockPos,
		protected readonly frequencyReductionMethod: StructurePlacement.FrequencyReducer,
		public readonly frequency: number,
		protected readonly salt: number,
		protected readonly exclusionZone: StructurePlacement.ExclusionZone | undefined) {

	}

	public static fromJson(obj: unknown): StructurePlacement {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')

		const locateOffset = BlockPos.fromJson(root.locate_offset)
		const frequencyReductionMethod = StructurePlacement.FrequencyReducer.fromType(Json.readString(root.frequency_reduction_method) ?? 'default')
		const frequency = Json.readNumber(root.frequency) ?? 1
		const salt = Json.readInt(root.salt) ?? 0
		const exclusionZone = 'exclusion_zone' in root ? StructurePlacement.ExclusionZone.fromJson(root.exclusion_zone) : undefined

		switch (type) {
			case 'random_spread':
				const spacing = Json.readInt(root.spacing) ?? 1
				const separation = Json.readInt(root.separation) ?? 1
				const spreadType = StructurePlacement.SpreadType.fromJson(root.spread_type)

				return new StructurePlacement.RandomSpreadStructurePlacement(locateOffset, frequencyReductionMethod, frequency, salt, exclusionZone, spacing, separation, spreadType)
			case 'concentric_rings':
				const distance = Json.readInt(root.distance) ?? 1
				const spread = Json.readInt(root.spread) ?? 1
				const count = Json.readInt(root.count) ?? 1
				const preferredBiomes = HolderSet.parser(WorldgenRegistries.BIOME)(root.preferred_biomes)

				return new StructurePlacement.ConcentricRingsStructurePlacement(locateOffset, frequencyReductionMethod, frequency, salt, exclusionZone, distance, spread, count, preferredBiomes)
		}

		return new StructurePlacement.RandomSpreadStructurePlacement([0,0,0], StructurePlacement.FrequencyReducer.ProbabilityReducer, 1, 0, undefined, 1, 1, 'linear')
	}

	protected abstract isPlacementChunk(seed: bigint, chunkX: number, chunkZ: number): boolean

	public isStructureChunk(seed: bigint, chunkX: number, chunkZ: number): boolean {
		if (!this.isPlacementChunk(seed, chunkX, chunkZ)) {
			return false
		} else if (this.frequency < 1.0 && !this.frequencyReductionMethod(seed, this.salt, chunkX, chunkZ, this.frequency)) {
			return false
		} else if (this.exclusionZone && this.exclusionZone.isPlacementForbidden(seed, chunkX, chunkZ)) {
			return false
		} else {
			return true
		}
	}

	public abstract getPotentialStructureChunks(seed: bigint, minChunkX: number, minChunkZ: number, maxChunkX: number, maxChunkZ: number): ChunkPos[]

	public prepare(_biomeSource: BiomeSource, _sampler: Climate.Sampler, _concentricRingsSeed: bigint){}
}

export namespace StructurePlacement {
	export type FrequencyReducer = (seed: bigint, salt: number, chunkX: number, chunkZ: number, frequency: number) => boolean

	export namespace FrequencyReducer {
		export function fromType(type: string): FrequencyReducer {
			switch (type) {
				case 'legacy_type_1': return LegacyPillagerOutpostReducer
				case 'legacy_type_2': return LegacyArbitrarySaltProbabilityReducer
				case 'legacy_type_3': return LegacyProbabilityReducerWithDouble
				case 'default': default: return ProbabilityReducer
			}
		}

		export function ProbabilityReducer(seed: bigint, salt: number, chunkX: number, chunkZ: number, frequency: number): boolean {
			const random = LegacyRandom.fromLargeFeatureWithSalt(seed, salt, chunkX, chunkZ) // [sic]
			return random.nextFloat() < frequency
		}

		export function LegacyProbabilityReducerWithDouble(seed: bigint, _: number, chunkX: number, chunkZ: number, frequency: number): boolean {
			const random = LegacyRandom.fromLargeFeatureSeed(seed, chunkX, chunkZ)
			return random.nextDouble() < frequency
		}

		export function LegacyArbitrarySaltProbabilityReducer(seed: bigint, _: number, chunkX: number, chunkZ: number, frequency: number): boolean {
			const random = LegacyRandom.fromLargeFeatureWithSalt(seed, chunkX, chunkZ, 10387320)
			return random.nextFloat() < frequency
		}

		export function LegacyPillagerOutpostReducer(seed: bigint, _: number, chunkX: number, chunkZ: number, frequency: number): boolean {
			const a = chunkX >> 4
			const b = chunkZ >> 4
			const random = new LegacyRandom(BigInt(a ^ b << 4) ^ seed)
			random.nextInt()
			return random.nextInt(Math.floor(1 / frequency)) === 0
		}
	}

	export class ExclusionZone {
		constructor(
			private readonly otherSet: Holder<StructureSet>,
			private readonly chunkCount: number
		){ }

		public static fromJson(obj: unknown) {
			const root = Json.readObject(obj) ?? {}
			return new ExclusionZone(Holder.reference(StructureSet.REGISTRY, Identifier.parse(Json.readString(root.other_set) ?? '')), Json.readInt(root.chunk_count) ?? 1)
		}

		public isPlacementForbidden(seed: bigint, chunkX: number, chunkZ: number) {
			const placement = this.otherSet.value().placement
			return placement
				.getPotentialStructureChunks(seed, chunkX - this.chunkCount, chunkZ - this.chunkCount, chunkX + this.chunkCount, chunkZ + this.chunkCount)
				.findIndex((chunk) => Math.abs(chunk[0] - chunkX) <= this.chunkCount && Math.abs(chunk[1] - chunkZ) <= this.chunkCount && placement.isStructureChunk(seed, chunk[0], chunk[1])) >= 0
		}
	}

	export type SpreadType = 'linear' | 'triangular'

	export namespace SpreadType {
		export function fromJson(obj: unknown): SpreadType {
			const string = Json.readString(obj) ?? 'linear'
			if (string === 'triangular') return 'triangular'
			return 'linear'
		}
	}

	export class RandomSpreadStructurePlacement extends StructurePlacement {
		constructor(
			locateOffset: BlockPos,
			frequencyReductionMethod: StructurePlacement.FrequencyReducer,
			frequency: number,
			salt: number,
			exclusionZone: StructurePlacement.ExclusionZone | undefined,
			public readonly spacing: number,
			public readonly separation: number,
			public readonly spreadType: SpreadType
		) {
			super(locateOffset, frequencyReductionMethod, frequency, salt, exclusionZone)
		}

		private evaluateSpread(random: Random, max: number) {
			switch (this.spreadType) {
				case 'linear':
					return random.nextInt(max)
				case 'triangular':
					return Math.floor((random.nextInt(max) + random.nextInt(max)) / 2)
			}
		}

		public getPotentialStructureChunk(seed: bigint, chunkX: number, chunkZ: number): ChunkPos {
			const x = Math.floor(chunkX / this.spacing)
			const z = Math.floor(chunkZ / this.spacing)
			const random = LegacyRandom.fromLargeFeatureWithSalt(seed, x, z, this.salt)
			const maxOffset = this.spacing - this.separation
			const offsetX = this.evaluateSpread(random, maxOffset)
			const offsetZ = this.evaluateSpread(random, maxOffset)
			return [x * this.spacing + offsetX, z * this.spacing + offsetZ]
		}

		protected isPlacementChunk(seed: bigint, chunkX: number, chunkZ: number): boolean {
			const [placementX, palcementZ] = this.getPotentialStructureChunk(seed, chunkX, chunkZ)
			return placementX === chunkX && palcementZ === chunkZ
		}

		public getPotentialStructureChunks(seed: bigint, minChunkX: number, minChunkZ: number, maxChunkX: number, maxChunkZ: number): ChunkPos[] {
			const positions: ChunkPos[] = []
			for (let chunkX = Math.floor(minChunkX / this.spacing) * this.spacing; chunkX <= maxChunkX; chunkX += this.spacing){
				for (let chunkZ = Math.floor(minChunkZ / this.spacing) * this.spacing; chunkZ <= maxChunkZ; chunkZ += this.spacing){
					positions.push(this.getPotentialStructureChunk(seed, chunkX, chunkZ))
				}
			}
			return positions
		}

	}

	const SEARCH_RANGE = 112
	export class ConcentricRingsStructurePlacement extends StructurePlacement {

		private positions?: {center: ChunkPos, real: (() => ChunkPos) | ChunkPos}[]

		constructor(
			locateOffset: BlockPos,
			frequencyReductionMethod: StructurePlacement.FrequencyReducer,
			frequency: number,
			salt: number,
			exclusionZone: StructurePlacement.ExclusionZone | undefined,
			private readonly distance: number,
			private readonly spread: number,
			private readonly count: number,
			private readonly preferredBiomes: Holder<HolderSet<unknown>>
		) {
			super(locateOffset, frequencyReductionMethod, frequency, salt, exclusionZone)
		}

		public prepare(biomeSource: BiomeSource, sampler: Climate.Sampler, concentricRingsSeed: bigint){
			if (this.positions !== undefined){
				return
			}
			
			this.positions = []
			if (this.count === 0){
				return
			}

			const random = new LegacyRandom(concentricRingsSeed)
			var angle = random.nextDouble() * Math.PI * 2
			var current_spread = this.spread
			var ringNr = 0
			var posInRingNr = 0

			const preferredBiomes = [...this.preferredBiomes.value().getEntries()].flatMap(b => b.key() ?? [])

			for (var i = 0 ; i < this.count; i++){
				const current_distance = 4 * this.distance + this.distance * ringNr * 6 + (random.nextDouble() - 0.5) * this.distance * 2.5
				const chunkX = Math.round(Math.cos(angle) * current_distance)
				const chunkZ = Math.round(Math.sin(angle) * current_distance)

				const posX = (chunkX << 4) + 8
				const posZ = (chunkZ << 4) + 8

				const forkedRandom = random.fork()

				const provider: () => ChunkPos = () => {
					const searchResult = BiomeSource.findBiomeHorizontal(biomeSource, posX, 0, posZ, SEARCH_RANGE, (biome) => preferredBiomes.findIndex(b => b.equals(biome)) >= 0 , forkedRandom, sampler)
					if (searchResult){
						return [searchResult.pos[0] >> 4, searchResult.pos[2] >> 4]
					} else {
						return [chunkX, chunkZ]
					}
				}

				this.positions.push({center: [chunkX, chunkZ], real: provider })

				angle += Math.PI * 2 / current_spread
				posInRingNr++
				if (posInRingNr == current_spread){
					ringNr++
					posInRingNr = 0
					current_spread += 2 * current_spread / (ringNr + 1)
					current_spread = Math.min(current_spread, this.count - i)
					angle += random.nextDouble() * Math.PI * 2
				}
			}

		}

		protected isPlacementChunk(seed: bigint, chunkX: number, chunkZ: number): boolean {
			if (this.positions === undefined){
				console.warn('trying to access concentric rings placement before position calculation')
				return false
			}
			return this.getPotentialStructureChunks(seed, chunkX, chunkZ, chunkX, chunkZ).findIndex((p) => p[0] === chunkX && p[1] === chunkZ) >= 0
		}

		public getPotentialStructureChunks(seed: bigint, minChunkX: number, minChunkZ: number, maxChunkX: number, maxChunkZ: number): ChunkPos[] {
			if (this.positions === undefined){
				console.warn('trying to access concentric rings placement before position calculation')
				return []
			}

			const results = []
			for (const position of this.positions){
				if (position.center[0] < minChunkX - (SEARCH_RANGE >> 4)) continue
				if (position.center[0] > maxChunkX + (SEARCH_RANGE >> 4)) continue
				if (position.center[1] < minChunkZ - (SEARCH_RANGE >> 4)) continue
				if (position.center[1] > maxChunkZ + (SEARCH_RANGE >> 4)) continue

				if (position.real instanceof Function){
					position.real = position.real()
				}
				results.push(position.real)
			}

			return results
		}

	}
}
