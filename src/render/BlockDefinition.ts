import { glMatrix, mat4 } from 'gl-matrix'
import { Identifier } from '../core/index.js'
import { BlockColors } from './BlockColors.js'
import type { BlockModelProvider } from './BlockModel.js'
import { Cull } from './Cull.js'
import { Mesh } from './Mesh.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

type ModelVariant = {
	model: string,
	x?: number,
	y?: number,
	uvlock?: boolean,
}

type ModelVariantEntry = ModelVariant | (ModelVariant & {
	weight?: number,
})[]

type ModelMultiPartCondition = {
	OR: ModelMultiPartCondition[],
} | {
	[key: string]: string,
}

type ModelMultiPart = {
	when?: ModelMultiPartCondition,
	apply: ModelVariantEntry,
}

export interface BlockDefinitionProvider {
	getBlockDefinition(id: Identifier): BlockDefinition | null
}

export class BlockDefinition {
	constructor(
		private readonly variants: { [key: string]: ModelVariantEntry } | undefined,
		private readonly multipart: ModelMultiPart[] | undefined,
	) {}

	public getModelVariants(props: { [key: string]: string }): ModelVariant[] {
		if (this.variants) {
			const matches = Object.keys(this.variants).filter(v => this.matchesVariant(v, props))
			if (matches.length === 0) return []
			const variant = this.variants[matches[0]]
			return [Array.isArray(variant) ? variant[0] : variant]
		} else if (this.multipart) {
			const matches = this.multipart.filter(p => p.when ? this.matchesCase(p.when, props) : true)
			return matches.map(p => Array.isArray(p.apply) ? p.apply[0] : p.apply) 
		}
		return []
	}

	public getMesh(name: Identifier | undefined, props: { [key: string]: string }, atlas: TextureAtlasProvider, blockModelProvider: BlockModelProvider, cull: Cull) {
		const variants = this.getModelVariants(props)
		const mesh = new Mesh()

		for (const variant of variants) {
			const newCull = Cull.rotate(cull, variant.x ?? 0, variant.y ?? 0)
			const blockModel = blockModelProvider.getBlockModel(Identifier.parse(variant.model))
			if (!blockModel) {
				throw new Error(`Cannot find block model ${variant.model}`)
			}
			const tint = name ? BlockColors[name.path]?.(props) : undefined
			const variantMesh = blockModel.getMesh(atlas, newCull, tint)

			if (variant.x || variant.y) {
				const t = mat4.create()
				mat4.translate(t, t, [8, 8, 8])
				mat4.rotateY(t, t, -glMatrix.toRadian(variant.y ?? 0))
				mat4.rotateX(t, t, -glMatrix.toRadian(variant.x ?? 0))
				mat4.translate(t, t, [-8, -8, -8])
				variantMesh.transform(t)
			}
			mesh.merge(variantMesh)
		}

		const t = mat4.create()
		mat4.scale(t, t, [0.0625, 0.0625, 0.0625])
		return mesh.transform(t)
	}

	private matchesVariant(variant: string, props: { [key: string]: string }): boolean {
		return variant.split(',').every(p => {
			const [k, v] = p.split('=')
			return props[k] === v
		})
	}

	private matchesCase(condition: ModelMultiPartCondition, props: { [key: string]: string }): boolean {
		if (Array.isArray(condition.OR)) {
			return condition.OR.some(c => this.matchesCase(c, props))
		}
		const states = condition as {[key: string]: string}
		return Object.keys(states).every(k => {
			const values = states[k].split('|')
			return values.includes(props[k])
		})
	}

	public static fromJson(data: any) {
		return new BlockDefinition(data.variants, data.multipart)
	}
}
