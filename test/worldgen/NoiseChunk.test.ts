import { expect } from 'chai'
import { describe, it } from 'vitest'
import { BlockState } from '../../src/core/index.js'
import type { SimpleNoiseRouter } from '../../src/worldgen/index.js'
import { DensityFunction as DF, FluidStatus, NoiseChunk, NoiseRouter, NoiseSettings } from '../../src/worldgen/index.js'

describe('NoiseChunk', () => {
	const setup = (routerMods: Partial<SimpleNoiseRouter> = {}) => {
		const settings: NoiseSettings = {
			minY: -64,
			height: 384,
			xzSize: 1,
			ySize: 2,
		}
		const simpleRouter = NoiseRouter.create(routerMods)
		const cellWidth = NoiseSettings.cellWidth(settings)
		const cellCountXZ = Math.floor(16 / cellWidth) // 4
		const cellHeight = NoiseSettings.cellHeight(settings)
		const cellNoiseMinY = Math.floor(settings.minY / cellHeight) // -8
		const cellCountY = Math.floor(settings.height / cellHeight) // 48
		const router = NoiseRouter.withSettings(simpleRouter, settings, BigInt(123))
		const chunk = new NoiseChunk(cellCountXZ, cellCountY, cellNoiseMinY, router, 16, -32, settings, false, () => new FluidStatus(-64, BlockState.AIR))
		return { chunk }
	}

	it('getInterpolatedState (zeroes)', () => {
		const { chunk } = setup()
		expect(chunk.getFinalState(0, 0, 0)).equal(BlockState.AIR)
	})

	it('getInterpolatedState (flat terrain)', () => {
		const { chunk } = setup({ finalDensity: new DF.YClampedGradient(-64, 320, -1, 1) })
		expect(chunk.getFinalState(0, 0, 0)).equal(BlockState.AIR)
		expect(chunk.getFinalState(0, 200, 0)).equal(undefined)
	})
})
