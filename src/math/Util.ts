export function square(x: number) {
	return x * x
}

export function clamp(x: number, min: number, max: number) {
	return Math.max(min, Math.min(max, x))
}

export function lerp(a: number, b: number, c: number): number {
	return b + a * (c - b)
}

export function lerp2(a: number, b: number, c: number, d: number, e: number, f: number): number {
	return lerp(b, lerp(a, c, d), lerp(a, e, f))
}

export function lerp3(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) {
	return lerp(c, lerp2(a, b, d, e, f, g), lerp2(a, b, h, i, j, k))
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
