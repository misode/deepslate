import type { NbtTag } from '@nbt'
import type { BlockPos } from './BlockPos'
import type { BlockState } from './BlockState'

export type BlockNbt = { [key: string]: NbtTag }

export interface StructureProvider {
	getSize(): BlockPos
	getBlocks(): { pos: BlockPos, state: BlockState, nbt: BlockNbt | undefined }[]
	getBlock(pos: BlockPos): { pos: BlockPos, state: BlockState, nbt: BlockNbt | undefined } | null
}
