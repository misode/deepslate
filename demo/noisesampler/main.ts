import type { BiomeSource, NoiseSettings } from 'deepslate'
import { BlendedNoise, FixedBiome, NoiseSampler, WorldgenRandom } from 'deepslate'

const overworldSettings: NoiseSettings = {
	minY: 0,
	height: 256,
	densityFactor: 1,
	densityOffset: 0,
	xzSize: 1,
	ySize: 2,
	sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 160 },
	bottomSlide: { offset: 0, size: 0, target: 0 },
	topSlide: { offset: 0, size: 0, target: 0 },
	useSimplexSurfaceNoise: false,
	randomDensityOffset: false,
	islandNoiseOverride: false,
	isAmplified: false,
}

const blendedNoise = new BlendedNoise(new WorldgenRandom(BigInt(40162)))

const defaultBiomeSource = new FixedBiome('minecraft:plains', { offset: 0.03, factor: 343, peaks: 0, nearWater: false })
const overworldSampler = new NoiseSampler(4, 8, 48, defaultBiomeSource, overworldSettings, blendedNoise)
plot('Overworld', overworldSampler, 384)

const peaksBiomeSource = new FixedBiome('minecraft:plains', { offset: 0.0, factor: 600, peaks: 80, nearWater: false })
const peaksSampler = new NoiseSampler(4, 8, 48, peaksBiomeSource, overworldSettings, blendedNoise)
plot('Overworld peaks', peaksSampler, 384)

document.querySelector('main')?.append(document.createElement('hr'))

const netherBiomeSource: BiomeSource = {
	getBiome: () => 'minecraft:nether_wastes',
	getTerrainShape: () => ({ offset: 0, factor: 1, peaks: 0, nearWater: false }),
}
const netherSettings: NoiseSettings = {
	minY: 0,
	height: 256,
	densityFactor: 0,
	densityOffset: -0.03,
	xzSize: 2,
	ySize: 1,
	sampling: {
		xzScale: 1,
		yScale: 1,
		xzFactor: 80,
		yFactor: 80,
	},
	bottomSlide: { offset: -1, size: 4, target: 320 },
	topSlide: { offset: 0, size: 3, target: 120 },
	useSimplexSurfaceNoise: false,
	randomDensityOffset: false,
	islandNoiseOverride: false,
	isAmplified: false,
}
const netherNoise = new BlendedNoise(new WorldgenRandom(BigInt(40162)))
const netherSampler = new NoiseSampler(4, 8, 16, netherBiomeSource, netherSettings, netherNoise);
[0, 1, 2, 3, 4, 5].forEach(z => {
	plot(`Nether z=${z}`, netherSampler, 128, z)
})

document.querySelector('main')?.append(document.createElement('hr'))

plotXZ('Nether top-down y=64', netherSampler, 128)

function plot(name: string, sampler: NoiseSampler, height: number, z = 0) {
	const HEIGHT = height / 8
	const WIDTH = HEIGHT * 2
	const plot = document.createElement('div')
	const label = document.createElement('span')
	label.textContent = `${name} (loading)`
	plot.append(label)
	plot.classList.add('plot')
	const canvas = document.createElement('canvas')
	canvas.classList.add('pixelated')
	canvas.style.width = `${WIDTH * 6}px`
	canvas.style.height = `${HEIGHT * 6}px`
	canvas.width = WIDTH
	canvas.height = HEIGHT
	plot.append(canvas)
	document.querySelector('main')?.append(plot)

	const ctx = canvas.getContext('2d')!
	const img = ctx.createImageData(WIDTH, HEIGHT)

	setTimeout(() => {
		const t0 = performance.now()
		const column = Array(HEIGHT + 1)
		for (let x = 0; x < WIDTH; x += 1) {
			sampler.fillNoiseColumn(column, x, z, 0, HEIGHT)
			for (let y = 0; y <= HEIGHT; y += 1) {
				const i = x * 4 + (HEIGHT-y) * 4 * img.width
				const color = (Math.max(-1, Math.min(1, column[y] / -200)) + 1) * 128
				img.data[i] = color
				img.data[i + 1] = color
				img.data[i + 2] = color
				img.data[i + 3] = 255
			}
		}
		const t1 = performance.now()
		label.textContent = `${name} (${(t1 - t0).toFixed(0)}ms)`

		ctx.putImageData(img, 0, 0)
	})
}

function plotXZ(name: string, sampler: NoiseSampler, height: number, y = 64) {
	const HEIGHT = height / 8
	const SIZE = height / 2
	const plot = document.createElement('div')
	const label = document.createElement('span')
	label.textContent = `${name} (loading)`
	plot.append(label)
	plot.classList.add('plot')
	const canvas = document.createElement('canvas')
	canvas.classList.add('pixelated')
	canvas.style.width = `${SIZE * 6}px`
	canvas.style.height = `${SIZE * 6}px`
	canvas.width = SIZE
	canvas.height = SIZE
	plot.append(canvas)
	document.querySelector('main')?.append(plot)

	const ctx = canvas.getContext('2d')!
	const img = ctx.createImageData(SIZE, SIZE)

	setTimeout(() => {
		const t0 = performance.now()
		const column = Array(HEIGHT + 1)
		for (let x = 0; x < SIZE; x += 1) {
			for (let z = 0; z <= SIZE; z += 1) {
				sampler.fillNoiseColumn(column, x, z, 0, HEIGHT)
				const i = x * 4 + (SIZE-z) * 4 * img.width
				const color = (Math.max(-1, Math.min(1, column[y/8] / -200)) + 1) * 128
				img.data[i] = color
				img.data[i + 1] = color
				img.data[i + 2] = color
				img.data[i + 3] = 255
			}
		}
		const t1 = performance.now()
		label.textContent = `${name} (${(t1 - t0).toFixed(0)}ms)`

		ctx.putImageData(img, 0, 0)
	})
}
