import { expect } from 'chai'
import { BlockState } from '../../src/core'
import type { NoiseGeneratorSettings, SimpleNoiseRouter } from '../../src/worldgen'
import { Climate, DensityFunction as DF, FluidStatus, NoiseChunk, NoiseRouter, Noises, TerrainShaper } from '../../src/worldgen'

describe('NoiseChunk', () => {
	const setup = (routerMods: Partial<SimpleNoiseRouter> = {}) => {
		const settings: Partial<NoiseGeneratorSettings> = {
			noise: {
				minY: -64,
				height: 384,
				xzSize: 1,
				ySize: 2,
				sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 80 },
				topSlide: { target: 0, offset: 0, size: 0 },
				bottomSlide: { target: 0, offset: 0, size: 0 },
				terrainShaper: TerrainShaper.fromJson({ offset: 0, factor: 0, jaggedness: 0 }),
			},
			noiseRouter: {
				barrier: DF.Constant.ZERO,
				fluidLevelFloodedness: DF.Constant.ZERO,
				fluidLevelSpread: DF.Constant.ZERO,
				lava: DF.Constant.ZERO,
				temperature: DF.Constant.ZERO,
				vegetation: DF.Constant.ZERO,
				continents: DF.Constant.ZERO,
				erosion: DF.Constant.ZERO,
				depth: DF.Constant.ZERO,
				ridges: DF.Constant.ZERO,
				initialDensityWithoutJaggedness: DF.Constant.ZERO,
				finalDensity: DF.Constant.ZERO,
				veinToggle: DF.Constant.ZERO,
				veinRidged: DF.Constant.ZERO,
				veinGap: DF.Constant.ZERO,
				...routerMods,
			},
			aquifersEnabled: false,
		}
		const { xzSize, ySize, minY, height } = settings.noise!
		const cellWidth = Math.floor(16 / (xzSize << 2)) // 4
		const cellCountXZ = Math.floor(16 / cellWidth) // 4
		const cellHeight = Math.floor(16 / (ySize << 2)) // 8
		const cellNoiseMinY = Math.floor(minY / cellHeight) // -8
		const cellCountY = Math.floor(height / cellHeight) // 48
		const minX = 16
		const minZ = -32
		const router = NoiseRouter.create(settings.noiseRouter!, settings.noise!, BigInt(123))
		const chunk = new NoiseChunk(cellCountXZ, cellCountY, cellNoiseMinY, router, minX, minZ, settings as any, () => new FluidStatus(-64, BlockState.AIR))
		return { chunk }
	}

	it('cachedClimateSampler', () => {
		const sampler1 = setup().chunk.cachedClimateSampler()
		expect(sampler1.sample(1, 2, 3)).deep.equal(Climate.target(0, 0, 0, 0, 0, 0))
		const sampler2 = setup({ temperature: new DF.Noise(1, 1, Noises.TEMPERATURE) }).chunk.cachedClimateSampler()
		expect(sampler2.sample(1, 2, 3)).deep.equal(Climate.target(-0.737807411456493, 0, 0, 0, 0, 0))
		expect(sampler2.sample(2, 3, 4)).deep.equal(Climate.target(-0.727941367417127, 0, 0, 0, 0, 0))
		expect(sampler2.sample(200, 3, 4)).deep.equal(Climate.target(0.25749468937699066, 0, 0, 0, 0, 0))
	})

	const selectFirstCell = (chunk: NoiseChunk) => {
		chunk.advanceCellX(0)
		chunk.selectCellYZ(chunk.cellCountY - 1, 0)
		chunk.updateForY((chunk.cellNoiseMinY + chunk.cellCountY - 1) * chunk.cellHeight, 0)
		chunk.updateForX(chunk.minX, 0)
		chunk.updateForZ(chunk.minZ, 0)
	}

	it('getInterpolatedState (zeroes)', () => {
		const { chunk } = setup()
		selectFirstCell(chunk)
		expect(chunk.getInterpolatedState()).equal(BlockState.AIR)
	})

	it('getInterpolatedState (flat terrain)', () => {
		const { chunk } = setup({ finalDensity: new DF.YClampedGradient(-64, 320, -1, 1) })
		selectFirstCell(chunk)
		expect(chunk.getInterpolatedState()).equal(undefined)
		chunk.selectCellYZ(4, 0)
		chunk.updateForY((chunk.cellNoiseMinY + 4) * chunk.cellHeight, 0)
		chunk.updateForX(chunk.minX, 0)
		chunk.updateForZ(chunk.minZ, 0)
		expect(chunk.getInterpolatedState()).equal(BlockState.AIR)
	})
})
