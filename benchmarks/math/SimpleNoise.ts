import * as b from 'benny'
import { SimplexNoise, XoroshiroRandom } from '../../src/index.js'

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const noise = new SimplexNoise(random)

b.suite('SimpleNoise',
	b.add('create', () => {
		new SimplexNoise(random)
	}),
	b.add('sample2D', () => {
		noise.sample2D(1, 2)
	}),
	b.add('sample', () => {
		noise.sample(1, 2, 3)
	}),
	b.cycle(),
	b.complete(),
)
