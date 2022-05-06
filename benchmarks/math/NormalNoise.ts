import { Suite } from 'benchmark'
import { NormalNoise, XoroshiroRandom } from '../../'

const suite = new Suite('NormalNoise')

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const oneOctave = new NormalNoise(random, { firstOctave: -7, amplitudes: [1] })
const fiveOctaves = new NormalNoise(random, { firstOctave: -7, amplitudes: [1, 1, 1, 1, 1] })

export default suite
	.add('create (one octave)', () => {
		new NormalNoise(random, { firstOctave: -7, amplitudes: [1] })
	})
	.add('create (five octaves)', () => {
		new NormalNoise(random, { firstOctave: -7, amplitudes: [1, 1, 1, 1, 1] })
	})
	.add('sample (one octave)', () => {
		oneOctave.sample(1, 2, 3)
	})
	.add('sample (five octaves)', () => {
		fiveOctaves.sample(1, 2, 3)
	})
