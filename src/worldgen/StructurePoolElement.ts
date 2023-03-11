import type { PlacedBlock, Rotation } from '../core/index.js'
import { BlockPos, BlockState, Holder, Identifier, Structure } from '../core/index.js'
import type { Random } from '../math/index.js'
import { shuffle } from '../math/index.js'
import type { NbtTag } from '../nbt/index.js'
import { NbtCompound, NbtString } from '../nbt/index.js'
import { Json } from '../util/index.js'


export abstract class StructurePoolElement {
	public static fromJson(obj: unknown): StructurePoolElement{
		const root = Json.readObject(obj) ?? {}
		
		switch (Json.readString(root.element_type)?.replace(/^minecraft:/, '')) {
			case 'single_pool_element':
			case 'legacy_single_pool_element':
				const template = Holder.reference(Structure.REGISTRY, Identifier.parse(Json.readString(root.location) ?? ''))
				return new StructurePoolElement.SinlgePoolElement(template)
			case 'list_pool_element':
				const elements = Json.readArray('elements', StructurePoolElement.fromJson) ?? []
				return new StructurePoolElement.ListPoolElement(elements)
			case 'feature_pool_element':
				return new StructurePoolElement.FeaturePoolElement()
			case 'empty_pool_element':
			default:
				return new StructurePoolElement.EmptyPoolElement()
		}
	}

	public abstract getBoundingBox(pos: BlockPos, rotation: Rotation): [BlockPos, BlockPos]
	public abstract getShuffledJigsawBlocks(rotation: Rotation, random: Random): PlacedBlock[]
}

export namespace StructurePoolElement {
	export class EmptyPoolElement extends StructurePoolElement{
		public getBoundingBox(pos: BlockPos, rotation: Rotation): [BlockPos, BlockPos] {
			throw new Error('Invalid call of EmptyPoolElement')
		}

		public getShuffledJigsawBlocks(rotation: Rotation, random: Random): PlacedBlock[] {
			return []
		}

		public toString(){
			return '[Empty Pool Element]'
		}
	}

	export class FeaturePoolElement extends StructurePoolElement{
		private readonly defaultJigsawNBT: NbtCompound

		public constructor(){
			super()

			const compoundMap = new Map<string, NbtTag>()

			compoundMap.set('name', new NbtString('minecraft:bottom'))
			compoundMap.set('final_state', new NbtString('minecraft:air'))
			compoundMap.set('pool', new NbtString('minecraft:empty'))
			compoundMap.set('target', new NbtString('minecraft:empty'))
			compoundMap.set('joint', new NbtString('rollable'))

			this.defaultJigsawNBT = new NbtCompound(compoundMap)
		}

		public getBoundingBox(pos: BlockPos, rotation: Rotation): [BlockPos, BlockPos] {
			return [pos, pos]
		}

		public getShuffledJigsawBlocks(rotation: Rotation, random: Random): PlacedBlock[] {
			return [{
				pos: [0, 0, 0],
				state: new BlockState(Identifier.create('jigsaw'), {
					orientation: 'down_south',
				}),
				nbt: this.defaultJigsawNBT,
			}]
		}

		public toString(){
			return '[Feature Pool Element]'
		}
	}

	export class SinlgePoolElement extends StructurePoolElement{
		private static readonly JIGSAW_ID = Identifier.parse('jigsaw')

		public constructor(
			private readonly template: Holder<Structure>
		){
			super()
		}

		public getBoundingBox(pos: BlockPos, rotation: Rotation): [BlockPos, BlockPos] {
			const size = BlockPos.offset(this.template.value().getSize(), -1, -1, -1)

			const pos1 = pos
			const pos2 = BlockPos.add(Structure.transform(size, rotation, BlockPos.ZERO), pos)

			const minPos = BlockPos.create(Math.min(pos1[0], pos2[0]), pos1[1], Math.min(pos1[2], pos2[2]))
			const maxPos = BlockPos.create(Math.max(pos1[0], pos2[0]), pos2[1], Math.max(pos1[2], pos2[2]))

			return [minPos, maxPos]
		}

		public getShuffledJigsawBlocks(rotation: Rotation, random: Random): PlacedBlock[] {
			const blocks = this.template.value().getBlocks().filter(block => block.state.getName().equals(SinlgePoolElement.JIGSAW_ID))
			blocks.forEach(block => block.pos = Structure.transform(block.pos, rotation, BlockPos.ZERO))   // TODO? Rotate state
			shuffle(blocks, random)
			return blocks
		}

		public toString(){
			return `[Single Pool Element: ${this.template.key()}]`
		}

	}

	export class ListPoolElement extends StructurePoolElement{

		public constructor(
			private readonly elements: StructurePoolElement[]
		){
			super()
		}

		public getBoundingBox(pos: BlockPos, rotation: Rotation): [BlockPos, BlockPos] {
			var minPos = undefined
			var maxPos = undefined
			for (const element of this.elements){
				const elementBoundingBox = element.getBoundingBox(pos, rotation)
				if (!minPos || !maxPos){
					minPos = elementBoundingBox[0]
					maxPos = elementBoundingBox[1]
				} else {
					minPos[0] = Math.min(minPos[0], elementBoundingBox[0][0])
					minPos[1] = Math.min(minPos[1], elementBoundingBox[0][1])
					minPos[2] = Math.min(minPos[2], elementBoundingBox[0][2])

					maxPos[0] = Math.min(minPos[0], elementBoundingBox[1][0])
					maxPos[1] = Math.min(minPos[1], elementBoundingBox[1][1])
					maxPos[2] = Math.min(minPos[2], elementBoundingBox[1][2])
				}
			}
			return [minPos!, maxPos!]
		}

		public getShuffledJigsawBlocks(rotation: Rotation, random: Random): PlacedBlock[] {
			return this.elements[0].getShuffledJigsawBlocks(rotation, random)
		}

		public toString(){
			return `[List Pool Element: ${'; '.concat(...this.elements.map(e => e.toString()))}]`
		}

	}
}
