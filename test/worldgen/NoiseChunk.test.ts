import { describe, expect, it } from 'vitest'
import { BlockState } from '../../src/core/index.js'
import type { NoiseGeneratorSettings } from '../../src/worldgen/index.js'
import { DensityFunction as DF, FluidStatus, NoiseChunk, NoiseRouter, NoiseSettings, SurfaceRule } from '../../src/worldgen/index.js'
import { RandomState } from '../../src/worldgen/RandomState.js'

describe('NoiseChunk', () => {
	const setup = (routerMods: Partial<NoiseRouter> = {}) => {
		const noiseSettings: NoiseSettings = {
			minY: -64,
			height: 384,
			xzSize: 1,
			ySize: 2,
		}
		const cellWidth = NoiseSettings.cellWidth(noiseSettings)
		const cellCountXZ = Math.floor(16 / cellWidth) // 4
		const cellHeight = NoiseSettings.cellHeight(noiseSettings)
		const cellNoiseMinY = Math.floor(noiseSettings.minY / cellHeight) // -8
		const cellCountY = Math.floor(noiseSettings.height / cellHeight) // 48
		const settings: NoiseGeneratorSettings = {
			aquifersEnabled: false,
			disableMobGeneration: false,
			legacyRandomSource: false,
			oreVeinsEnabled: false,
			seaLevel: 63,
			defaultBlock: BlockState.STONE,
			defaultFluid: BlockState.WATER,
			noise: noiseSettings,
			noiseRouter: NoiseRouter.create(routerMods),
			surfaceRule: SurfaceRule.NOOP,
		}
		const randomState = new RandomState(settings, BigInt(123))
		const chunk = new NoiseChunk(cellCountXZ, cellCountY, cellNoiseMinY, randomState, 16, -32, noiseSettings, false, () => new FluidStatus(-64, BlockState.AIR))
		return { chunk }
	}

	it('getInterpolatedState (zeroes)', () => {
		const { chunk } = setup()
		expect(chunk.getFinalState(0, 0, 0)).toEqual(BlockState.AIR)
	})

	it('getInterpolatedState (flat terrain)', () => {
		const { chunk } = setup({ finalDensity: new DF.YClampedGradient(-64, 320, -1, 1) })
		expect(chunk.getFinalState(0, 0, 0)).toEqual(BlockState.AIR)
		expect(chunk.getFinalState(0, 200, 0)).toEqual(undefined)
	})
})
