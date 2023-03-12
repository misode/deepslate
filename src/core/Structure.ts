import type { NbtCompound } from '../nbt/index.js'
import { NbtType } from '../nbt/index.js'
import { BlockPos } from './BlockPos.js'
import { BlockState } from './BlockState.js'
import type { Identifier } from './Identifier.js'
import { Registry } from './Registry.js'
import { Rotation } from './Rotation.js'
import type { StructureProvider } from './StructureProvider.js'

type StoredBlock = { pos: BlockPos, state: number, nbt?: NbtCompound }
export type PlacedBlock = { pos: BlockPos, state: BlockState, nbt?: NbtCompound }

export class Structure implements StructureProvider {
	public static readonly REGISTRY = Registry.createAndRegister<Structure>('structures')

	public static readonly EMPTY = new Structure(BlockPos.ZERO)

	private blocksMap: StoredBlock[] = []

	constructor(
		private readonly size: BlockPos,
		private readonly palette: BlockState[] = [],
		private readonly blocks: StoredBlock[] = []
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

	public addBlock(pos: BlockPos, name: Identifier | string, properties?: { [key: string]: string }, nbt?: NbtCompound) {
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
		return this.blocks.map(b => this.toPlacedBlock(b))
	}

	public getBlock(pos: BlockPos): PlacedBlock | null {
		if (!this.isInside(pos)) return null
		const block = this.blocksMap[pos[0] * this.size[1] * this.size[2] + pos[1] * this.size[2] + pos[2]]
		if (!block) return null
		return this.toPlacedBlock(block)
	}

	private toPlacedBlock(block: StoredBlock): PlacedBlock {
		const state = this.palette[block.state]
		if (!state) {
			throw new Error(`Block at ${block.pos.join(' ')} in structure references invalid palette index ${block.state}`)
		}
		return {
			pos: block.pos,
			state: state,
			nbt: block.nbt,
		}
	}

	public isInside(pos: BlockPos) {
		return pos[0] >= 0 && pos[0] < this.size[0]
			&& pos[1] >= 0 && pos[1] < this.size[1]
			&& pos[2] >= 0 && pos[2] < this.size[2]
	}

	public static fromNbt(nbt: NbtCompound) {
		const size = BlockPos.fromNbt(nbt.getList('size'))
		const palette = nbt.getList('palette', NbtType.Compound).map(tag => BlockState.fromNbt(tag))
		const blocks = nbt.getList('blocks', NbtType.Compound).map(tag => {
			const pos = BlockPos.fromNbt(tag.getList('pos'))
			const state = tag.getNumber('state')
			const nbt = tag.getCompound('nbt')
			return { pos, state, nbt: nbt.size > 0 ? nbt : undefined }
		})
		return new Structure(size, palette, blocks)
	}

	public static transform(pos: BlockPos, rotation: Rotation, pivot: BlockPos) {
		switch (rotation) {
			case Rotation.COUNTERCLOCKWISE_90:
				return BlockPos.create(pivot[0] - pivot[2] + pos[2], pos[1], pivot[0] + pivot[2] - pos[0])
			case Rotation.CLOCKWISE_90:
				return BlockPos.create(pivot[0] + pivot[2] - pos[2], pos[1], pivot[2] - pivot[0] + pos[0])
			case Rotation.CLOCKWISE_180:
				return BlockPos.create(pivot[0] + pivot[0] - pos[0], pos[1], pivot[2] + pivot[2] - pos[2])
			default:
				return pos
		}
	}
}
