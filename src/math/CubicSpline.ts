import { Json } from '../util'
import { binarySearch, lerp } from './Util'

export interface MinMaxNumberFunction<C> extends NumberFunction<C> {
	compute(c: C): number,
	minValue(): number
	maxValue(): number
}

export interface NumberFunction<C> {
	compute(c: C): number,
}

export interface CubicSpline<C> extends NumberFunction<C> {
	min(): number,
	max(): number,
	mapAll(visitor: CubicSpline.CoordinateVisitor<C>): CubicSpline<C>
	calculateMinMax(): void
}

export namespace CubicSpline {

	export type CoordinateVisitor<C> = (f: NumberFunction<C>) => NumberFunction<C>

	export function fromJson<C>(obj: unknown, extractor: (obj: unknown) => NumberFunction<C>) {
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
		public min() {
			return this.value
		}
		public max() {
			return this.value
		}
		public mapAll() {
			return this
		}

		public calculateMinMax() {}
	}

	export class MultiPoint<C> implements CubicSpline<C> {
		private calculatedMin = Number.NEGATIVE_INFINITY
		private calculatedMax = Number.POSITIVE_INFINITY

		constructor(
			public coordinate: NumberFunction<C>,
			public locations: number[] = [],
			public values: CubicSpline<C>[] = [],
			public derivatives: number[] = [],
		) {}
	
		public compute(c: C) {
			const coordinate = this.coordinate.compute(c)
			const i = binarySearch(0, this.locations.length, n => coordinate < this.locations[n]) - 1
			const n = this.locations.length - 1
			if (i < 0) {
				return this.values[0].compute(c) + this.derivatives[0] * (coordinate - this.locations[0])  //TODO: us linear extend for this 
			}
			if (i === n) {
				return this.values[n].compute(c) + this.derivatives[n] * (coordinate - this.locations[n])  //TODO: us linear extend for this 
			}
			const loc0 = this.locations[i]
			const loc1 = this.locations[i + 1]
			const der0 = this.derivatives[i]
			const der1 = this.derivatives[i + 1]
			const f = (coordinate - loc0) / (loc1 - loc0)
	
			const val0 = this.values[i].compute(c)
			const val1 = this.values[i + 1].compute(c)
			
			const f8 = der0 * (loc1 - loc0) - (val1 - val0)
			const f9 = -der1 * (loc1 - loc0) + (val1 - val0)
			const f10 = lerp(f, val0, val1) + f * (1.0 - f) * lerp(f, f8, f9)
			return f10
		}

		public min() {
			return this.calculatedMin
		}

		public max() {
			return this.calculatedMax
		}
	
		public mapAll(visitor: CubicSpline.CoordinateVisitor<C>): CubicSpline<C> {
			return new MultiPoint(visitor(this.coordinate), this.locations, this.values.map(v => v.mapAll(visitor)), this.derivatives)
		}
	
		public addPoint(location: number, value: number | CubicSpline<C>, derivative = 0) {
			this.locations.push(location)
			this.values.push(typeof value === 'number'
				? new CubicSpline.Constant(value)
				: value)
			this.derivatives.push(derivative)
			return this
		}

		public calculateMinMax() {
			if (!('minValue' in this.coordinate && 'maxValue' in this.coordinate)){
				return
			}

			const lastIdx = this.locations.length - 1
			var splineMin = Number.POSITIVE_INFINITY
			var splineMax = Number.NEGATIVE_INFINITY
			const coordinateMin = (this.coordinate as MinMaxNumberFunction<C>).minValue()
			const coordinateMax = (this.coordinate as MinMaxNumberFunction<C>).maxValue()

			for(const innerSpline of this.values) {
				innerSpline.calculateMinMax()
			}

			if (coordinateMin < this.locations[0]) {
				const minExtend = MultiPoint.linearExtend(coordinateMin, this.locations, (this.values[0]).min(), this.derivatives, 0)
				const maxExtend = MultiPoint.linearExtend(coordinateMin, this.locations, (this.values[0]).max(), this.derivatives, 0)
				splineMin = Math.min(splineMin, Math.min(minExtend, maxExtend))
				splineMax = Math.max(splineMax, Math.max(minExtend, maxExtend))
			}

			if (coordinateMax > this.locations[lastIdx]) {
				const minExtend = MultiPoint.linearExtend(coordinateMax, this.locations, (this.values[lastIdx]).min(), this.derivatives, lastIdx)
				const maxExtend = MultiPoint.linearExtend(coordinateMax, this.locations, (this.values[lastIdx]).max(), this.derivatives, lastIdx)
				splineMin = Math.min(splineMin, Math.min(minExtend, maxExtend))
				splineMax = Math.max(splineMax, Math.max(minExtend, maxExtend))
			}

			for(const innerSpline of this.values) {
				splineMin = Math.min(splineMin, innerSpline.min())
				splineMax = Math.max(splineMax, innerSpline.max())
			}

			for(var i = 0; i < lastIdx; ++i) {
				const locationLeft = this.locations[i]
				const locationRight = this.locations[i + 1]
				const locationDelta = locationRight - locationLeft
				const splineLeft = this.values[i]
				const splineRight = this.values[i + 1]
				const minLeft = splineLeft.min()
				const maxLeft = splineLeft.max()
				const minRight = splineRight.min()
				const maxRight = splineRight.max()
				const derivativeLeft = this.derivatives[i]
				const derivativeRight = this.derivatives[i + 1]
				if (derivativeLeft !== 0.0 || derivativeRight !== 0.0) {
					const maxValueDeltaLeft = derivativeLeft * locationDelta
					const maxValueDeltaRight = derivativeRight * locationDelta
					const minValue = Math.min(minLeft, minRight)
					const maxValue = Math.max(maxLeft, maxRight)
					const minDeltaLeft = maxValueDeltaLeft - maxRight + minLeft
					const maxDeltaLeft = maxValueDeltaLeft - minRight + maxLeft
					const minDeltaRight = -maxValueDeltaRight + minRight - maxLeft
					const maxDeltaRight = -maxValueDeltaRight + maxRight - minLeft
					const minDelta = Math.min(minDeltaLeft, minDeltaRight)
					const maxDelta = Math.max(maxDeltaLeft, maxDeltaRight)
					splineMin = Math.min(splineMin, minValue + 0.25 * minDelta)
					splineMax = Math.max(splineMax, maxValue + 0.25 * maxDelta)
				}
			}

			this.calculatedMin = splineMin
			this.calculatedMax = splineMax
		}		
	

		private static linearExtend(location: number, locations: number[], value: number, derivatives: number[], useIndex: number) {
			const derivative = derivatives[useIndex]
			return derivative == 0.0 ? value : value + derivative * (location - locations[useIndex])
		 }
 	}
}
