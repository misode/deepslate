import { glMatrix, mat4 } from 'gl-matrix'
import type { BlockModelProvider, Cull } from './BlockModel'
import type { TextureAtlasProvider } from './TextureAtlas'
import { mergeFloat32Arrays, rotateCull, transformVectors } from './Util'

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
	getBlockDefinition(id: string): BlockDefinition | null
}

export class BlockDefinition {
	constructor(
		private readonly id: string,
		private readonly variants: { [key: string]: ModelVariantEntry } | undefined,
		private readonly multipart: ModelMultiPart[] | undefined,
	) {
		this.variants = variants
	}

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

	public getBuffers(name: string, props: { [key: string]: string }, textureUVProvider: TextureAtlasProvider, blockModelProvider: BlockModelProvider, offset: number, cull: Cull) {
		const variants = this.getModelVariants(props)

		const position: Float32Array[] = []
		const texCoord: number[] = []
		const tintColor: number[] = []
		const index: number[] = []

		for (const variant of variants) {
			const newCull = rotateCull(cull, variant.x ?? 0, variant.y ?? 0)
			const buffers = blockModelProvider.getBlockModel(variant.model)!.getBuffers(name, props, textureUVProvider, offset, newCull)

			if (variant.x || variant.y) {
				const t = mat4.create()
				mat4.identity(t)
				mat4.translate(t, t, [8, 8, 8])
				mat4.rotateY(t, t, -glMatrix.toRadian(variant.y ?? 0))
				mat4.rotateX(t, t, -glMatrix.toRadian(variant.x ?? 0))
				mat4.translate(t, t, [-8, -8, -8])
				transformVectors(buffers.position, t)
			}

			position.push(buffers.position)
			texCoord.push(...buffers.texCoord)
			tintColor.push(...buffers.tintColor)
			index.push(...buffers.index)
			offset += buffers.texCoord.length / 2
		}

		const t = mat4.create()
		mat4.identity(t)
		mat4.scale(t, t, [0.0625, 0.0625, 0.0625])
		const positions = mergeFloat32Arrays(...position)
		transformVectors(positions, t)

		return {
			position: positions,
			texCoord,
			tintColor,
			index,
		}
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

	public static fromJson(id: string, data: any) {
		return new BlockDefinition(id, data.variants, data.multipart)
	}
}
