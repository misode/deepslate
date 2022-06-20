import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BlockState, Chunk, ChunkPos, Holder, Identifier } from '../../src/core/index.js'
import { NoiseParameters } from '../../src/math/index.js'
import type { NoiseSettings } from '../../src/worldgen/index.js'
import { DensityFunction as DF, FixedBiomeSource, NoiseChunkGenerator, NoiseGeneratorSettings, NoiseRouter, WorldgenRegistries } from '../../src/worldgen/index.js'
import { RandomState } from '../../src/worldgen/RandomState.js'

describe('NoiseChunkGenerator', () => {
	const setup = (seed: bigint, generatorSettings: Partial<NoiseGeneratorSettings> = {}, noiseSettings: Partial<NoiseSettings>, router: Partial<NoiseRouter>) => {
		const biomeSource = new FixedBiomeSource(Identifier.create('plains'))
		const settings = NoiseGeneratorSettings.create({
			noise: {
				minY: 0,
				height: 64,
				xzSize: 1,
				ySize: 1,
				...noiseSettings,
			},
			noiseRouter: NoiseRouter.create(router),
			...generatorSettings,
		})
		const generator = new NoiseChunkGenerator(biomeSource, settings)
		const randomState = new RandomState(settings, seed)
		return { biomeSource, settings, generator, randomState }
	}

	beforeEach(() => {
		WorldgenRegistries.NOISE.register(Identifier.create('offset'), NoiseParameters.create(-3, [1, 1, 1, 0]))
	})

	afterEach(() => {
		WorldgenRegistries.NOISE.clear()
	})

	it('fill', () => {
		const finalDensity = new DF.Noise(1, 1, Holder.reference(WorldgenRegistries.NOISE, Identifier.create('offset')))
		const { generator, randomState } = setup(BigInt(123), {}, {}, { finalDensity })
		const chunk = new Chunk(0, 64, ChunkPos.create(4, 1))
		generator.fill(randomState, chunk)
		expect(printSlice(chunk)).toEqual('.....XXXX.......|.....XXX........|.....XXX....X...|......X....XX..X|............X..X|.X.............X|XXX.............|XXX.............|XXX.............|XXX......XX....X|XXX.....XXXXXXXX|XXXX..XXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXX.|XXXXXXX.XXXXXXX.|XXXXXX...XXXXXXX|XXX.........XXXX|XXX.........XXXX|XXX..........XXX|XX...........XXX|..............XX|...............X|................|X...XXXX........|XXXXXXXXXXXX..X.|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXX..XXX|XXXXXXXXXX..XXXX|XXXXXXXX........|XXXXXXXX........|XXXXXXXX........|XXXXXXXX........|XXXXXXXXX.XXX...|XXXXXXXXXXXXXX..|XXXXXXX.XXXXXXX.|XXXXX...XXXXXXX.|XXXXX....XXXXX..|XXXXXX...XXXXX..|XXXXXX...XXXXX..|XXXXXXXX..XXX...|.XXXX......XXX..|............X...|...........XX...|............XXX.|............XXX.|...........XXXXX|..XX........XXXX|..XX.........XX.|..XX.........X..|.XXX.........X..|XXX.............|XX..............|XXX.............|XXXX............|XXXX............|XXX.............|XX..............|................|.....XXXX......X|...XXXXXX....XXX')
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
