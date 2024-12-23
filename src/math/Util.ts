import type { Random } from './random/index.js'

const MIN_INT = -2147483648
const MAX_INT = 2147483647
const MIN_LONG = -9223372036854776000
const MAX_LONG = 9223372036854776000

export function square(x: number) {
	return x * x
}

export function clamp(x: number, min: number, max: number) {
	return Math.max(min, Math.min(max, x))
}

export function lerp(a: number, b: number, c: number): number {
	return b + a * (c - b)
}

export function floatLerp(a: number, b: number, c: number): number {
	return Math.fround(b + Math.fround(a * Math.fround(c - b)))
}

export function lerp2(a: number, b: number, c: number, d: number, e: number, f: number): number {
	return lerp(b, lerp(a, c, d), lerp(a, e, f))
}

export function lerp3(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) {
	return lerp(c, lerp2(a, b, d, e, f, g), lerp2(a, b, h, i, j, k))
}

export function lazyLerp(a: number, b: () => number, c: () => number): number {
	if (a === 0) return b()
	if (a === 1) return c()
	return b() + a * (c() - b())
}

export function lazyLerp2(a: number, b: number, c: () => number, d: () => number, e: () => number, f: () => number): number {
	return lazyLerp(b, () => lazyLerp(a, c, d), ()=>lazyLerp(a, e, f))
}

export function lazyLerp3(a: number, b: number, c: number, d: () => number, e: () => number, f: () => number, g: () => number, h: () => number, i: () => number, j: () => number, k: () => number) {
	return lazyLerp(c, () => lazyLerp2(a, b, d, e, f, g), () => lazyLerp2(a, b, h, i, j, k))
}

export function clampedLerp(a: number, b: number, c: number): number {
	if (c < 0) {
		return a
	} else if (c > 1) {
		return b
	} else {
		return lerp(c, a, b)
	}
}

export function inverseLerp(a: number, b: number, c: number) {
	return (a - b) / (c - b)
}

export function smoothstep(x: number): number {
	return x * x * x * (x * (x * 6 - 15) + 10)
}

export function map(a: number, b: number, c: number, d: number, e: number) {
	return lerp(inverseLerp(a, b, c), d, e)
}

export function clampedMap(a: number, b: number, c: number, d: number, e: number) {
	return clampedLerp(d, e, inverseLerp(a, b, c))
}

export function intFloor(a: number) {
	return clamp(Math.floor(a), MIN_INT, MAX_INT)
}

export function longFloor(a: number) {
	return clamp(Math.floor(a), MIN_LONG, MAX_LONG)
}

export function binarySearch(n: number, n2: number, predicate: (value: number) => boolean) {
	let n3 = n2 - n
	while (n3 > 0) {
		const n4 = Math.floor(n3 / 2)
		const n5 = n + n4
		if (predicate(n5)) {
			n3 = n4
			continue
		}
		n = n5 + 1
		n3 -= n4 + 1
	}
	return n
}

export function getSeed(x: number, y: number, z: number) {
	let seed = BigInt(x * 3129871) ^ BigInt(z) * BigInt(116129781) ^ BigInt(y)
	seed = seed * seed * BigInt(42317861) + seed * BigInt(11)
	return seed >> BigInt(16)
}

export function longfromBytes(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number): bigint {
	return BigInt(a) << BigInt(56)
		| BigInt(b) << BigInt(48)
		| BigInt(c) << BigInt(40)
		| BigInt(d) << BigInt(32)
		| BigInt(e) << BigInt(24)
		| BigInt(f) << BigInt(16)
		| BigInt(g) << BigInt(8)
		| BigInt(h)
}

export function isPowerOfTwo(x: number) {
	return (x & (x - 1)) === 0
}

export function upperPowerOfTwo(x: number) {
	x -= 1
	x |= x >> 1
	x |= x >> 2
	x |= x >> 4
	x |= x >> 8
	x |= x >> 18
	x |= x >> 32
	return x + 1
}


export function randomBetweenInclusive(random: Random, min: number, max: number) {
	return random.nextInt(max - min + 1) + min
}

export function nextInt(random: Random, min: number, max: number) {
	return min >= max ? min : random.nextInt(max - min + 1) + min
}

export function shuffle(array: unknown[], random: Random) {
	for (var i = array.length; i > 1 ; i --){
		const switchIndex = random.nextInt(i)
		const tmp = array[switchIndex]
		array[switchIndex] = array[i - 1]
		array[i - 1] = tmp
	}
}
