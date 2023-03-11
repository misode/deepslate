import { Holder, Registry } from '../core/index.js'
import type { Random } from '../math/index.js'
import { Json } from '../util/index.js'
import { StructurePoolElement } from './StructurePoolElement.js'

export class StructureTemplatePool{
	private readonly totalWeight: number

	public constructor(
		public rawTemplates: {
			element: StructurePoolElement,
			weight: number,
		}[],
		public fallback: Holder<StructureTemplatePool>
	){
		this.totalWeight = rawTemplates.reduce((v, e) => v + e.weight, 0)
	}

	public getRandomTemplate(random: Random): StructurePoolElement {
		var v = random.nextInt(this.totalWeight)
		for (const entry of this.rawTemplates){
			v -= entry.weight
			if (v < 0){
				return entry.element
			}
		}
		return this.rawTemplates[this.rawTemplates.length - 1].element
	}
}

export namespace StructureTemplatePool{
	export const REGISTRY = Registry.register<StructureTemplatePool>('worldgen/template_pool', fromJson)

	const structurePoolParser: (obj: unknown) => Holder<StructureTemplatePool> = Holder.parser<StructureTemplatePool>(REGISTRY, fromJson)

	export function fromJson(obj: unknown){
		const root = Json.readObject(obj) ?? {}
		const fallback = structurePoolParser(root.fallback)
		const elements = Json.readArray(root.elements, (obj) => {
			const root = Json.readObject(obj) ?? {}
			const element = StructurePoolElement.fromJson(root.element)
			const weight = Json.readInt(root.weight) ?? 1
			return {element, weight}
		}) ?? []
		return new StructureTemplatePool(elements, fallback)
	}
}
