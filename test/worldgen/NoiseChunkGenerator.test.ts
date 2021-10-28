import { expect } from 'chai'
import { BlockState, Chunk, ChunkPos } from '../../src/core'
import type { NoiseGeneratorSettings, NoiseSettings } from '../../src/worldgen'
import { FixedBiome, NoiseChunkGenerator, TerrainShaper } from '../../src/worldgen'


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
			structures: { structures: {} },
			noise: {
				minY: 0,
				height: 128,
				xzSize: 1,
				ySize: 2,
				densityFactor: 0,
				densityOffset: -0.030078125,
				sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 80 },
				topSlide: { target: 0, size: 0, offset: 0 },
				bottomSlide: { target: 0, size: 0, offset: 0 },
				terrainShaper: new TerrainShaper(() => 0.51875, () => 1, () => 0),
				useSimplexSurfaceNoise: false,
				randomDensityOffset: false,
				islandNoiseOverride: false,
				isAmplified: false,
				useLegacyRandom: false,
				...noiseSettings,
			},
			octaves: {
				temperature: { firstOctave: 0, amplitudes: [0] },
				humidity: { firstOctave: 0, amplitudes: [0] },
				continentalness: { firstOctave: 0, amplitudes: [0] },
				erosion: { firstOctave: 0, amplitudes: [0] },
				weirdness: { firstOctave: 0, amplitudes: [0] },
				shift: { firstOctave: 0, amplitudes: [0] },
			},
			...generatorSettings,
		}
		const generator = new NoiseChunkGenerator(BigInt(seed), biomeSource, settings)
		return { biomeSource, settings, generator }
	}

	it('fill', () => {
		const { generator } = setup(123, { seaLevel: 31 }, { height: 64, densityOffset: 0.02, sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 60 } })

		const chunk = new Chunk(0, 64, ChunkPos.create(4, 1))
		generator.fill(chunk)
		expect(printSlice(chunk)).equal('~~~~~~~~~~~~~~~X|~~~~~~~~~~~~~~~X|~~~~~~~~~~~~~~~X|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~~XX|~~~~~~~~~~~~~XXX|~~~~~~~~~~~~~XXX|~~~~~~~~~~~~~XXX|~~~~~~~~~~~~~XXX|~~~~~~~~~~~~XXXX|~~~~~~~~~~~~XXXX|~~~~~~~~~~~XXXXX|~~~~~~~~~~~XXXXX|XXX~~~~~~~XXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXXXXXXXXXX|XXXXXXXX..XXXXXX|XXXXXXXX........|XXXXXXX.........|XXXXXXX.........|XXXXXXX.........|XXXXXXX.........|XXXXXXX.........|XXXXXXX.........|XXXXXX..........|XXXXXX..........|XXXXX...........|XXXX............|XXX.............|XXX.............|XXX.............|XX..............|XX..............|X...............|................|................|................|................|................|................|................|................|................|................|................|................')
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
