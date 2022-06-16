import { describe, expect, it } from 'vitest'
import { NoiseSettings } from '../../src/worldgen/index.js'

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
		expect(NoiseSettings.cellWidth(settings)).toEqual(4)
	})

	it('cellHeight', () => {
		const { settings } = setup()
		expect(NoiseSettings.cellHeight(settings)).toEqual(8)
	})

	it('cellCountY', () => {
		const { settings } = setup()
		expect(NoiseSettings.cellCountY(settings)).toEqual(48)
	})

	it('minCellY', () => {
		const { settings } = setup()
		expect(NoiseSettings.minCellY(settings)).toEqual(-8)
	})
})
