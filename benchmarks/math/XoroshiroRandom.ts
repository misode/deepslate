import * as b from 'benny'
import { XoroshiroRandom } from '../../src/index.js'

const seed = BigInt(123)
const random = XoroshiroRandom.create(seed)
const positionalRandom = random.forkPositional()

b.suite('XoroshiroRandom',
	b.add('create', () => {
		XoroshiroRandom.create(seed)
	}),
	b.add('next', () => {
		random.next()
	}),
	b.add('nextDouble', () => {
		random.nextDouble()
	}),
	b.add('nextInt', () => {
		random.nextInt(10)
	}),
	b.add('consume', () => {
		random.consume(1)
	}),
	b.add('fork', () => {
		random.fork()
	}),
	b.add('forkPositional', () => {
		random.forkPositional()
	}),
	b.add('positional fromHashOf', () => {
		positionalRandom.fromHashOf('minecraft:temperature')
	}),
	b.add('positional at', () => {
		positionalRandom.at(1, 2, 3)
	}),
	b.cycle(),
	b.complete(),
)
