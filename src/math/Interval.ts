export class Interval {
	public static NaI: Interval = new Interval(NaN, NaN)
	public static INFINITE: Interval = new Interval(-Infinity, Infinity)

	private constructor(
		public readonly min: number, 
		public readonly max: number, 
	) {}

	public static of(min: number, max: number) {
		if (max < min || isNaN(min) || isNaN(max)) {
			return Interval.NaI
		}
		if (min === -Infinity && max === Infinity) {
			return Interval.INFINITE
		}
		return new Interval(min, max)
	}

	public static ofSymmetric(range: number) {
		return Interval.of(-range, range)
	}

	public static ofExact(value: number) {
		return Interval.of(value, value)
	}

	public static between(first: number, second: number) {
		if (isNaN(first) && isNaN(second)) {
			return Interval.NaI
		} else if (isNaN(first)) {
			return Interval.ofExact(second)
		} else if (isNaN(second)) {
			return Interval.ofExact(first)
		} else {
			return Interval.of(Math.min(first, second), Math.max(first, second))
		}
	}

	public static encapsulating(...intervals: Interval[]) {
		let min = Infinity
		let max = -Infinity
		for (const interval of intervals) {
			if (!interval.isNaI()) {
				min = Math.min(min, interval.min)
				max = Math.max(max, interval.max)
			}
		}
		return max < min ? Interval.NaI : Interval.of(min, max)
	}

	public static add(left: Interval, right: Interval): Interval {
		return Interval.of(left.min + right.min, left.max + right.max)
	}

	public static sub(left: Interval, right: Interval): Interval {
		return Interval.of(left.min - right.min, left.max - right.max)
	}

	public static mul(left: Interval, right: Interval): Interval {
		if (left.isNaI() || right.isNaI()) {
			return Interval.NaI
		}
		const minMin = Interval.mulBound(left.min, right.min)
		const minMax = Interval.mulBound(left.min, right.max)
		const maxMin = Interval.mulBound(left.max, right.min)
		const maxMax = Interval.mulBound(left.max, right.max)
		return Interval.of(Math.min(minMin, minMax, maxMin, maxMax), Math.max(minMin, minMax, maxMin, maxMax))
	}

	private static mulBound(left: number, right: number) {
		return left === 0 || right == 0 ? 0 : left * right
	}

	public static reciprocal(input: Interval) {
		if (input.isNaI() || (input.min === 0 && input.max === 0)) {
			return Interval.NaI
		}
		if (input.contains(0)) {
			return Interval.of(1 / input.max, 1 / input.min)
		} else if (input.max === 0) {
			return Interval.of(-Infinity, 1 / input.min)
		} else if (input.min === 0) {
			return Interval.of(1 / input.max, Infinity)
		} else {
			return Interval.INFINITE
		}
	}

	public static div(left: Interval, right: Interval) {
		return Interval.mul(left, Interval.reciprocal(right))
	}

	public static min(left: Interval, right: Interval) {
		if (left.isNaI() || right.isNaI()) {
			return Interval.NaI
		}
		return Interval.of(Math.min(left.min, left.min), Math.min(left.max, right.max))
	}

	public static max(left: Interval, right: Interval) {
		if (left.isNaI() || right.isNaI()) {
			return Interval.NaI
		}
		return Interval.of(Math.max(left.min, left.min), Math.max(left.max, right.max))
	}

	public static clamp(input: Interval, min: number, max: number) {
		if (min > max || input.isNaI()) {
			return Interval.NaI 
		} else if (input.min >= max) {
			return Interval.ofExact(max)
		} else if (input.max <= min) {
			return Interval.ofExact(min)
		} else {
			return Interval.of(Math.max(input.min, min), Math.min(input.max, max))
		}
	}

	public static abs(input: Interval) {
		if (input.isNaI()) {
			return Interval.NaI
		}
		const max = Math.max(Math.abs(input.min), Math.abs(input.max))
		if (input.contains(0)) {
			return Interval.of(0, max)
		} else {
			const min = Math.min(Math.abs(input.min), Math.abs(input.max))
			return Interval.of(min, max)
		}
	}

	public static square(input: Interval) {
		if (input.isNaI()) {
			return Interval.NaI
		}
		const max = Math.max(input.min * input.min, input.max * input.max)
		if (input.contains(0)) {
			return Interval.of(0, max)
		} else {
			const min = Math.min(input.min * input.min, input.max * input.max)
			return Interval.of(min, max)
		}
	}

	public static pow(base: Interval, exponent: Interval) {
		if (base.isNaI() || exponent.isNaI()) {
			return Interval.NaI
		}
		if (base.min == base.max) {
			return Interval.powNum(base.min, exponent)
		}
		let result = Interval.encapsulating(Interval.powNum(base.min, exponent), Interval.powNum(base.max, exponent))
		if (base.contains(0)) {
			if (base.max > 0) {
				result = Interval.encapsulating(result, Interval.powNum(0, exponent))
			}
			if (base.min < 0) {
				result = Interval.encapsulating(result, Interval.powNum(-0, exponent))
			}
		}
		return result
	}

	private static powNum(base: number, exponent: Interval) {
		// TODO: Implement this
		return Interval.INFINITE
	}

	public static log(input: Interval) {
		if (input.max < 0) {
			return Interval.NaI
		}
		const clipped = Interval.max(input, Interval.ofExact(0))
		return Interval.mapMonotonic(clipped, Math.log)
	}

	public static mapMonotonic(input: Interval, op: (value: number) => number) {
		if (input.isNaI()) {
			return Interval.NaI
		}
		const mappedMin = op(input.min)
		const mappedMax = op(input.max)
		return Interval.of(Math.min(mappedMin, mappedMax), Math.max(mappedMin, mappedMax))
	}

	public static lerp(alpha: Interval, first: Interval, second: Interval) {
		if (alpha.isNaI() || first.isNaI() || second.isNaI()) {
			return Interval.NaI
		}
		return Interval.encapsulating(Interval.lerpNums(alpha, first.min, second.min), Interval.lerpNums(alpha, first.max, second.min), Interval.lerpNums(alpha, first.min, second.max), Interval.lerpNums(alpha, first.max, second.max))
	}

	public static lerpNums(alpha: Interval, first: number, second: number) {
		if (alpha.isNaI() || isNaN(first) || isNaN(second)) {
			return Interval.NaI
		}
		if (isFinite(first) && isFinite(second)) {
			return Interval.between(Interval.lerpFiniteBound(alpha.min, first, second), Interval.lerpFiniteBound(alpha.max, first, second))
		}
		if (first === second) {
			return Interval.ofExact(first)
		}
		const newMin = Interval.lerpInfiniteBound(alpha.min, first, second)
		const newMax = Interval.lerpInfiniteBound(alpha.max, first, second)
		if (isNaN(newMin) || isNaN(newMax)) {
			return Interval.NaI
		}
		return Interval.between(newMin, newMax)
	}

	private static lerpFiniteBound(alpha: number, first: number, second: number) {
		return first + Interval.mulBound(alpha, second - first)
	}

	private static lerpInfiniteBound(alpha: number, first: number, second: number) {
		const firstPart = Interval.mulBound(1 - alpha, first)
		const secondPart = Interval.mulBound(alpha, second)
		if (isFinite(firstPart) || isFinite(secondPart)) {
			return firstPart + secondPart
		} else if (alpha <= 0) {
			return second > first ? -Infinity : Infinity
		} else if (alpha >= 1) {
			return second > first ? Infinity : -Infinity
		} else {
			return NaN
		}
	}

	public static sign(input: Interval) {
		if (input.isNaI()) {
			return Interval.NaI
		}
		if (input.min === input.max) {
			return Interval.ofExact(Math.sign(input.min))
		} else if (!input.contains(0)) {
			return Interval.ofExact(input.min > 0 ? 1 : -1)
		} else if (input.min === 0) {
			return Interval.of(0, 1)
		} else if (input.max === 0) {
			return Interval.of(-1, 0)
		} else {
			return Interval.of(-1, 1)
		}
	}

	public contains(value: number) {
		return this.min <= value && value <= this.max
	}

	public intersects(other: Interval) {
		return this.min <= other.max && other.min <= this.max
	}

	public isNaI(): boolean {
		return this === Interval.NaI
	}
}
