import { NamedNbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { BlockState } from "./BlockState";
import { StructureProvider, BlockPos, BlockNbt } from "./StructureProvider";

export class Structure implements StructureProvider {
  private blocksMap: { pos: BlockPos, state: number, nbt?: BlockNbt }[] = []

  constructor(
    private size: BlockPos,
    private palette: BlockState[] = [],
    private blocks: { pos: BlockPos, state: number, nbt?: BlockNbt }[] = []
  ) {
    blocks.forEach(block => {
      this.blocksMap[block.pos[0] * size[1] * size[2] + block.pos[1] * size[2] + block.pos[2]] = block
    });
  }

  public getSize() {
    return this.size
  }

  public addBlock(pos: BlockPos, name: string, properties?: { [key: string]: string }, nbt?: BlockNbt) {
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

  public getBlocks() {
    return this.blocks.map(b => ({
      pos: b.pos,
      state: this.palette[b.state],
      nbt: b.nbt
    }))
  }

  public getBlock(pos: BlockPos) {
    if (pos[0] < 0 || pos[1] < 0 || pos[2] < 0 || pos[0] >= this.size[0] || pos[1] >= this.size[1] || pos[2] >= this.size[2])
      return null


    const block = this.blocksMap[pos[0] * this.size[1] * this.size[2] + pos[1] * this.size[2] + pos[2]]
//    const block = this.blocks.find(b => b.pos[0] === pos[0] && b.pos[1] === pos[1] && b.pos[2] === pos[2])
    if (!block) return null
    return {
      pos: block.pos,
      state: this.palette[block.state],
      nbt: block.nbt
    }
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
