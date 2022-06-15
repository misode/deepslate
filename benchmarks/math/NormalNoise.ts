import * as b from 'benny'
import { NormalNoise, XoroshiroRandom } from '../../src/index.js'

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const oneOctave = new NormalNoise(random, { firstOctave: -7, amplitudes: [1] })
const fiveOctaves = new NormalNoise(random, { firstOctave: -7, amplitudes: [1, 1, 1, 1, 1] })

b.suite('NormalNoise',
	b.add('create (one octave)', () => {
		new NormalNoise(random, { firstOctave: -7, amplitudes: [1] })
	}),
	b.add('create (five octaves)', () => {
		new NormalNoise(random, { firstOctave: -7, amplitudes: [1, 1, 1, 1, 1] })
	}),
	b.add('sample (one octave)', () => {
		oneOctave.sample(1, 2, 3)
	}),
	b.add('sample (five octaves)', () => {
		fiveOctaves.sample(1, 2, 3)
	}),
	b.cycle(),
	b.complete(),
)
