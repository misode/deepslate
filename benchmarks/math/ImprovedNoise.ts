import { Suite } from 'benchmark'
import { ImprovedNoise, XoroshiroRandom } from '../../'

const suite = new Suite('ImprovedNoise')

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const noise = new ImprovedNoise(random)

export default suite
	.add('create', () => {
		new ImprovedNoise(random)
	})
	.add('sample', () => {
		noise.sample(1, 2, 3)
	})
