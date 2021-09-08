import { expect } from 'chai'
import { BlockState, Chunk, ChunkPos } from '../../src/core'
import type { NoiseGeneratorSettings, NoiseSettings } from '../../src/worldgen'
import { FixedBiome, NoiseChunkGenerator } from '../../src/worldgen'

describe('NoiseChunkGenerator', () => {
	const setup = (seed: number, generatorSettings: Partial<NoiseGeneratorSettings> = {}, noiseSettings: Partial<NoiseSettings>) => {
		const biomeSource = new FixedBiome('minecraft:plains', { offset: 0, factor: 1, peaks: 0, nearWater: false })
		const settings: NoiseGeneratorSettings = {
			defaultBlock: new BlockState('minecraft:stone'),
			defaultFluid: new BlockState('minecraft:water', { level: '8' }),
			bedrockRoofPosition: 0,
			bedrockFloorPosition: 0,
			seaLevel: 63,
			minSurfaceLevel: 0,
			disableMobGeneration: false,
			aquifersEnabled: false,
			noiseCavesEnabled: false,
			deepslateEnabled: false,
			oreVeinsEnabled: false,
			noodleCavesEnabled: false,
			structures: { structures: {} },
			noise: {
				minY: 0,
				height: 128,
				xzSize: 1,
				ySize: 2,
				densityFactor: 1,
				densityOffset: 0,
				sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 80 },
				topSlide: { target: 0, size: 0, offset: 0 },
				bottomSlide: { target: 0, size: 0, offset: 0 },
				useSimplexSurfaceNoise: false,
				randomDensityOffset: false,
				islandNoiseOverride: false,
				isAmplified: false,
				...noiseSettings,
			},
			...generatorSettings,
		}
		const generator = new NoiseChunkGenerator(BigInt(seed), biomeSource, settings)
		return { biomeSource, settings, generator }
	}

	it('fill', () => {
		const { generator } = setup(123, { seaLevel: 31 }, { height: 64, densityFactor: 0, sampling: { xzScale: 1, yScale: 3, xzFactor: 80, yFactor: 60 } })

		const chunk = new Chunk(0, 64, ChunkPos.create(4, 1))
		generator.fill(chunk)
		expect(printSlice(chunk)).equal('~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~XXXXXX|~~~~~~~~~~~~XXXX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|~~~~~~~~~~~~~~~~|                |                |                |                |                |                |                |                |                |                |              XX|         XXXXXXX|       XXXXXXXXX|      XXXXXXXXXX|     XXXXXXXXXXX|    XXXXXXXXXXXX|    XXXXXXXXXXXX|    XXXXXXXXXXXX|     XXXXXXXXXXX|       XXXXXXXXX|          XXXXXX|             XXX|               X|                |                |                |                |               X|             XXX|         XXXXXXX| XXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX')
	})
})

function printSlice(chunk: Chunk, z = 0) {
	return [...Array(chunk.height)].map((_, y) =>
		[...Array(16)]
			.map((_, x) => chunk.getBlockState([x & 0xF, chunk.minY + y, z & 0xF]))
			.map(state => state.getName() === 'minecraft:air' ? ' ' :
				state.isFluid() ? '~' : 'X')
			.join('')
	).join('|')
}
