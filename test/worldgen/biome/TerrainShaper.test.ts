import { expect } from 'chai'
import { TerrainShaper } from '../../../src/worldgen'

describe('TerrainShaper', () => {
	const DELTA = 1e-6

	it('nearWater', () => {
		expect(TerrainShaper.nearWater(-0.3, 0)).false
		expect(TerrainShaper.nearWater(-0.1, 0)).true
		expect(TerrainShaper.nearWater(0, 0)).true
		expect(TerrainShaper.nearWater(0, 0.2)).false
	})

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
		expect(test(-0.17, -0.2, 0)).closeTo(-0.1464, DELTA)
		expect(test(0, 0, 0)).closeTo(-0.085, DELTA)
		expect(test(1, 0, 0)).closeTo(-0.035, DELTA)
		expect(test(0, 1, 0)).closeTo(-0.005, DELTA)
		expect(test(0, 0, 1)).closeTo(0.022458158, DELTA)
		expect(test(0.2, -0.1, 0.8)).closeTo(0.41930586, DELTA)
		expect(test(0.45, 1, -0.2)).closeTo(-0.007983704, DELTA)
		expect(test(0.05, -0.61, 0.32)).closeTo(0.28996468, DELTA)
	})

	it('factor', () => {
		const delta = 1e-3
		const test = (a: number, b: number, c: number) => TerrainShaper.factor(TerrainShaper.point(a, b, c))

		expect(test(-0.19, 0, 0)).closeTo(505.0, delta)
		expect(test(-0.16, 0, 0)).closeTo(701.6661, delta)
		expect(test(-0.12, -0.06, 0)).closeTo(430.7698, delta)
		expect(test(0, -0.3, 0)).closeTo(656.7592, delta)
		expect(test(0.03, 0.05, -0.7)).closeTo(650.0, delta)
		expect(test(0.08, 0.42, -0.4)).closeTo(450.40015, delta)
	})

	it('peaks', () => {
		const delta = 1e-4
		const test = (a: number, b: number, c: number) => TerrainShaper.peaks(TerrainShaper.point(a, b, c))

		expect(test(-0.6, 0, 0)).closeTo(0, delta)
		expect(test(0, 0, 0)).closeTo(0, delta)
		expect(test(0.15, -0.8, -0.56)).closeTo(25.920004, delta)
		expect(test(0.4, -0.7, 0.6)).closeTo(14.238281, delta)
		expect(test(0.4, -0.7, -0.7)).closeTo(64.5996, delta)
		expect(test(0.4, -0.5, 0)).closeTo(0, delta)
	})
})
