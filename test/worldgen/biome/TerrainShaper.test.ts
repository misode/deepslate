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
})
