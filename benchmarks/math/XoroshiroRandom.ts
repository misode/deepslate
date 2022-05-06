import { Suite } from 'benchmark'
import { XoroshiroRandom } from '../../'

const NAME = 'XoroshiroRandom'
const suite = new Suite(NAME)

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const positionalRandom = random.forkPositional()

export default suite
	.add('create', () => {
		XoroshiroRandom.create(seed)
	})
	.add('next', () => {
		random.next()
	})
	.add('nextDouble', () => {
		random.nextDouble()
	})
	.add('nextInt', () => {
		random.nextInt(10)
	})
	.add('consume', () => {
		random.consume(1)
	})
	.add('fork', () => {
		random.fork()
	})
	.add('forkPositional', () => {
		random.forkPositional()
	})
	.add('positional fromHashOf', () => {
		positionalRandom.fromHashOf('minecraft:temperature')
	})
	.add('positional at', () => {
		positionalRandom.at(1, 2, 3)
	})
