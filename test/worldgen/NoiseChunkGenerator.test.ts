import { expect } from 'chai'
import { BlockState, Chunk, ChunkPos } from '../../src/core'
import type { NoiseGeneratorSettings, NoiseSettings } from '../../src/worldgen'
import { FixedBiome, NoiseChunkGenerator, SurfaceRule, TerrainShaper } from '../../src/worldgen'


describe('NoiseChunkGenerator', () => {
	const setup = (seed: number, generatorSettings: Partial<NoiseGeneratorSettings> = {}, noiseSettings: Partial<NoiseSettings>) => {
		const biomeSource = new FixedBiome('minecraft:plains')
		const settings: NoiseGeneratorSettings = {
			defaultBlock: new BlockState('minecraft:stone'),
			defaultFluid: new BlockState('minecraft:water', { level: '8' }),
			bedrockRoofPosition: 0,
			bedrockFloorPosition: 0,
			seaLevel: 63,
			disableMobGeneration: false,
			aquifersEnabled: false,
			noiseCavesEnabled: false,
			deepslateEnabled: false,
			oreVeinsEnabled: false,
			noodleCavesEnabled: false,
			legacyRandomSource: true,
			surfaceRule: SurfaceRule.NOOP,
			structures: { structures: {} },
			noise: {
				minY: 0,
				height: 128,
				xzSize: 1,
				ySize: 2,
				sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 80 },
				topSlide: { target: 0, size: 0, offset: 0 },
				bottomSlide: { target: 0, size: 0, offset: 0 },
				terrainShaper: TerrainShaper.fromJson({ offset: 0, factor: 0.1, jaggedness: 0 }),
				islandNoiseOverride: false,
				isAmplified: false,
				hasLargeBiomes: false,
				...noiseSettings,
			},
			...generatorSettings,
		}
		const generator = new NoiseChunkGenerator(BigInt(seed), biomeSource, settings)
		return { biomeSource, settings, generator }
	}

	it('fill', () => {
		const { generator } = setup(123, { seaLevel: 31 }, { height: 64, sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 60 } })

		const chunk = new Chunk(0, 64, ChunkPos.create(4, 1))
		generator.fill(chunk)
		expect(printSlice(chunk)).equal('X~~~~~XXXXXXXXXX|~~~~~~~XXXXXXXXX|~~~~~~~~XXXXXXXX|~~~~~~~~XXXXXXXX|~~~~~~~~~XXXXXXX|~~~~~~~~~XXXXXXX|~~~~~~~~~~XXXXXX|~~~~~~~~~~XXXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~XXXXXX|XX~~~~~~~~XXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXX~XXXXXXX|XXXXXX~~~~XXXXX~|XXXX........XX..|XXX.............|XXXX............|XXXXX...........|XXXXX...........|XXXXXX..........|XXXXXX..........|XXXXXX..........|XXXXXX..........|XXXXXX..........|XXXXX...........|XXXXX...........|XXX.............|XXX.............|XX..............|XX..............|XX..............|X...............|X...............|................|................|................|................|................|................|................|................|................|................|................|................|................|................')
	})
})

function printSlice(chunk: Chunk, z = 0) {
	return [...Array(chunk.height)].map((_, y) =>
		[...Array(16)]
			.map((_, x) => chunk.getBlockState([x & 0xF, chunk.minY + y, z & 0xF]))
			.map(state => state.getName() === 'minecraft:air' ? '.' :
				state.isFluid() ? '~' : 'X')
			.join('')
	).join('|')
}
