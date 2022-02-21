import { Json } from '../util'
import { binarySearch, lerp } from './Util'

export interface NumberFunction<C> {
	compute(c: C): number,
}

export interface CubicSpline<C> extends NumberFunction<C> {
	min(): number,
	max(): number,
	mapAll(visitor: CubicSpline.CoordinateVisitor<C>): CubicSpline<C>
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
	}

	export class MultiPoint<C> implements CubicSpline<C> {
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
				return this.values[0].compute(c) + this.derivatives[0] * (coordinate - this.locations[0])
			}
			if (i === n) {
				return this.values[n].compute(c) + this.derivatives[n] * (coordinate - this.locations[n])
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
			return Math.min(...this.values.map(v => v.min()))
		}

		public max() {
			return Math.max(...this.values.map(v => v.max()))
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
	}
}
