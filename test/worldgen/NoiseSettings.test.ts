import { expect } from 'chai'
import { NoiseSettings, NoiseSlideSettings, TerrainShaper } from '../../src/worldgen'

describe('NoiseSettings', () => {
	const setup = () => {
		const settings: NoiseSettings = {
			minY: -64,
			height: 384,
			xzSize: 1,
			ySize: 2,
			sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 80 },
			topSlide: { target: -5, offset: 1, size: 2 },
			bottomSlide: { target: 10, offset: 0, size: 2 },
			terrainShaper: TerrainShaper.fromJson({ offset: 0, factor: 0, jaggedness: 0 }),
		}
		return { settings }
	}

	it('cellWidth', () => {
		const { settings } = setup()
		expect(NoiseSettings.cellWidth(settings)).equal(4)
	})

	it('cellHeight', () => {
		const { settings } = setup()
		expect(NoiseSettings.cellHeight(settings)).equal(8)
	})

	it('cellCountY', () => {
		const { settings } = setup()
		expect(NoiseSettings.cellCountY(settings)).equal(48)
	})

	it('minCellY', () => {
		const { settings } = setup()
		expect(NoiseSettings.minCellY(settings)).equal(-8)
	})

	it('applySlides', () => {
		const { settings } = setup()
		expect(NoiseSettings.applySlides(settings, 0, 0)).equal(0)
		expect(NoiseSettings.applySlides(settings, 0, -64)).equal(10)
		expect(NoiseSettings.applySlides(settings, 0, 319)).equal(-5)
		expect(NoiseSettings.applySlides(settings, 0, 313)).equal(-5)
		expect(NoiseSettings.applySlides(settings, 0, 40)).equal(0)
	})

	describe('NoiseSlideSettings', () => {
		it('apply', () => {
			expect(NoiseSlideSettings.apply({ target: 5, offset: 0, size: 1 }, 0, 0)).equal(5)
			expect(NoiseSlideSettings.apply({ target: 5, offset: 0, size: 1 }, 0, 2)).equal(0)
			expect(NoiseSlideSettings.apply({ target: 5, offset: 0, size: 1 }, 0.2, 0)).equal(5)
			expect(NoiseSlideSettings.apply({ target: 5, offset: 0, size: 1 }, 0.2, 2)).equal(0.2)
			expect(NoiseSlideSettings.apply({ target: 5, offset: 0, size: 2 }, 0, 1)).equal(2.5)
			expect(NoiseSlideSettings.apply({ target: 5, offset: 1, size: 2 }, 0, 1)).equal(5)
			expect(NoiseSlideSettings.apply({ target: 5, offset: 1, size: 2 }, 0, 2)).equal(2.5)
		})
	})
})
