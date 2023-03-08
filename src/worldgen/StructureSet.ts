import { Holder, Identifier } from '../core/index.js'
import { LegacyRandom } from '../math/index.js'
import { Json } from '../util/index.js'
import type { BiomeSource, Climate } from './biome/index.js'
import { StructurePlacement } from './StructurePlacement.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'
import type { WorldgenStructure } from './WorldgenStructure.js'

export class StructureSet {
	constructor(
		public readonly structures: StructureSet.StructureSelectionEntry[],
		public readonly placement: StructurePlacement
	) { }

	public getStructureInChunk(seed: bigint, chunkX: number, chunkZ: number, biomeSource: BiomeSource, sampler: Climate.Sampler, context: WorldgenStructure.GenerationContext): Identifier | undefined {
		if (!this.placement.isStructureChunk(seed, chunkX, chunkZ)) {
			return undefined
		}

		if (this.structures.length === 0) return undefined

		if (this.structures.length === 1) {
			if (this.structures[0].structure.value().tryGenerate(seed, chunkX, chunkZ, biomeSource, sampler, context)) {
				return this.structures[0].structure.key()
			}
		} else {

			const random = LegacyRandom.fromLargeFeatureSeed(seed, chunkX, chunkZ)

			const list: StructureSet.StructureSelectionEntry[] = Object.assign([], this.structures)
			let totalWeight = list.reduce((v, e, i) => v + e.weight, 0)

			while (list.length > 0) {
				let weightIndex = random.nextInt(totalWeight)
				let id: number
				let entry: StructureSet.StructureSelectionEntry
				for ([id, entry] of list.entries()) {
					weightIndex -= entry.weight
					if (weightIndex < 0) {
						break
					}
				}

				if (entry!.structure.value().tryGenerate(seed, chunkX, chunkZ, biomeSource, sampler, context)) {
					return entry!.structure.key()
				}

				list.splice(id!, 1)
				totalWeight -= entry!.weight
			}
		}

		return undefined
	}
}

export namespace StructureSet {
	export function fromJson(obj: unknown): StructureSet {
		const root = Json.readObject(obj) ?? {}
		const structures = Json.readArray(root.structures, (StructureSelectionEntry.fromJson)) ?? []
		const placement = StructurePlacement.fromJson(root.placement)
		return new StructureSet(structures, placement)
	}

	export class StructureSelectionEntry {
		constructor(
			public readonly structure: Holder<WorldgenStructure>,
			public readonly weight: number
		) { }
	}

	export namespace StructureSelectionEntry {
		export function fromJson(obj: unknown) {
			const root = Json.readObject(obj) ?? {}
			return new StructureSelectionEntry(Holder.reference(WorldgenRegistries.STRUCTURE, Identifier.parse(Json.readString(root.structure) ?? 'minecraft:empty')), Json.readInt(root.weight) ?? 1)
		}
	}
}
