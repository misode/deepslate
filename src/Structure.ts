import { BlockState } from "./BlockState";

export type BlockPos = [number, number, number]

export class Structure {
  constructor(
    private size: BlockPos,
    private palette: BlockState[] = [],
    private blocks: { pos: BlockPos, state: number }[] = []
  ) {}

  getSize() {
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
}
