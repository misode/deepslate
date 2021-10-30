import { Json } from '../core'
import { binarySearch, lerp } from './Util'

export interface NumberProvider<C> {
	apply(c: C): number
	toJson(): unknown
}

export namespace NumberProvider {
	export function fromJson<C>(obj: unknown, extractor: (obj: unknown) => NumberProvider<C>) {
		if (typeof obj === 'number') {
			return new ConstantProvider(obj)
		}
		const root = Json.readObject(obj) ?? {}

		const spline = new Spline(extractor(root.coordinate))
		const points = Json.readArray(root.points, e => Json.readObject(e) ?? {}) ?? []
		if (points.length === 0) {
			return new ConstantProvider(0)
		}
		for (const point of points) {
			const location = Json.readNumber(point.location) ?? 0
			const value = NumberProvider.fromJson(point.value, extractor)
			const derivative = Json.readNumber(point.derivative) ?? 0
			spline.addPoint(location, value, derivative)
		}
		return spline
	}
}

export class ConstantProvider implements NumberProvider<unknown> {
	constructor(private readonly value: number) {}

	public apply() {
		return this.value
	}

	public toJson() {
		return this.value
	}
}

export class Spline<C> implements NumberProvider<C> {
	constructor(
		public coordinate: NumberProvider<C>,
		public locations: number[] = [],
		public values: NumberProvider<C>[] = [],
		public derivatives: number[] = [],
	) {}

	public apply(c: C) {
		const coordinate = this.coordinate.apply(c)
		const i = binarySearch(0, this.locations.length, n => coordinate < this.locations[n]) - 1
		const n = this.locations.length - 1
		if (i < 0) {
			return this.values[0].apply(c) + this.derivatives[0] * (coordinate - this.locations[0])
		}
		if (i === n) {
			return this.values[n].apply(c) + this.derivatives[n] * (coordinate - this.locations[n])
		}
		const loc0 = this.locations[i]
		const loc1 = this.locations[i + 1]
		const der0 = this.derivatives[i]
		const der1 = this.derivatives[i + 1]
		const f = (coordinate - loc0) / (loc1 - loc0)

		const val0 = this.values[i].apply(c)
		const val1 = this.values[i + 1].apply(c)
		
		const f8 = der0 * (loc1 - loc0) - (val1 - val0)
		const f9 = -der1 * (loc1 - loc0) + (val1 - val0)
		const f10 = lerp(f, val0, val1) + f * (1.0 - f) * lerp(f, f8, f9)
		return f10
	}

	public addPoint(location: number, value: number | NumberProvider<C>, derivative = 0) {
		this.locations.push(location)
		this.values.push(typeof value === 'number'
			? new ConstantProvider(value)
			: value)
		this.derivatives.push(derivative)
		return this
	}

	public toJson() {
		return {
			coordinate: this.coordinate.toJson(),
			points: this.locations.map((location, i) => ({
				location,
				value: this.values[i].toJson(),
				derivative: this.derivatives[i],
			})),
		}
	}
}
