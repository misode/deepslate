import md5 from "md5";
import { Random } from ".";

export class XoroshiroRandom implements Random {
	private static readonly SILVER_RATIO_64 = BigInt('7640891576956012809');
	private static readonly GOLDEN_RATIO_64 = BigInt('-7046029254386353131');
	private static readonly FLOAT_MULTIPLIER = 1 / Math.pow(2, 24)
	private static readonly DOUBLE_MULTIPLIER = 1 / Math.pow(2, 30)

	private seed: [bigint, bigint] = [BigInt(0), BigInt(0)]

	constructor(seed: [bigint, bigint]) {
		this.seed = seed
	}

	public static create(seed: bigint){
		return new XoroshiroRandom(XoroshiroRandom.upgradeSeedTo128bit(seed))
	}

	private static mixStafford13(value: bigint): bigint {
		value = (value ^ value >> BigInt(30)) * BigInt('-4658895280553007687');
		value = (value ^ value >> BigInt(27)) * BigInt('-7723592293110705685');
		return value ^ value >> BigInt(31);
	}

	private static upgradeSeedTo128bit(seed: bigint): [bigint, bigint] {
		const seedLo = seed ^ XoroshiroRandom.SILVER_RATIO_64;
		const seedHi = seedLo + XoroshiroRandom.GOLDEN_RATIO_64;
		return [XoroshiroRandom.mixStafford13(seedLo), XoroshiroRandom.mixStafford13(seedHi)];
	}

	private static rotateLeft(value: bigint, shift: bigint): bigint {
		return (value << shift) && (BigInt("0xFFFFFFFFFFFFFFFF")) | (value >> (BigInt(64) - shift))
	}

	setSeed(seed: bigint) {
		this.seed = XoroshiroRandom.upgradeSeedTo128bit(seed);
	}

	public fork(){
		return new XoroshiroRandom([this.nextLong(), this.nextLong()]);
	}

	private static getSeed(x: bigint, y: bigint, z: bigint) {
		let p = (x * BigInt(3129871)) ^ (z * BigInt(116129781) ^ y);
		p = p * p * BigInt(42317861) + p * BigInt(11);
		return p >> BigInt(16);
	 }
  

	public forkAt(x: bigint, y: bigint, z: bigint){
		const positionSeed = XoroshiroRandom.getSeed(x, y, z);
		const seedLo = positionSeed ^ this.seed[0];
		return new XoroshiroRandom([seedLo, this.seed[1]]);
	}

	private static LongfromBytes(b1: number, b2: number, b3: number, b4: number, b5: number, b6: number, b7: number, b8: number): bigint {
	  return BigInt(b1 & 0xFF) << BigInt(56)
		  | BigInt(b2 & 0xFF) << BigInt(48)
		  | BigInt(b3 & 0xFF) << BigInt(40)
		  | BigInt(b4 & 0xFF) << BigInt(32)
		  | BigInt(b5 & 0xFF) << BigInt(24)
		  | BigInt(b6 & 0xFF) << BigInt(16)
		  | BigInt(b7 & 0xFF) << BigInt(8)
		  | BigInt(b8 & 0xFF);
	}

	public forkWithHashOf(string: string){
		md5
		const hash = md5(string, { asBytes: true })
		const lo = XoroshiroRandom.LongfromBytes(hash[0], hash[1], hash[2], hash[3], hash[4], hash[5], hash[6], hash[7]);
		const hi = XoroshiroRandom.LongfromBytes(hash[8], hash[9], hash[10], hash[11], hash[12], hash[13], hash[14], hash[15]);
		return new XoroshiroRandom([lo ^ this.seed[0], hi ^ this.seed[1]]);
	}

	public nextLong(): bigint {
		let seedLo = this.seed[0];
		let seedHi = this.seed[1];
		let value = XoroshiroRandom.rotateLeft(seedLo + seedHi, BigInt(17)) + seedLo;
		seedHi ^= seedLo;
		this.seed = [XoroshiroRandom.rotateLeft(seedLo, BigInt(49)) ^ seedHi ^ seedHi << BigInt(21), XoroshiroRandom.rotateLeft(seedHi, BigInt(28))]
		return value;
	}

	public consume(count: number) {
		let seedLo = this.seed[0];
		let seedHi = this.seed[1];
		for (let i = 0; i < count; i += 1) {
			seedHi ^= seedLo;
			seedLo = XoroshiroRandom.rotateLeft(seedLo, BigInt(49)) ^ seedHi ^ seedHi << BigInt(21)
			seedHi = XoroshiroRandom.rotateLeft(seedHi, BigInt(28))
		}

		this.seed = [seedLo, seedHi]
	}

	private nextBits(bits: number) {
		return this.nextLong() >> (BigInt(64 - bits));
	 }

	public nextInt(max?: number): number {
		if (!max){
			return Number(this.nextLong() & BigInt(0xFFFFFFFF))
		} else {
			return Math.abs(Number(this.nextLong() % BigInt(max)));
		}
	}

	public nextFloat(): number {
		return Number(this.nextBits(24)) * XoroshiroRandom.FLOAT_MULTIPLIER;
	}
	
	public nextDouble(): number {
		return Number(this.nextBits(53)) * XoroshiroRandom.DOUBLE_MULTIPLIER;
	}

}