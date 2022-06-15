import type { NbtTag } from '../nbt/index.js'
import type { BlockPos } from './BlockPos.js'
import type { BlockState } from './BlockState.js'

export type BlockNbt = { [key: string]: NbtTag }

export interface StructureProvider {
	getSize(): BlockPos
	getBlocks(): { pos: BlockPos, state: BlockState, nbt: BlockNbt | undefined }[]
	getBlock(pos: BlockPos): { pos: BlockPos, state: BlockState, nbt: BlockNbt | undefined } | null
}
