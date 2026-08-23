import { Json } from '../util/index.js'
import { Interval } from './Interval.js'
import { binarySearch, floatLerp } from './Util.js'

export interface BoundedFloatFunction<C> {
	compute(c: C): number
	range(): Interval
}

export interface CubicSpline<C> extends BoundedFloatFunction<C> {
	range(): Interval,
	mapCoordinates(visitor: CubicSpline.CoordinateVisitor<C>): CubicSpline<C>
}

export namespace CubicSpline {

	export type CoordinateVisitor<C> = (f: BoundedFloatFunction<C>) => BoundedFloatFunction<C>

	export function fromJson<C>(obj: unknown, extractor: (obj: unknown) => BoundedFloatFunction<C>) {
		if (typeof obj === 'number') {
			return new Constant(obj)
		}
		const root = Json.readObject(obj) ?? {}

		const spline = new MultiPoint(extractor(root.coordinate))
		const points = Json.readArray(root.points, e => Json.readObject(e) ?? {}) ?? []
		if (points.length === 0) {
			return new Constant(0)
		}
		for (const point of points) {
			const location = Json.readNumber(point.location) ?? 0
			const value = fromJson(point.value, extractor)
			const derivative = Json.readNumber(point.derivative) ?? 0
			spline.addPoint(location, value, derivative)
		}
		return spline
	}
	
	export class Constant implements CubicSpline<unknown> {
		constructor(private readonly value: number) {}
		public compute() {
			return this.value
		}
		public range() {
			return Interval.of(this.value, this.value)
		}
		public mapCoordinates() {
			return this
		}
	}

	export class MultiPoint<C> implements CubicSpline<C> {
		constructor(
			public coordinate: BoundedFloatFunction<C>,
			public locations: number[] = [],
			public values: CubicSpline<C>[] = [],
			public derivatives: number[] = [],
		) {}
	
		public compute(c: C) {
			const coordinate = this.coordinate.compute(c)
			const i = binarySearch(0, this.locations.length, n => coordinate < this.locations[n]) - 1
			const n = this.locations.length - 1
			// TODO: use linear extend for this 
			if (i < 0) {
				return Math.fround(this.values[0].compute(c) + Math.fround(this.derivatives[0] * Math.fround(coordinate - this.locations[0])))
			}
			if (i === n) {
				return Math.fround(this.values[n].compute(c) + Math.fround(this.derivatives[n] * Math.fround(coordinate - this.locations[n])))
			}
			const loc0 = this.locations[i]
			const loc1 = this.locations[i + 1]
			const der0 = this.derivatives[i]
			const der1 = this.derivatives[i + 1]
			const f = Math.fround(Math.fround(coordinate - loc0) / Math.fround(loc1 - loc0))

			const val0 = this.values[i].compute(c)
			const val1 = this.values[i + 1].compute(c)

			const f8 = Math.fround(Math.fround(der0 * Math.fround(loc1 - loc0)) - Math.fround(val1 - val0))
			const f9 = Math.fround(Math.fround(-der1 * Math.fround(loc1 - loc0)) + Math.fround(val1 - val0))
			const f10 = Math.fround(floatLerp(f, val0, val1) + Math.fround(Math.fround(f * Math.fround(1.0 - f)) * floatLerp(f, f8, f9)))
			return f10
		}

		public mapCoordinates(visitor: CubicSpline.CoordinateVisitor<C>): CubicSpline<C> {
			return new MultiPoint(visitor(this.coordinate), this.locations, this.values.map(v => v.mapCoordinates(visitor)), this.derivatives)
		}
	
		public addPoint(location: number, value: number | CubicSpline<C>, derivative = 0) {
			this.locations.push(Math.fround(location))
			this.values.push(typeof value === 'number'
				? new CubicSpline.Constant(Math.fround(value))
				: value)
			this.derivatives.push(Math.fround(derivative))
			return this
		}

		public range() {
			const lastIdx = this.locations.length - 1
			var splineMin = Number.POSITIVE_INFINITY
			var splineMax = Number.NEGATIVE_INFINITY
			const inputRange = this.coordinate.range()
			if (inputRange.isNaI()) {
				return inputRange
			}

			if (inputRange.min < this.locations[0]) {
				const firstRange = this.values[0].range()
				const minExtend = MultiPoint.linearExtend(firstRange.min, this.locations, firstRange.min, this.derivatives, 0)
				const maxExtend = MultiPoint.linearExtend(firstRange.min, this.locations, firstRange.min, this.derivatives, 0)
				splineMin = Math.min(splineMin, Math.min(minExtend, maxExtend))
				splineMax = Math.max(splineMax, Math.max(minExtend, maxExtend))
			}

			if (inputRange.max > this.locations[lastIdx]) {
				const lastRange = this.values[lastIdx].range()
				const minExtend = MultiPoint.linearExtend(lastRange.max, this.locations, lastRange.min, this.derivatives, lastIdx)
				const maxExtend = MultiPoint.linearExtend(lastRange.max, this.locations, lastRange.max, this.derivatives, lastIdx)
				splineMin = Math.min(splineMin, Math.min(minExtend, maxExtend))
				splineMax = Math.max(splineMax, Math.max(minExtend, maxExtend))
			}

			const valueRanges = this.values.map(v => v.range())
			for (const range of valueRanges) {
				splineMin = Math.min(splineMin, range.min)
				splineMax = Math.max(splineMax, range.max)
			}

			for (var i = 0; i < lastIdx; ++i) {
				const locationLeft = this.locations[i]
				const locationRight = this.locations[i + 1]
				const locationDelta = Math.fround(locationRight - locationLeft)
				const rangeLeft = valueRanges[i]
				const rangeRight = valueRanges[i + 1]
				const derivativeLeft = this.derivatives[i]
				const derivativeRight = this.derivatives[i + 1]
				if (derivativeLeft !== 0.0 || derivativeRight !== 0.0) {
					const maxValueDeltaLeft = Math.fround(derivativeLeft * locationDelta)
					const maxValueDeltaRight = Math.fround(derivativeRight * locationDelta)
					const minValue = Math.min(rangeLeft.min, rangeRight.min)
					const maxValue = Math.max(rangeLeft.max, rangeRight.max)
					const minDeltaLeft = Math.fround(Math.fround(maxValueDeltaLeft - rangeRight.max) + rangeLeft.min)
					const maxDeltaLeft = Math.fround(Math.fround(maxValueDeltaLeft - rangeRight.min) + rangeLeft.max)
					const minDeltaRight = Math.fround(Math.fround(-maxValueDeltaRight + rangeRight.min) - rangeLeft.max)
					const maxDeltaRight = Math.fround(Math.fround(-maxValueDeltaRight + rangeRight.max) - rangeLeft.min)
					const minDelta = Math.min(minDeltaLeft, minDeltaRight)
					const maxDelta = Math.max(maxDeltaLeft, maxDeltaRight)
					splineMin = Math.min(splineMin, Math.fround(minValue + Math.fround(0.25 * minDelta)))
					splineMax = Math.max(splineMax, Math.fround(maxValue + Math.fround(0.25 * maxDelta)))
				}
			}

			return Interval.of(splineMin, splineMax)
		}

		private static linearExtend(location: number, locations: number[], value: number, derivatives: number[], useIndex: number) {
			const derivative = derivatives[useIndex]
			if (derivative == 0) {
				return value
			}
			return Math.fround(value + Math.fround(derivative * Math.fround(location - locations[useIndex])))
		}
	}
}
