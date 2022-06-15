import { expect } from 'chai'
import { describe, it } from 'vitest'
import { BlockState, Chunk, ChunkPos, Identifier } from '../../src/core/index.js'
import type { NoiseGeneratorSettings, NoiseSettings, SimpleNoiseRouter } from '../../src/worldgen/index.js'
import { DensityFunction as DF, FixedBiome, NoiseChunkGenerator, NoiseRouter, Noises, SurfaceRule } from '../../src/worldgen/index.js'

describe('NoiseChunkGenerator', () => {
	const setup = (seed: bigint, generatorSettings: Partial<NoiseGeneratorSettings> = {}, noiseSettings: Partial<NoiseSettings>, router: Partial<SimpleNoiseRouter>) => {
		const biomeSource = new FixedBiome(Identifier.create('plains'))
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
		expect(printSlice(chunk)).equal('XXXX.......XXXXX|.XXXX......XXXXX|.XXX.......XXXX.|..XX........XXX.|............XXX.|............XX..|............XXXX|XX..........XXXX|XX....X.......XX|XXX.XX..........|XXXXX...........|XXXXX..........X|..XXXXXXX......X|...XXXXXXX......|...XXXXXXX......|.....XXXXX......|......XXXXXXX...|XX.....XXXXXX...|XXX....XXXXXX...|XX......XXXX....|.........XXX....|................|................|..XXXXXXX.......|..XXXXXXX.......|..XXXXXXX.......|...XXXXXX.......|.....XXXX.......|...XXXX.........|....XXX.........|....XXXX........|XXXXXXXX........|XXXXXXXX........|XXXXXXXX........|XXXXXXXX...X....|XXXXXXXX..XX....|XXXXXXXXX.......|XXXXXXXX........|...XXXXXX.......|....XXXXXXX.....|....XXXXXXXXX...|.....XXXXXXXXX..|.....XXXXXXXX...|X....XXXXXX.....|X.....XXXX......|XX.....XX.......|XX...........XXX|XX........XXXXXX|XXX......XXXXXXX|..XX...XXXXXXXXX|.XX.....XXXXXXXX|XXX.....XXXXXXX.|XXX.....XXXXX...|.XX.....XXXX....|XXXX....XXXX....|XXXXXXX..XXX....|.XXXXXX..X......|.XXXXX..........|..XXX.........XX|..XXX........XXX|..XXX.......XXXX|..XX.........XXX|..XXX.....X.....|...XXX....X.....')
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
