import { Suite } from 'benchmark'
import { SimplexNoise, XoroshiroRandom } from '../../'

const suite = new Suite('SimplexNoise')

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const noise = new SimplexNoise(random)

export default suite
	.add('create', () => {
		new SimplexNoise(random)
	})
	.add('sample2D', () => {
		noise.sample2D(1, 2)
	})
	.add('sample', () => {
		noise.sample(1, 2, 3)
	})
