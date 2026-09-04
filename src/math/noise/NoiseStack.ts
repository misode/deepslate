import { Interval } from '../Interval.js'

export interface Noise {
	range(): Interval
	get2D(x: number, y: number): number
	get3D(x: number, y: number, z: number): number
}

export type NoiseLayer = {
	noise: Noise,
	frequency: number,
	amplitude: number,
}

export class NoiseStack implements Noise {
	private readonly _range: Interval
	constructor(
		public readonly layers: NoiseLayer[],
	) {
		let range = Interval.ofExact(0)
		for (const layer of layers) {
			const layerRange = Interval.mul(layer.noise.range(), Interval.ofExact(layer.amplitude))
			range = Interval.add(range, layerRange)
		}
		this._range = range
	}

	public range() {
		return this._range
	}

	public get2D(x: number, y: number) {
		let value = 0
		for (const layer of this.layers) {
			value += layer.amplitude * layer.noise.get2D(x * layer.frequency, y * layer.frequency)
		}
		return value
	}

	public get3D(x: number, y: number, z: number) {
		let value = 0
		for (const layer of this.layers) {
			value += layer.amplitude * layer.noise.get3D(x * layer.frequency, y * layer.frequency, z * layer.frequency)
		}
		return value
	}
}
