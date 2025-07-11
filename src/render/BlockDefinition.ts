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
	OR?: ModelMultiPartCondition[],
	AND?: ModelMultiPartCondition[],
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
			return [this.weightedApply(variant)]
		} else if (this.multipart) {
			const matches = this.multipart.filter(p => p.when ? this.matchesCase(p.when, props) : true)
			return matches.map(p => this.weightedApply(p.apply)) 
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

	private weightedApply(apply: ModelVariantEntry) {
		if (Array.isArray(apply)) {
			// Sets the probability of the model for being used in the game,
			// defaults to 1 (=100%). If more than one model is used for the same
			// variant, the probability is calculated by dividing the individual
			// model's weight by the sum of the weights of all models.
			// (For example, if three models are used with weights 1, 1, and 2,
			// then their combined weight would be 4 (1+1+2). The probability of each
			// model being used would then be determined by dividing each weight
			// by 4: 1/4, 1/4 and 2/4, or 25%, 25% and 50%, respectively.)

			const totalWeight: number = apply
					.reduce((sum, entry) => sum + (entry.weight ?? 1), 0);
			let r: number = Math.random() * totalWeight;

			// Iterate through the entries, subtracting weight until we find the selected one
			for (const entry of apply) {
					const w: number = entry.weight ?? 1;
					if (r < w) {
							// Destructure to drop the weight property and return the variant
							const { weight, ...variant }: { weight?: number } & ModelVariant = entry;
							return variant;
					}
					r -= w;
			}

			// Fallback (due to floating-point edge cases): return the last variant
			const lastEntry = apply[apply.length - 1];
			const { weight, ...variant }: { weight?: number } & ModelVariant = lastEntry;
			return variant;
		} else {
			return apply
		}
	}

	private matchesVariant(variant: string, props: { [key: string]: string }): boolean {
		return variant.split(',').every(p => {
			const [k, v] = p.split('=')
			return props[k] === v
		})
	}

	private matchesCase(condition: ModelMultiPartCondition, props: { [key: string]: string }): boolean {
		if (condition.OR && Array.isArray(condition.OR)) {
			return condition.OR.some(c => this.matchesCase(c, props))
		} else if (condition.AND && Array.isArray(condition.AND)) {
			return condition.AND.every(c => this.matchesCase(c, props))
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
