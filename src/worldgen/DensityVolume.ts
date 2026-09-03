export class DensityVolume {
	constructor(
		public readonly sizeX: number,
		public readonly sizeY: number,
		public readonly sizeZ: number,
		public readonly minBlockX: number,
		public readonly minBlockY: number,
		public readonly minBlockZ: number,
		public readonly stepBlockX: number = 1,
		public readonly stepBlockY: number = 1,
		public readonly stepBlockZ: number = 1,
	) {}

	public indexUnchecked(indexX: number, indexY: number, indexZ: number) {
		return indexY + (indexX + indexZ * this.sizeX) * this.sizeY
	}

	public blockX(x: number) {
		return this.minBlockX + x * this.stepBlockX
	}

	public blockY(y: number) {
		return this.minBlockY + y * this.stepBlockY
	}

	public blockZ(z: number) {
		return this.minBlockZ + z * this.stepBlockZ
	}

	public maxBlockX() {
		return this.minBlockX + this.sizeX * this.stepBlockX - 1
	}

	public maxBlockY() {
		return this.minBlockY + this.sizeY * this.stepBlockY - 1
	}

	public maxBlockZ() {
		return this.minBlockZ + this.sizeZ * this.stepBlockZ - 1
	}

	public size() {
		return this.sizeX * this.sizeY * this.sizeZ
	}
}
