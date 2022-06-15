import * as b from 'benny'
import { ImprovedNoise, XoroshiroRandom } from '../../src/index.js'

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const noise = new ImprovedNoise(random)

b.suite('ImprovedNoise',
	b.add('create', () => {
		new ImprovedNoise(random)
	}),
	b.add('sample', () => {
		noise.sample(1, 2, 3)
	}),
	b.cycle(),
	b.complete(),
)
