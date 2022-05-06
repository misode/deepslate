import { Suite } from 'benchmark'
import { PerlinNoise, XoroshiroRandom } from '../../'

const suite = new Suite('PerlinNoise')

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const oneOctave = new PerlinNoise(random, -7, [1])
const fiveOctaves = new PerlinNoise(random, -7, [1, 1, 1, 1, 1])

export default suite
	.add('create (one octave)', () => {
		new PerlinNoise(random, -7, [1])
	})
	.add('create (five octaves)', () => {
		new PerlinNoise(random, -7, [1, 1, 1, 1, 1])
	})
	.add('sample (one octave)', () => {
		oneOctave.sample(1, 2, 3)
	})
	.add('sample (five octaves)', () => {
		fiveOctaves.sample(1, 2, 3)
	})
