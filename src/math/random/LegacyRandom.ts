import md5 from 'md5'
import { getSeed, longfromBytes } from '../Util.js'
import type { PositionalRandom, Random } from './Random.js'

export class LegacyRandom implements Random {
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

	public static fromLargeFeatureSeed(worldSeed: bigint, x: number, z: number): LegacyRandom {
		const random = new LegacyRandom(worldSeed)
		const a = random.nextLong()
		const b = random.nextLong()
		const seed = BigInt(x) * a ^ BigInt(z) * b ^ worldSeed
		random.setSeed(seed)
		return random
	}

	public static fromLargeFeatureWithSalt(worldSeed: bigint, x: number, z: number, salt: number): LegacyRandom {
		const seed = BigInt(x) * BigInt('341873128712') + BigInt(z) * BigInt('132897987541') + worldSeed + BigInt(salt)
		return new LegacyRandom(seed)
	}

	public fork() {
		return new LegacyRandom(this.nextLong())
	}

	public forkPositional() {
		return new LegacyPositionalRandom(this.nextLong())
	}

	public setSeed(seed: bigint) {
		this.seed = (seed ^ LegacyRandom.MULTIPLIER) & LegacyRandom.MODULUS_MASK
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

export class LegacyPositionalRandom implements PositionalRandom {
	constructor(
		private readonly seed: bigint,
	) { }

	public at(x: number, y: number, z: number) {
		const seed = getSeed(x, y, z)
		return new LegacyRandom(seed ^ this.seed)
	}

	public fromHashOf(name: string) {
		const hash = md5(name, { asBytes: true })
		const seed = longfromBytes(hash[0], hash[1], hash[2], hash[3], hash[4], hash[5], hash[6], hash[7])
		return new LegacyRandom(seed ^ this.seed)
	}

	seedKey(): [bigint, bigint] {
		return [this.seed, BigInt(0)]
	}
}
