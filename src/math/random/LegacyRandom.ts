import { Random } from "."

export class LegacyRandom implements Random{
	private static readonly MODULUS_BITS = 48
	private static readonly MODULUS_MASK = BigInt('281474976710655')
	private static readonly MULTIPLIER = BigInt('25214903917')
	private static readonly INCREMENT = BigInt('11')
	private static readonly FLOAT_MULTIPLIER = 1 / Math.pow(2, 24)
	private static readonly DOUBLE_MULTIPLIER = 1 / Math.pow(2, 30)
	
	private seed = BigInt(0)

	constructor(seed: bigint) {
		this.setSeed(seed)
	}

	public fork() {
		return new LegacyRandom(this.nextLong())
	}

	public setSeed(seed: bigint) {
		this.seed = seed ^ LegacyRandom.MULTIPLIER & LegacyRandom.MODULUS_MASK
	}

	private advance() {
		this.seed = this.seed * LegacyRandom.MULTIPLIER + LegacyRandom.INCREMENT & LegacyRandom.MODULUS_MASK
	}

	public consume(count: number) {
		for (let i = 0; i < count; i += 1) {
			this.advance()
		}
	}

	protected next(bits: number): number {
		this.advance()
		const out = Number(this.seed >> BigInt(LegacyRandom.MODULUS_BITS - bits))
		return out > 2147483647 ? out - 4294967296 : out
	}

	public nextInt(max?: number): number {
		if (max === undefined) {
			return this.next(32)
		}
		if ((max & max - 1) == 0) { // If max is a power of two
			return Number(BigInt(max) * BigInt(this.next(31)) >> BigInt(31))
		}
		let a, b
		while ((a = this.next(31)) - (b = a % max) + (max - 1) < 0) {}
		return b
	}

	public nextLong() {
		return (BigInt(this.next(32)) << BigInt(32)) + BigInt(this.next(32))
	}

	public nextFloat(): number {
		return this.next(24) * LegacyRandom.FLOAT_MULTIPLIER
	}

	public nextDouble(): number {
		const a = this.next(30)
		this.advance()
		return a * LegacyRandom.DOUBLE_MULTIPLIER
	}
}
