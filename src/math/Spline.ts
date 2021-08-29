import { binarySearch, lerp } from './Util'

type Func<C> = (c: C) => number

export class Spline<C> {

	constructor(
		public name: string,
		public coordinate: Func<C>,
		public locations: number[] = [],
		public values: Func<C>[] = [],
		public derivatives: number[] = [],
	) {}

	public apply(c: C) {
		const coordinate = this.coordinate(c)
		const i = binarySearch(0, this.locations.length, n => coordinate < this.locations[n]) - 1
		const n = this.locations.length - 1
		if (i < 0) {
			return this.values[0](c) + this.derivatives[0] * (coordinate - this.locations[0])
		}
		if (i === n) {
			return this.values[n](c) + this.derivatives[n] * (coordinate - this.locations[n])
		}
		const loc0 = this.locations[i]
		const loc1 = this.locations[i + 1]
		const der0 = this.derivatives[i]
		const der1 = this.derivatives[i + 1]
		const f = (coordinate - loc0) / (loc1 - loc0)

		const val0 = this.values[i](c)
		const val1 = this.values[i + 1](c)
		
		const f8 = der0 * (loc1 - loc0) - (val1 - val0)
		const f9 = -der1 * (loc1 - loc0) + (val1 - val0)
		const f10 = lerp(f, val0, val1) + f * (1.0 - f) * lerp(f, f8, f9)
		return f10
	}

	public addPoint(location: number, value: number | ((c: C) => number) | Spline<C>, derivative = 0) {
		this.locations.push(location)
		this.values.push(typeof value === 'number'
			? () => value
			: value.apply.bind(value))
		this.derivatives.push(derivative)
		return this
	}
}

const s = new Spline('a', () => 1, [], [], [])
