import type { NamedNbtTag } from '@nbt'
import { getListTag, getOptional, getTag } from '@nbt/TagUtils'
import type { BlockPos } from './BlockPos'
import { BlockState } from './BlockState'
import type { Identifier } from './Identifier'
import type { BlockNbt, StructureProvider } from './StructureProvider'

export type PlacedBlock = { pos: BlockPos, state: BlockState, nbt: BlockNbt | undefined }

export class Structure implements StructureProvider {
	private blocksMap: { pos: BlockPos, state: number, nbt?: BlockNbt }[] = []

	constructor(
		private readonly size: BlockPos,
		private readonly palette: BlockState[] = [],
		private readonly blocks: { pos: BlockPos, state: number, nbt?: BlockNbt }[] = []
	) {
		blocks.forEach(block => {
			if (!this.isInside(block.pos)) {
				throw new Error(`Found block at ${block.pos} which is outside the structure bounds ${this.size}`)
			}
			this.blocksMap[block.pos[0] * size[1] * size[2] + block.pos[1] * size[2] + block.pos[2]] = block
		})
	}

	public getSize() {
		return this.size
	}

	public addBlock(pos: BlockPos, name: Identifier | string, properties?: { [key: string]: string }, nbt?: BlockNbt) {
		if (!this.isInside(pos)) {
			throw new Error(`Cannot add block at ${pos} outside the structure bounds ${this.size}`)
		}
		const blockState = new BlockState(name, properties)
		let state = this.palette.findIndex(b => b.equals(blockState))
		if (state === -1) {
			state = this.palette.length
			this.palette.push(blockState)
		}
		this.blocks.push({ pos, state, nbt })
		this.blocksMap[pos[0] * this.size[1] * this.size[2] + pos[1] * this.size[2] + pos[2]] = { pos, state, nbt }    
		return this
	}

	public getBlocks(): PlacedBlock[] {
		return this.blocks.map(b => ({
			pos: b.pos,
			state: this.palette[b.state],
			nbt: b.nbt,
		}))
	}

	public getBlock(pos: BlockPos): PlacedBlock | null {
		if (!this.isInside(pos)) return null
		const block = this.blocksMap[pos[0] * this.size[1] * this.size[2] + pos[1] * this.size[2] + pos[2]]
		if (!block) return null
		const placedBlock = {
			pos: block.pos,
			state: this.palette[block.state],
			nbt: block.nbt,
		}
		return placedBlock
	}

	public isInside(pos: BlockPos) {
		return pos[0] >= 0 && pos[0] < this.size[0]
			&& pos[1] >= 0 && pos[1] < this.size[1]
			&& pos[2] >= 0 && pos[2] < this.size[2]
	}

	public static fromNbt(nbt: NamedNbtTag) {
		const size = getListTag(nbt.value, 'size', 'int', 3) as BlockPos
		const palette = getListTag(nbt.value, 'palette', 'compound')
			.map(tags => BlockState.fromNbt({name: '', value: tags}))
		const blocks = getListTag(nbt.value, 'blocks', 'compound')
			.map(tags => {
				const pos = getListTag(tags, 'pos', 'int', 3) as BlockPos
				const state = getTag(tags, 'state', 'int')
				const nbt = getOptional(() => getTag(tags, 'nbt', 'compound'), undefined)
				return { pos, state, nbt }
			})
		return new Structure(size, palette, blocks)
	}
}
