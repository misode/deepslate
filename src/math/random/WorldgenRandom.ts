import { Random } from './Random'

export class WorldgenRandom extends Random {
	private count: number = 0

	public getCount() {
		return this.count
	}

	protected next(bits: number) {
		this.count += 1
		return super.next(bits)
	}
}
