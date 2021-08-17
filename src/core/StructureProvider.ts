import { NbtTag } from "../nbt";
import { BlockState } from "./BlockState";

export type BlockPos = [number, number, number]
export type BlockNbt = { [key: string]: NbtTag }

export interface StructureProvider {
  getSize(): BlockPos
  getBlocks(): { pos: BlockPos; state: BlockState; nbt: BlockNbt | undefined }[]
  getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt: BlockNbt | undefined } | null
}
