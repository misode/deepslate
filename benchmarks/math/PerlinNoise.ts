import * as b from 'benny'
import { PerlinNoise, XoroshiroRandom } from '../../src/index.js'

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const oneOctave = new PerlinNoise(random, -7, [1])
const fiveOctaves = new PerlinNoise(random, -7, [1, 1, 1, 1, 1])

b.suite('PerlinNoise',
	b.add('create (one octave)', () => {
		new PerlinNoise(random, -7, [1])
	}),
	b.add('create (five octaves)', () => {
		new PerlinNoise(random, -7, [1, 1, 1, 1, 1])
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
