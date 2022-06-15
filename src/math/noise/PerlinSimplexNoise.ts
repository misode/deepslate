import type { Random } from '../random/index.js'
import { SimplexNoise } from './SimplexNoise.js'

export class PerlinSimplexNoise {
	public readonly noiseLevels: SimplexNoise[]
	public readonly highestFreqInputFactor: number
	public readonly highestFreqValueFactor: number

	constructor(random: Random, octaves: number[]) {
		const lastOctave = octaves[octaves.length - 1]
		const negFirstOctave = -octaves[0]
		const range = negFirstOctave + lastOctave + 1
		const octavesSet = new Set(octaves)

		const noise = new SimplexNoise(random)
		this.noiseLevels = Array(range)
		if (lastOctave >= 0 && lastOctave < range && octavesSet.has(0)) {
			this.noiseLevels[lastOctave] = noise
		}

		for (let i = lastOctave + 1; i < range; i += 1) {
			if (i >= 0 && octavesSet.has(lastOctave - i)) {
				this.noiseLevels[i] = new SimplexNoise(random)
			} else {
				random.consume(262)
			}
		}

		if (lastOctave > 0) {
			throw new Error('Positive octaves are not allowed')
		}

		this.highestFreqInputFactor = Math.pow(2, lastOctave)
		this.highestFreqValueFactor = 1 / (Math.pow(2, range) - 1)
	}

	public sample(x: number, y: number, useOffsets: boolean) {
		let value = 0
		let inputF = this.highestFreqInputFactor
		let valueF = this.highestFreqValueFactor
		for (let i = 0; i < this.noiseLevels.length; i += 1) {
			const noise = this.noiseLevels[i]
			if (noise) {
				value += valueF * noise.sample2D(
					x * inputF + (useOffsets ? noise.xo : 0),
					y * inputF + (useOffsets ? noise.yo : 0),
				)
			}
			inputF /= 2
			valueF *= 2
		}
		return value
	}
}
