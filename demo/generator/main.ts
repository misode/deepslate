import type { NoiseGeneratorSettings } from 'deepslate'
import { BlockState, Chunk, ChunkPos, FixedBiome, NoiseChunkGenerator } from 'deepslate'

const HEIGHT = 256
const RATIO = 3 / 2

const colors: Record<string, [number, number, number]> = {
	'minecraft:air': [150, 160, 170],
	'minecraft:water': [20, 80, 170],
	'minecraft:lava': [200, 100, 0],
	'minecraft:stone': [50, 50, 50],
	'minecraft:netherrack': [100, 40, 40],
}

const overworldSettings: NoiseGeneratorSettings = {
	defaultBlock: new BlockState('minecraft:stone'),
	defaultFluid: new BlockState('minecraft:water', { level: '0' }),
	bedrockRoofPosition: -2147483648,
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
		height: HEIGHT,
		xzSize: 1,
		ySize: 2,
		densityFactor: 1,
		densityOffset: -0.51875,
		sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 160 },
		topSlide: { target: -10, size: 2, offset: 0 },
		bottomSlide: { target: 15, size: 3, offset: 0 },
		useSimplexSurfaceNoise: false,
		randomDensityOffset: false,
		islandNoiseOverride: false,
		isAmplified: false,
	},
}

const oceanBiomeSource = new FixedBiome('minecraft:ocean', { offset: -0.22, factor: 800, peaks: 0, nearWater: false })
const oceanGenerator = new NoiseChunkGenerator(BigInt(125), oceanBiomeSource, overworldSettings)
plot('Overworld ocean', oceanGenerator, 256, 37)

const plainsBiomeSource = new FixedBiome('minecraft:plains', { offset: 0.06, factor: 600, peaks: 0, nearWater: false })
const plainsGenerator = new NoiseChunkGenerator(BigInt(125), plainsBiomeSource, overworldSettings)
plot('Overworld plains', plainsGenerator, 256, 37)

const peaksBiomeSource = new FixedBiome('minecraft:plains', { offset: 0.27, factor: 600, peaks: 70, nearWater: false })
const peaksGenerator = new NoiseChunkGenerator(BigInt(125), peaksBiomeSource, overworldSettings)
plot('Overworld peaks', peaksGenerator, 256, 37)

const netherSettings: NoiseGeneratorSettings = {
	defaultBlock: new BlockState('minecraft:netherrack'),
	defaultFluid: new BlockState('minecraft:lava', { level: '0' }),
	bedrockRoofPosition: 0,
	bedrockFloorPosition: 0,
	seaLevel: 32,
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
		sampling: { xzScale: 1, yScale: 3, xzFactor: 80, yFactor: 60 },
		topSlide: { target: 120, size: 3, offset: 0 },
		bottomSlide: { target: 320, size: 4, offset: -1 },
		useSimplexSurfaceNoise: false,
		randomDensityOffset: false,
		islandNoiseOverride: false,
		isAmplified: false,
	},
}
const netherBiomeSource = new FixedBiome('minecraft:nether_wastes', { offset: 0, factor: 1, peaks: 0, nearWater: false })
const netherGenerator = new NoiseChunkGenerator(BigInt(126), netherBiomeSource, netherSettings)
plot('Nether', netherGenerator, 128, 31)

function plot(name: string, generator: NoiseChunkGenerator, height: number, z = 0) {
	const plot = document.createElement('div')
	const label = document.createElement('span')
	label.textContent = `${name} (loading)`
	plot.append(label)
	plot.classList.add('plot')
	const canvas = document.createElement('canvas')
	canvas.classList.add('pixelated')
	canvas.style.width = `${HEIGHT * RATIO}px`
	canvas.style.height = `${HEIGHT}px`
	const width = height * RATIO
	canvas.width = width
	canvas.height = height
	plot.append(canvas)
	document.querySelector('main')?.append(plot)

	const ctx = canvas.getContext('2d')!
	const img = ctx.createImageData(width, height)

	setTimeout(() => {
		const t0 = performance.now()

		const chunks = [...Array(Math.ceil(width / 16))].map((_, i) => new Chunk(0, height, ChunkPos.create(i, z >> 4)))
		chunks.forEach(chunk => generator.fill(chunk))

		for (let x = 0; x < width; x += 1) {
			for (let y = 0; y <= height; y += 1) {
				const i = x * 4 + (height-y-1) * 4 * img.width
				const state = chunks[x >> 4].getBlockState([x & 0xF, y, z & 0xF])
				const color = colors[state.getName()] ?? [0, 0, 0]
				img.data[i] = color[0]
				img.data[i + 1] = color[1]
				img.data[i + 2] = color[2]
				img.data[i + 3] = 255
			}
		}
		const t1 = performance.now()
		label.textContent = `${name} (${(t1 - t0).toFixed(0)}ms)`

		ctx.putImageData(img, 0, 0)
	})
}
