import type { ChunkPos, Holder } from '../core/index.js'
import { BlockPos, HolderSet } from '../core/index.js'
import type { Random } from '../math/index.js'
import { LegacyRandom } from '../math/index.js'
import { Json } from '../util/index.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

export abstract class StructurePlacement {
	protected constructor(
		protected readonly locateOffset: BlockPos,
		protected readonly frequencyReductionMethod: StructurePlacement.FrequencyReducer,
		protected readonly frequency: number,
		protected readonly salt: number,
		protected readonly exclusionZone: StructurePlacement.ExclusionZone | undefined) {

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
}

export namespace StructurePlacement {
	export type FrequencyReducer = (seed: bigint, salt: number, chunkX: number, chunkZ: number, frequency: number) => boolean

	export namespace FrequencyReducer {
		export function fromType(type: string): FrequencyReducer {
			switch (type) {
				case 'legacy_type_1': return LegacyPillagerOutpostReducer
				case 'legacy_type_2': return LegacyArbitrarySaltProbabilityReducer
				case 'legacy_type_3': return LegacyProbabilityReducerWithDouble
				case 'default': return ProbabilityReducer
			}
			return ProbabilityReducer
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
			const a = chunkX >> 2
			const b = chunkZ >> 2
			const random = new LegacyRandom(BigInt(a ^ b << 4) ^ seed)
			random.nextInt()
			return random.nextInt(Math.floor(1 / frequency)) === 0
		}
	}

	export class ExclusionZone {
		public isPlacementForbidden(seed: bigint, chunkX: number, chunkZ: number) {
			return false // todo
		}
	}

	export namespace ExclusionZone {
		export function fromJson(obj: unknown) {
			return new ExclusionZone()
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

	export function fromJson(obj: unknown): StructurePlacement {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')

		const locateOffset = BlockPos.fromJson(root.locate_offset)
		const frequencyReductionMethod = StructurePlacement.FrequencyReducer.fromType(Json.readString(root.frequency_reduction_method) ?? 'default')
		const frequency = Json.readNumber(root.frequency) ?? 1
		const salt = Json.readInt(root.salt) ?? 0
		const exclusionZone = 'exclusion_zone' in root ? ExclusionZone.fromJson(root.exclusion_zone) : undefined

		switch (type) {
			case 'random_spread':
				const spacing = Json.readInt(root.spacing) ?? 1
				const separation = Json.readInt(root.separation) ?? 1
				const spreadType = SpreadType.fromJson(root.spread_type)

				return new RandomSpreadStructurePlacement(locateOffset, frequencyReductionMethod, frequency, salt, exclusionZone, spacing, separation, spreadType)
			case 'concentric_rings':
				const distance = Json.readInt(root.distance) ?? 1
				const spread = Json.readInt(root.spread) ?? 1
				const count = Json.readInt(root.count) ?? 1
				const preferredBiomes = HolderSet.parser(WorldgenRegistries.BIOME)(root.preferred_biomes)

				return new ConcentricRingsStructurePlacement(locateOffset, frequencyReductionMethod, frequency, salt, exclusionZone, distance, spread, count, preferredBiomes)
		}

		return new RandomSpreadStructurePlacement([0,0,0], FrequencyReducer.ProbabilityReducer, 1, 0, undefined, 1, 1, 'linear')
	}

	export class RandomSpreadStructurePlacement extends StructurePlacement {
		constructor(
			locateOffset: BlockPos,
			frequencyReductionMethod: StructurePlacement.FrequencyReducer,
			frequency: number,
			salt: number,
			exclusionZone: StructurePlacement.ExclusionZone | undefined,
			private readonly spacing: number,
			private readonly separation: number,
			private readonly spreadType: SpreadType
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

		public getPotenticalStructureChunk(seed: bigint, chunkX: number, chunkZ: number): ChunkPos {
			const x = Math.floor(chunkX / this.spacing)
			const z = Math.floor(chunkZ / this.spacing)
			const randomSeed = BigInt(x) * BigInt('341873128712') + BigInt(z) * BigInt('132897987541') + seed + BigInt(this.salt)
			const random = new LegacyRandom(randomSeed)
			const maxOffset = this.spacing - this.separation
			const offsetX = this.evaluateSpread(random, maxOffset)
			const offsetZ = this.evaluateSpread(random, maxOffset)
			return [x * this.spacing + offsetX, z * this.spacing + offsetZ]
		}

		protected isPlacementChunk(seed: bigint, chunkX: number, chunkZ: number): boolean {
			const [placementX, palcementZ] = this.getPotenticalStructureChunk(seed, chunkX, chunkZ)
			return placementX === chunkX && palcementZ === chunkZ
		}

		public getPotentialStructureChunks(seed: bigint, minChunkX: number, minChunkZ: number, maxChunkX: number, maxChunkZ: number): ChunkPos[] {
			const positions: ChunkPos[] = []
			for (let chunkX = Math.floor(minChunkX / this.spacing) * this.spacing; chunkX <= maxChunkX; chunkX += this.spacing){
				for (let chunkZ = Math.floor(minChunkZ / this.spacing) * this.spacing; chunkZ <= maxChunkZ; chunkZ += this.spacing){
					positions.push(this.getPotenticalStructureChunk(seed, chunkX, chunkZ))
				}
			}
			return positions
		}

	}

	export class ConcentricRingsStructurePlacement extends StructurePlacement {
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

		protected isPlacementChunk(seed: bigint, chunkX: number, chunkZ: number): boolean {
			return false // TODO
		}

		public getPotentialStructureChunks(seed: bigint, minChunkX: number, minChunkZ: number, maxChunkX: number, maxChunkZ: number): ChunkPos[] {
			return [] // TODO
		}

	}
}
