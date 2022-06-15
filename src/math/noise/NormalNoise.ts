import { Json } from '../../util/index.js'
import type { Random } from '../random/index.js'
import { PerlinNoise } from './PerlinNoise.js'

export class NormalNoise {
	private static readonly INPUT_FACTOR = 1.0181268882175227

	public readonly valueFactor: number
	public readonly first: PerlinNoise
	public readonly second: PerlinNoise
	public readonly maxValue: number

	constructor(random: Random, { firstOctave, amplitudes }: NoiseParameters) {
		this.first = new PerlinNoise(random, firstOctave, amplitudes)
		this.second = new PerlinNoise(random, firstOctave, amplitudes)

		let min = +Infinity
		let max = -Infinity
		for (let i = 0; i < amplitudes.length; i += 1) {
			if (amplitudes[i] !== 0) {
				min = Math.min(min, i)
				max = Math.max(max, i)
			}
		}

		const expectedDeviation = 0.1 * (1 + 1 / (max - min + 1))
		this.valueFactor = (1/6) / expectedDeviation
		this.maxValue = (this.first.maxValue + this.second.maxValue) * this.valueFactor
	}

	sample(x: number, y: number, z: number) {
		const x2 = x * NormalNoise.INPUT_FACTOR
		const y2 = y * NormalNoise.INPUT_FACTOR
		const z2 = z * NormalNoise.INPUT_FACTOR
		return (this.first.sample(x, y, z) + this.second.sample(x2, y2, z2)) * this.valueFactor
	}
}

export type NoiseParameters = {
	firstOctave: number,
	amplitudes: number[],
}
export namespace NoiseParameters {
	export function create(firstOctave: number, amplitudes: number[]): NoiseParameters {
		return { firstOctave, amplitudes }
	}
	export function fromJson(obj: unknown): NoiseParameters {
		const root = Json.readObject(obj) ?? {}
		return {
			firstOctave: Json.readInt(root.firstOctave) ?? 0,
			amplitudes: Json.readArray(root.amplitudes, e => Json.readNumber(e) ?? 0) ?? [],
		}
	}
}
