import { expect } from 'chai'
import { NoiseSettings } from '../../src/worldgen'

describe('NoiseSettings', () => {
	const setup = () => {
		const settings: NoiseSettings = {
			minY: -64,
			height: 384,
			xzSize: 1,
			ySize: 2,
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
})
