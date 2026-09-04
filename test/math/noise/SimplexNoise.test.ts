import { describe, expect, it } from 'vitest'
import { LegacyRandom, SimplexNoise } from '../../../src/math/index.js'

describe('SimplexNoise', () => {
	it('get2D', () => {
		const random = new LegacyRandom(BigInt(912))
		const noise = new SimplexNoise(random)
		expect(noise.get2D(0, 0)).toBeCloseTo(0.16088540852069855)
		expect(noise.get2D(0.5, 4)).toBeCloseTo(0.22688160836696625)
		expect(noise.get2D(0.5, 5)).toBeCloseTo(-0.0732734426856041)
		expect(noise.get2D(-204, 28)).toBeCloseTo(-0.1171100065112114)
	})

	it('get3D', () => {
		const random = new LegacyRandom(BigInt(912))
		const noise = new SimplexNoise(random)
		expect(noise.get3D(0, 0, 0)).toBeCloseTo(0.25345778465270996)
		expect(noise.get3D(0.5, 4, -2)).toBeCloseTo(-0.10585923492908478)
		expect(noise.get3D(0.5, 5, -2)).toBeCloseTo(0.5058174729347229)
		expect(noise.get3D(-204, 28, 12)).toBeCloseTo(0.7554889917373657)
	})
})
