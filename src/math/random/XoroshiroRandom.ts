import md5 from 'md5'
import { getSeed, longfromBytes } from '../Util'
import type { PositionalRandom, Random } from './Random'

export class XoroshiroRandom implements Random {
	private static readonly SILVER_RATIO_64 = BigInt('7640891576956012809')
	private static readonly GOLDEN_RATIO_64 = BigInt('-7046029254386353131')
	private static readonly FLOAT_MULTIPLIER = 1 / Math.pow(2, 24)
	private static readonly DOUBLE_MULTIPLIER = 1.1102230246251565E-16

	private seed: [bigint, bigint] = [BigInt(0), BigInt(0)]

	constructor(seed: [bigint, bigint]) {
		this.seed = seed
	}

	public static create(seed: bigint) {
		return new XoroshiroRandom(XoroshiroRandom.upgradeSeedTo128bit(seed))
	}

	private static mixStafford13(value: bigint): bigint {
		value = ((value ^ value >> BigInt(30)) * BigInt('-4658895280553007687')) & BigInt('0xFFFFFFFFFFFFFFFF') 
		value = ((value ^ value >> BigInt(27)) * BigInt('-7723592293110705685')) & BigInt('0xFFFFFFFFFFFFFFFF')
		return (value ^ value >> BigInt(31)) & BigInt('0xFFFFFFFFFFFFFFFF')
	}

	private static upgradeSeedTo128bit(seed: bigint): [bigint, bigint] {
		if (seed < 0) {
			seed += BigInt('0x10000000000000000')	
		}
		const seedLo = seed ^ XoroshiroRandom.SILVER_RATIO_64
		const seedHi = (seedLo + XoroshiroRandom.GOLDEN_RATIO_64) & BigInt('0xFFFFFFFFFFFFFFFF')
		return [XoroshiroRandom.mixStafford13(seedLo), XoroshiroRandom.mixStafford13(seedHi)]
	}

	public static rotateLeft(value: bigint, shift: bigint): bigint {
		return (value << shift) & (BigInt('0xFFFFFFFFFFFFFFFF')) | (value >> (BigInt(64) - shift))
	}

	setSeed(seed: bigint) {
		this.seed = XoroshiroRandom.upgradeSeedTo128bit(seed)
	}

	public fork() {
		return new XoroshiroRandom([this.next(), this.next()])
	}

	public forkPositional() {
		return new XoroshiroPositionalRandom(this.next(), this.next())
	}

	public next(): bigint {
		const seedLo = this.seed[0]
		let seedHi = this.seed[1]
		const value = (XoroshiroRandom.rotateLeft((seedLo + seedHi) & BigInt('0xFFFFFFFFFFFFFFFF'), BigInt(17)) + seedLo) & BigInt('0xFFFFFFFFFFFFFFFF')

		seedHi ^= seedLo
		this.seed = [
			XoroshiroRandom.rotateLeft(seedLo, BigInt(49)) ^ seedHi ^ ((seedHi << BigInt(21)) & BigInt('0xFFFFFFFFFFFFFFFF') ),
			XoroshiroRandom.rotateLeft(seedHi, BigInt(28)),
		]

		return value
	}

	public nextLong(): bigint {
		let value = this.next()

		if (value > BigInt('0x8000000000000000'))
			value -= BigInt('0x10000000000000000')

		return value
	}

	public consume(count: number) {
		let seedLo = this.seed[0]
		let seedHi = this.seed[1]
		for (let i = 0; i < count; i += 1) {
			seedHi ^= seedLo
			seedLo = XoroshiroRandom.rotateLeft(seedLo, BigInt(49)) ^ seedHi ^ seedHi << BigInt(21)
			seedHi = XoroshiroRandom.rotateLeft(seedHi, BigInt(28))
		}

		this.seed = [seedLo, seedHi]
	}

	private nextBits(bits: number) {
		return this.next() >> (BigInt(64 - bits))
	}

	public nextInt(max?: number): number {
		let value = this.next() & BigInt(0xFFFFFFFF)
		if (!max) {
			let result = Number(value)
			if (result >= 0x80000000) {
				result -= 0x100000000
			}

			return result
		} else {
			const maxBigint = BigInt(max)
			let product = value * maxBigint
			let productLo = product & BigInt(0xFFFFFFFF)
			if (productLo < maxBigint) {
				const newMax = ((~maxBigint & BigInt(0xFFFFFFFF)) + BigInt(1)) % maxBigint
				while (productLo < newMax) {
					value = this.next() & BigInt(0xFFFFFFFF)
					product = value * maxBigint 
					productLo = product & BigInt(0xFFFFFFFF)
				}
			}

			const productHi = product >> BigInt(32)
			return Number(productHi)
		}
	}

	public nextFloat(): number {
		return Number(this.nextBits(24)) * XoroshiroRandom.FLOAT_MULTIPLIER
	}
	
	public nextDouble(): number {
		return Number(this.nextBits(53)) * XoroshiroRandom.DOUBLE_MULTIPLIER
	}

	public parityConfigString(): string {
		return 'seedLo: ' + this.seed[0] + ', seedHi: ' + this.seed[1]
	}
}

export class XoroshiroPositionalRandom implements PositionalRandom {
	constructor(
		private readonly seedLo: bigint,
		private readonly seedHi: bigint,
	) {}

	public at(x: number, y: number, z: number) {
		const positionSeed = getSeed(x, y, z)
		const seedLo = positionSeed ^ this.seedLo
		return new XoroshiroRandom([seedLo, this.seedHi])
	}

	public fromHashOf(name: string) {
		const hash = md5(name, { asBytes: true })
		const lo = longfromBytes(hash[0], hash[1], hash[2], hash[3], hash[4], hash[5], hash[6], hash[7])
		const hi = longfromBytes(hash[8], hash[9], hash[10], hash[11], hash[12], hash[13], hash[14], hash[15])
		return new XoroshiroRandom([lo ^ this.seedLo, hi ^ this.seedHi])
	}
}
