import { BlockState } from "./BlockState";
import { NamedNbtTag, NbtTag, read, readListTag, readOptional, readTag } from "./NbtUtil";

export type BlockPos = [number, number, number]

type CompoundNbt = { [key: string]: NbtTag }

export class Structure {
  constructor(
    private size: BlockPos,
    private palette: BlockState[] = [],
    private blocks: { pos: BlockPos, state: number, nbt?: CompoundNbt }[] = []
  ) {}

  public getSize() {
    return this.size
  }

  public addBlock(pos: BlockPos, name: string, properties?: { [key: string]: string }, nbt?: CompoundNbt) {
    const blockState = new BlockState(name, properties)
    let state = this.palette.findIndex(b => b.equals(blockState))
    if (state === -1) {
      state = this.palette.length
      this.palette.push(blockState)
    }
    this.blocks.push({ pos, state, nbt })
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
    const block = this.blocks.find(b => b.pos[0] === pos[0] && b.pos[1] === pos[1] && b.pos[2] === pos[2])
    if (!block) return null
    return {
      pos: block.pos,
      state: this.palette[block.state],
      nbt: block.nbt
    }
  }

  public static fromNbt(nbt: NamedNbtTag) {
    const size = readListTag(nbt.value, 'size', 'int', 3) as BlockPos
    const palette = readListTag(nbt.value, 'palette', 'compound')
      .map(tags => {
        const name = readTag(tags, 'Name', 'string') as string
        const propsTag = readOptional(() => readTag(tags, 'Properties', 'compound') as {[name: string]: NbtTag
        }, {})
        const properties = Object.keys(propsTag)
          .reduce((acc, k) => ({...acc, [k]: read(propsTag[k], 'string', k)}), {})
        return new BlockState(name, properties)
      })
    const blocks = readListTag(nbt.value, 'blocks', 'compound')
      .map(tags => {
        const pos = readListTag(tags, 'pos', 'int', 3) as BlockPos
        const state = readTag(tags, 'state', 'int') as number
        const nbt = readOptional(() => readTag(tags, 'nbt', 'compound') as CompoundNbt, undefined)
        return { pos, state, nbt }
      })
    return new Structure(size, palette, blocks)
  }
}
