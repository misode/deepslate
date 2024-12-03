import type { BlockPos } from '../../core/index.js'
import { Holder, Identifier, Registry } from '../../core/index.js'
import { LegacyRandom } from '../../math/index.js'
import { Json } from '../../util/index.js'
import { StructurePlacement } from './StructurePlacement.js'
import { WorldgenStructure } from './WorldgenStructure.js'

export class StructureSet {
	public static readonly REGISTRY = Registry.createAndRegister('worldgen/structure_set', StructureSet.fromJson)

	constructor(
		public readonly structures: StructureSet.StructureSelectionEntry[],
		public readonly placement: StructurePlacement
	) { }

	public static fromJson(obj: unknown): StructureSet {
		const root = Json.readObject(obj) ?? {}
		const structures = Json.readArray(root.structures, (StructureSet.StructureSelectionEntry.fromJson)) ?? []
		const placement = StructurePlacement.fromJson(root.placement)
		return new StructureSet(structures, placement)
	}

	public getStructureInChunk(chunkX: number, chunkZ: number, context: WorldgenStructure.GenerationContext): {id: Identifier, pos: BlockPos} | undefined {
		this.placement.prepare(context.biomeSource, context.randomState.sampler, context.seed)

		if (!this.placement.isStructureChunk(context.seed, chunkX, chunkZ)) {
			return undefined
		}

		if (this.structures.length === 0) return undefined

		if (this.structures.length === 1) {
			const pos = this.structures[0].structure.value().tryGenerate(chunkX, chunkZ, context)
			if (pos !== undefined) {
				return {id: this.structures[0].structure.key()!, pos}
			}
		} else {

			const random = LegacyRandom.fromLargeFeatureSeed(context.seed, chunkX, chunkZ)

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

				const pos = entry!.structure.value().tryGenerate(chunkX, chunkZ, context)
				if (pos !== undefined) {
					return {id: entry!.structure.key()!, pos}
				}

				list.splice(id!, 1)
				totalWeight -= entry!.weight
			}
		}

		return undefined
	}
}

export namespace StructureSet {
	export class StructureSelectionEntry {
		constructor(
			public readonly structure: Holder<WorldgenStructure>,
			public readonly weight: number
		) { }

		public static fromJson(obj: unknown) {
			const root = Json.readObject(obj) ?? {}
			return new StructureSelectionEntry(Holder.reference(WorldgenStructure.REGISTRY, Identifier.parse(Json.readString(root.structure) ?? 'minecraft:empty')), Json.readInt(root.weight) ?? 1)
		}
	}
}
