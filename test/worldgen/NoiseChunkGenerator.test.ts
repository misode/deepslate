import { expect } from 'chai'
import { BlockState, Chunk, ChunkPos } from '../../src/core'
import type { NoiseGeneratorSettings, NoiseSettings, SimpleNoiseRouter } from '../../src/worldgen'
import { DensityFunction as DF, FixedBiome, NoiseChunkGenerator, NoiseRouter, Noises, SurfaceRule, TerrainShaper } from '../../src/worldgen'

describe('NoiseChunkGenerator', () => {
	const setup = (seed: bigint, generatorSettings: Partial<NoiseGeneratorSettings> = {}, noiseSettings: Partial<NoiseSettings>, router: Partial<SimpleNoiseRouter>) => {
		const biomeSource = new FixedBiome('minecraft:plains')
		const settings: NoiseGeneratorSettings = {
			defaultBlock: BlockState.STONE,
			defaultFluid: BlockState.WATER,
			seaLevel: 0,
			disableMobGeneration: false,
			aquifersEnabled: false,
			oreVeinsEnabled: false,
			legacyRandomSource: true,
			surfaceRule: SurfaceRule.NOOP,
			noise: {
				minY: 0,
				height: 64,
				xzSize: 1,
				ySize: 1,
				sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 80 },
				topSlide: { target: 0, size: 0, offset: 0 },
				bottomSlide: { target: 0, size: 0, offset: 0 },
				terrainShaper: TerrainShaper.fromJson({ offset: 0, factor: 0, jaggedness: 0 }),
				...noiseSettings,
			},
			noiseRouter: NoiseRouter.create(router),
			...generatorSettings,
		}
		const generator = new NoiseChunkGenerator(seed, biomeSource, settings)
		return { biomeSource, settings, generator }
	}

	it('fill', () => {
		const finalDensity = new DF.Noise(1, 1, Noises.SHIFT)
		const { generator } = setup(BigInt(123), {}, {}, { finalDensity })
		const chunk = new Chunk(0, 64, ChunkPos.create(4, 1))
		generator.fill(chunk)
		expect(printSlice(chunk)).equal('XXXXXXXXXXXXXXXX|XXXXXXX.XXXXXXXX|........XXXXXXXX|.......XXXXXXXXX|.......XXXXXXXXX|...........XXXXX|............XXXX|..............XX|............XXXX|....X.......XXXX|X..XXX.......XXX|XXXXXX......XXXX|XXXXXX....XXXXXX|XXXXX.....XXXXXX|XXXXXX.......XXX|XXXXXXX.......XX|XXXXXXXX......XX|XXXXXXXXX...XXX.|XXXXX......XXXX.|XX.......X.XXXX.|XX........XXXXXX|XX........X.XXXX|X.........X.....|................|................|X...............|X...............|X.X...XXX.......|..XX.XXXXX......|....XXXXXXX.....|....XXXXXXX....X|...XXXXXXX...XXX|XXXXXXXX.....XXX|..XXX.XXXXXXXXXX|...XXXXXXXXXXXXX|...XXX..XXXXXXXX|...XX...X..XXXXX|...XXX.....XXXXX|............XXXX|.....X......XXXX|......XX.......X|......XX......XX|.....XXX....XXXX|....XXXX...XXXXX|..XXXXXXXXXXXXXX|..X.XXXXXXXXXXXX|.......XXXXXXXXX|XXXX....XX.XXXXX|.XX..........X..|XXX.............|.XXX.........X..|.XX.....XX.XXX..|X.X.....XXXXXXXX|XXX.....X..XXXXX|XXX.....X.XXXX.X|XXXXXXX....XXX..|XXXXXXX....X....|XXXXXX.....XX...|XXXX.......XX..X|XXXX......XXXXXX|.........XXXXXXX|.........XXXXXXX|.........XXXXXXX|.........XXXXXXX')
	})
})

function printSlice(chunk: Chunk, z = 0) {
	return [...Array(chunk.height)].map((_, y) =>
		[...Array(16)]
			.map((_, x) => chunk.getBlockState([x & 0xF, chunk.minY + y, z & 0xF]))
			.map(state => state.is(BlockState.AIR) ? '.' : state.isFluid() ? '~' : 'X')
			.join('')
	).join('|')
}
