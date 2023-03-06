import { beforeEach, describe, expect, it } from 'vitest'
import type { Random } from '../../src/math/random/index.js'
import { LegacyRandom } from '../../src/math/random/index.js'
import { HeightProvider, VerticalAnchor, WorldgenContext } from '../../src/worldgen/index.js'


describe('HeightProvider', () => {
	const context = WorldgenContext.create(0, 128)
	
	const va1 = VerticalAnchor.absolute(15)
	const va2 = VerticalAnchor.absolute(64)


	var random: Random

	beforeEach(() => {
		random = new LegacyRandom(BigInt(1))
	})

	it ('Constant', () => {
		const hp1 = HeightProvider.constant(va1)
		expect(hp1(random, context)).toEqual(15)
	})

	it ('Uniform', () => {
		const hp1 = HeightProvider.uniform(va1, va1)
		expect(hp1(random, context)).toEqual(15)

		const hp2 = HeightProvider.uniform(va1, va2)
		for (var i = 0 ; i < 25 ; i++){
			const value = hp2(random, context)
			expect(value).toBeLessThanOrEqual(64)
			expect(value).toBeGreaterThanOrEqual(15)
		}
	})

	it ('Biased To Bottom', () => {
		const hp1 = HeightProvider.biased_to_bottom(va1, va1, 1)
		expect(hp1(random, context)).toEqual(15)

		const hp2 = HeightProvider.biased_to_bottom(va1, va2, 50)
		expect(hp2(random, context)).toEqual(15)


		const hp3 = HeightProvider.biased_to_bottom(va1, va2, 45)
		for (var i = 0 ; i < 25 ; i++){
			const value = hp3(random, context)
			expect(value).toBeLessThanOrEqual(64)
			expect(value).toBeGreaterThanOrEqual(15)
		}
	})

	it ('Very Biased To Bottom', () => {
		const hp1 = HeightProvider.very_biased_to_bottom(va1, va1, 1)
		expect(hp1(random, context)).toEqual(15)

		const hp2 = HeightProvider.very_biased_to_bottom(va1, va2, 50)
		expect(hp2(random, context)).toEqual(15)


		const hp3 = HeightProvider.very_biased_to_bottom(va1, va2, 1)
		for (var i = 0 ; i < 25 ; i++){
			const value = hp3(random, context)
			expect(value).toBeLessThanOrEqual(64)
			expect(value).toBeGreaterThanOrEqual(15)
		}
	})	


	it ('Trapezoid', () => {
		const hp1 = HeightProvider.trapezoid(va1, va1, 1)
		expect(hp1(random, context)).toEqual(15)

		const hp2 = HeightProvider.trapezoid(va1, va2, 45)
		for (var i = 0 ; i < 25 ; i++){
			const value = hp2(random, context)
			expect(value).toBeLessThanOrEqual(64)
			expect(value).toBeGreaterThanOrEqual(15)
		}
	})	

	it ('Weighted List', () => {
		const hp1 = HeightProvider.weighted_list([
			{weight: 1, data: HeightProvider.constant(va1)},
		])
		expect(hp1(random, context)).toEqual(15)

		const hp2 = HeightProvider.weighted_list([
			{weight: 1, data: HeightProvider.constant(va1)},
			{weight: 1, data: HeightProvider.constant(va2)},
		])
		for (var i = 0 ; i < 25 ; i++){
			expect(hp2(random, context)).toSatisfy((v) => v === 15 || v === 64)
		}
	})
})
