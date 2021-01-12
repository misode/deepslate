import { BlockState } from "./BlockState";
import { NamedNbtTag, NbtTag, read, readListTag, readOptional, readTag } from "./NbtUtil";

export type BlockPos = [number, number, number]

export class Structure {
  constructor(
    private size: BlockPos,
    private palette: BlockState[] = [],
    private blocks: { pos: BlockPos, state: number }[] = []
  ) {}

  public getSize() {
    return this.size
  }

  public addBlock(pos: BlockPos, name: string, properties?: { [key: string]: string }) {
    const blockState = new BlockState(name, properties)
    let state = this.palette.findIndex(b => b.equals(blockState))
    if (state === -1) {
      state = this.palette.length
      this.palette.push(blockState)
    }
    this.blocks.push({ pos, state })
    return this
  }

  public getBlocks() {
    return this.blocks.map(b => ({
      pos: b.pos,
      state: this.palette[b.state]
    }))
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
        return { pos, state }
      })
    return new Structure(size, palette, blocks)
  }
}
