import { Json } from '../../util/index.js'
import { Interval } from '../Interval.js'
import type { Random } from '../random/index.js'
import { square } from '../Util.js'
import type { NoiseLayer } from './NoiseStack.js'
import { NoiseStack } from './NoiseStack.js'
import { PerlinNoise } from './PerlinNoise.js'

export const NoiseNormalizations = ['disabled', 'enabled', 'legacy'] as const
export type NoiseNormalization = typeof NoiseNormalizations[number]

export type OctaveInfo = {
	index: number,
	frequency: number,
	amplitude: number,
}

export class NormalNoise {
	private static readonly INPUT_FACTOR = 1.0181268882175227
	private static readonly TARGET_DEVIATION = 0.3333333333333333

	public readonly octaves: OctaveInfo[]
	public readonly normalizationFactor: number
	public readonly range: Interval

	constructor(
		public readonly baseAmplitude: number,
		public readonly baseOctave: number,
		public readonly octaveCount: number,
		public readonly normalize: NoiseNormalization,
		public readonly amplitudeModifiers: number[],
	) {
		this.octaves = NormalNoise.buildOctaves(baseAmplitude, baseOctave, octaveCount, normalize != 'disabled', amplitudeModifiers)
		let targetAmplitude = this.octaves.reduce((acc, o) => acc + Math.abs(o.amplitude), 0)
		let normalizationFactor = NormalNoise.computeNormalizationFactor(targetAmplitude, this.octaves)
		if (normalize == 'legacy' && normalizationFactor != 0) {
			const parityNormalizationFactor = NormalNoise.computeParityNormalizationFactor(baseAmplitude, octaveCount, amplitudeModifiers)
			targetAmplitude *= parityNormalizationFactor / normalizationFactor
			normalizationFactor = parityNormalizationFactor
		}
		this.normalizationFactor = normalizationFactor
		this.range = Interval.ofSymmetric(targetAmplitude * NormalNoise.TARGET_DEVIATION * 6)
	}

	public create(random: Random) {
		const firstRandom = random.forkPositional()
		const secondRandom = random.forkPositional()
		const layers: NoiseLayer[] = []
		for (const octave of this.octaves) {
			const octaveSeed = `octave_${octave.index}`
			const firstNoise = new PerlinNoise(firstRandom.fromHashOf(octaveSeed))
			const secondNoise = new PerlinNoise(secondRandom.fromHashOf(octaveSeed))
			const valueFactor = this.normalizationFactor * octave.amplitude
			layers.push({ noise: firstNoise, frequency: octave.frequency, amplitude: valueFactor })
			layers.push({ noise: secondNoise, frequency: octave.frequency * NormalNoise.INPUT_FACTOR, amplitude: valueFactor })
		}
		return new NoiseStack(layers)
	}

	public createForLegacyNetherBiome(random: Random) {
		let amplitudes = this.amplitudeModifiers
		if (amplitudes.length === 0) {
			amplitudes = Array(this.octaveCount).fill(1)
		}
		const first = NormalNoise.createLegacyNoiseLayers(random, this.baseOctave, amplitudes)
		const second = NormalNoise.createLegacyNoiseLayers(random, this.baseOctave, amplitudes)
		const valueFactor = this.normalizationFactor * this.baseAmplitude
		return new NoiseStack([
			...first.map(l => ({...l, amplitude: l.amplitude * valueFactor})),
			...second.map(l => ({...l, frequency: l.frequency * NormalNoise.INPUT_FACTOR, amplitudes: l.amplitude * valueFactor })),
		])
	}

	private static createLegacyNoiseLayers(random: Random, firstOctave: number, amplitudes: number[]): NoiseLayer[] {
		const octaves = amplitudes.length
		const zeroOctaveIndex = -firstOctave
		const noiseLevels = Array<PerlinNoise | undefined>(octaves).fill(undefined)
		const zeroOctave = new PerlinNoise(random)
		if (zeroOctaveIndex	>= 0 && zeroOctaveIndex < octaves && amplitudes[zeroOctaveIndex] != 0) {
			noiseLevels[zeroOctaveIndex] = zeroOctave
		}
		for (let i = zeroOctaveIndex - 1; i >= 0; i -= 1) {
			if (i < octaves && amplitudes[i] != 0) {
				noiseLevels[i] = new PerlinNoise(random)
			} else {
				random.consume(262)
			}
		}
		let factor = Math.pow(2, -zeroOctaveIndex)
		let valueFactor = Math.pow(2, octaves - 1) / (Math.pow(2, octaves) - 1)
		const layers: NoiseLayer[] = []
		for (let i = 0; i < noiseLevels.length; i += 1) {
			const noise = noiseLevels[i]
			if (noise != undefined) {
				layers.push({ noise, frequency: factor, amplitude: valueFactor })
			}
			factor *= 2
			valueFactor /= 2
		}
		return layers
	}

	private static computeParityNormalizationFactor(baseAmplitude: number, octaveCount: number, amplitudeModifiers: number[]) {
		let min = Infinity
		let max = -Infinity
		for (let i = 0; i < octaveCount; i += 1) {
			const modifier = amplitudeModifiers[i] ?? 1
			if (modifier != 0) {
				min = Math.min(min, i)
				max = Math.max(max, i)
			}
		}
		const parityExpectedDeviation = 0.1 * 1 + 1 / (max - min + 1)
		return baseAmplitude * 0.5 * NormalNoise.TARGET_DEVIATION / parityExpectedDeviation
	}

	private static computeNormalizationFactor(targetAmplitude: number, octaves: OctaveInfo[]) {
		let variance = 0
		for (const octave of octaves) {
			variance += square(0.2702247831245211 * Math.abs(octave.amplitude))
		}
		const inputDeviation = Math.sqrt(variance)
		if (inputDeviation === 0) {
			return 0
		}
		return (targetAmplitude * NormalNoise.TARGET_DEVIATION) / (inputDeviation * Math.sqrt(2))
	}

	private static buildOctaves(baseAmplitude: number, baseOctave: number,octaveCount: number, normalize: boolean, amplitudeModifiers: number[]) {
		let frequency = Math.pow(2, baseOctave)
		let amplitude = baseAmplitude
		if (normalize) {
			amplitude *= Math.pow(0.5, -(octaveCount - 1)) / (Math.pow(0.5, -octaveCount) - 1)
		}
		const octaves: OctaveInfo[] = []
		for (let i = 0; i < octaveCount; i+= 1) {
			const modifier = amplitudeModifiers[i] ?? 1
			if (modifier != 0) {
				octaves.push({
					index: baseOctave + i,
					frequency,
					amplitude: amplitude * modifier,
				})
			}
			frequency *= 2
			amplitude *= 0.5
		}
		return octaves
	}

	public static fromJson(obj: unknown): NormalNoise {
		const root = Json.readObject(obj) ?? {}
		const normalize = typeof root.normalize === 'boolean'
			? (root.normalize ? 'enabled' : 'disabled')
			: (root.normalize ? Json.readEnum(root.normalize, NoiseNormalizations) : 'enabled')
		return new NormalNoise(
			Json.readNumber(root.base_amplitude) ?? 1,
			Json.readInt(root.base_octave) ?? 0,
			Json.readInt(root.octave_count) ?? 1,
			normalize,
			Json.readArray(root.amplitude_modifiers, e => Json.readNumber(e) ?? 0) ?? [],
		)
	}
}
