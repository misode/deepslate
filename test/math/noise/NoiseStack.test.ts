import { describe, expect, it } from 'vitest'
import { LegacyRandom, NoiseStack, PerlinNoise } from '../../../src/math/index.js'

describe('NoiseStack', () => {
	it('get3D (simple)', () => {
		const random = new LegacyRandom(BigInt(45))
		const noise1 = new PerlinNoise(random.fork())
		const noise2 = new PerlinNoise(random.fork())
		const stack = new NoiseStack([
			{noise: noise1, frequency: 1, amplitude: 1},
			{noise: noise2, frequency: 1, amplitude: 1},
		])
		expect(stack.get3D(0.4, 2, 0)).toBeCloseTo(0.3732925057411194)
		expect(stack.get3D(-8, 1, 0.78)).toBeCloseTo(0.28268146514892584)
	})

	it('get3D (complex)', () => {
		const random = new LegacyRandom(BigInt(45))
		const firstRandom = random.forkPositional()
		const secondRandom = random.forkPositional()
		const noise1 = new PerlinNoise(firstRandom.fromHashOf('octave_-6'))
		const noise2 = new PerlinNoise(secondRandom.fromHashOf('octave_-6'))
		const noise3 = new PerlinNoise(firstRandom.fromHashOf('octave_-5'))
		const noise4 = new PerlinNoise(secondRandom.fromHashOf('octave_-5'))
		const stack = new NoiseStack([
			{noise: noise1, frequency: 0.015625, amplitude: 0.7801598},
			{noise: noise2, frequency: 0.015908232628398793, amplitude: 0.7801598},
			{noise: noise3, frequency: 0.03125, amplitude: 0.3900799},
			{noise: noise4, frequency: 0.031816465256797585, amplitude: 0.3900799},
		])
		expect(stack.get3D(0, 0, 0)).toBeCloseTo(0.4586540460586548)
		expect(stack.get3D(4.2, -1.04, 3)).toBeCloseTo(0.4292386770248413)
	})
})
