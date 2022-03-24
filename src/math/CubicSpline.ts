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
		private calculated_min = Number.NEGATIVE_INFINITY
		private calculated_max = Number.POSITIVE_INFINITY

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
			return this.calculated_min
		}

		public max() {
			return this.calculated_max
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

			const lastIdx = this.locations.length - 1;
			var spline_min = Number.POSITIVE_INFINITY;
			var spline_max = Number.NEGATIVE_INFINITY;
			const coordinate_min = (this.coordinate as MinMaxNumberFunction<C>).minValue();
			const coordinate_max = (this.coordinate as MinMaxNumberFunction<C>).maxValue();

			for(const innerSpline of this.values) {
				innerSpline.calculateMinMax()
			}

			if (coordinate_min < this.locations[0]) {
				const min_extend = MultiPoint.linearExtend(coordinate_min, this.locations, (this.values[0]).min(), this.derivatives, 0);
				const max_extend = MultiPoint.linearExtend(coordinate_min, this.locations, (this.values[0]).max(), this.derivatives, 0);
				spline_min = Math.min(spline_min, Math.min(min_extend, max_extend));
				spline_max = Math.max(spline_max, Math.max(min_extend, max_extend));
			}

			if (coordinate_max > this.locations[lastIdx]) {
				const min_extend = MultiPoint.linearExtend(coordinate_max, this.locations, (this.values[lastIdx]).min(), this.derivatives, lastIdx);
				const max_extend = MultiPoint.linearExtend(coordinate_max, this.locations, (this.values[lastIdx]).max(), this.derivatives, lastIdx);
				spline_min = Math.min(spline_min, Math.min(min_extend, max_extend));
				spline_max = Math.max(spline_max, Math.max(min_extend, max_extend));
			}

			for(const innerSpline of this.values) {
				spline_min = Math.min(spline_min, innerSpline.min());
				spline_max = Math.max(spline_max, innerSpline.max());
			}

			for(var i = 0; i < lastIdx; ++i) {
				const location_left = this.locations[i];
				const location_right = this.locations[i + 1];
				const location_delta = location_right - location_left;
				const spline_left = this.values[i];
				const spline_right = this.values[i + 1];
				const minLeft = spline_left.min();
				const maxLeft = spline_left.max();
				const minRight = spline_right.min();
				const maxRight = spline_right.max();
				const derivative_left = this.derivatives[i];
				const derivative_right = this.derivatives[i + 1];
				if (derivative_left !== 0.0 || derivative_right !== 0.0) {
					const max_value_delta_left = derivative_left * location_delta;
					const max_value_delta_right = derivative_right * location_delta;
					const min_value = Math.min(minLeft, minRight);
					const max_value = Math.max(maxLeft, maxRight);
					const min_delta_left = max_value_delta_left - maxRight + minLeft;
					const max_delta_left = max_value_delta_left - minRight + maxLeft;
					const min_delta_right = -max_value_delta_right + minRight - maxLeft;
					const max_delta_right = -max_value_delta_right + maxRight - minLeft;
					const min_delta = Math.min(min_delta_left, min_delta_right);
					const max_delta = Math.max(max_delta_left, max_delta_right);
					spline_min = Math.min(spline_min, min_value + 0.25 * min_delta);
					spline_max = Math.max(spline_max, max_value + 0.25 * max_delta);
				}
			}

			this.calculated_min = spline_min
			this.calculated_max = spline_max
		}		
	

		private static linearExtend(location: number, locations: number[], value: number, derivatives: number[], useIndex: number) {
			const derivative = derivatives[useIndex];
			return derivative == 0.0 ? value : value + derivative * (location - locations[useIndex]);
		 }
 	}
}
