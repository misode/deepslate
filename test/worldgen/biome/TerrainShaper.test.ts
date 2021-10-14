import { expect } from 'chai'
import { TerrainShaper } from '../../../src/worldgen'

describe('TerrainShaper', () => {
	const DELTA = 1e-6

	it('peaksAndValleys', () => {
		expect(TerrainShaper.peaksAndValleys(-1.1)).closeTo(-0.29999998, DELTA)
		expect(TerrainShaper.peaksAndValleys(-0.7)).closeTo(0.9000001, DELTA)
		expect(TerrainShaper.peaksAndValleys(0)).closeTo(-1, DELTA)
		expect(TerrainShaper.peaksAndValleys(0.1)).closeTo(-0.6999999, DELTA)
		expect(TerrainShaper.peaksAndValleys(0.4)).closeTo(0.19999999, DELTA)
		expect(TerrainShaper.peaksAndValleys(0.6)).closeTo(0.8000001, DELTA)
		expect(TerrainShaper.peaksAndValleys(1.2)).closeTo(-0.6, DELTA)
	})

	it('offset', () => {
		const test = (a: number, b: number, c: number) => TerrainShaper.offset(TerrainShaper.point(a, b, c))

		expect(test(-1.05, 0, 0)).closeTo(-0.12297286, DELTA)
		expect(test(-0.6, 0, 0)).closeTo(-0.2072, DELTA)
		expect(test(-0.17, -0.2, 0)).closeTo(-0.0964, DELTA)
		expect(test(0, 0, 0)).closeTo(-0.085, DELTA)
		expect(test(1, 0, 0)).closeTo(0.315, DELTA)
		expect(test(0, 1, 0)).closeTo(-0.005, DELTA)
		expect(test(0, 0, 1)).closeTo(0.022458158, DELTA)
		expect(test(0.2, -0.1, 0.8)).closeTo(0.41930586, DELTA)
		expect(test(0.45, 1, -0.2)).closeTo(-0.007983704, DELTA)
		expect(test(0.05, -0.61, 0.32)).closeTo(0.28996468, DELTA)
	})

	it('factor', () => {
		const delta = 1e-4
		const test = (a: number, b: number, c: number) => TerrainShaper.factor(TerrainShaper.point(a, b, c))

		expect(test(-0.19, 0, 0)).closeTo(3.95, delta)
		expect(test(-0.16, 0, 0)).closeTo(5.707548, delta)
		expect(test(-0.12, -0.06, 0)).closeTo(4.832060, delta)
		expect(test(0, -0.3, 0)).closeTo(5.716360, delta)
		expect(test(0.03, 0.05, -0.7)).closeTo(6.286298, delta)
		expect(test(0.08, 0.42, -0.4)).closeTo(4.564640, delta)
	})

	it('jaggedness', () => {
		const delta = 1e-4
		const test = (a: number, b: number, c: number) => TerrainShaper.jaggedness(TerrainShaper.point(a, b, c))

		expect(test(-0.6, 0, 0)).closeTo(0, delta)
		expect(test(0, 0, 0)).closeTo(0, delta)
		expect(test(0.15, -0.8, -0.56)).closeTo(0.134249, delta)
		expect(test(0.4, -0.7, 0.6)).closeTo(0.172421, delta)
		expect(test(0.4, -0.7, -0.7)).closeTo(0.472540, delta)
		expect(test(0.4, -0.5, 0)).closeTo(0, delta)
	})
})
