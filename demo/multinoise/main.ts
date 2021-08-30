import type { NoiseParams } from 'deepslate'
import { Climate, MultiNoise } from 'deepslate'
import colors from './colors.json'

const noise: NoiseParams = { firstOctave: -7, amplitudes: [1, 1] }
const netherBiomes = new Climate.Parameters([
	[Climate.parameters(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:nether_wastes'],
	[Climate.parameters(0.0, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:soul_sand_valley'],
	[Climate.parameters(0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => 'minecraft:crimson_forest'],
	[Climate.parameters(0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.375), () => 'minecraft:warped_forest'],
	[Climate.parameters(-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.175), () => 'minecraft:basalt_deltas'],
])
const nether = new MultiNoise(BigInt(5392), netherBiomes, noise, noise, noise, noise, noise)
plot('Nether', nether)

fetch('https://raw.githubusercontent.com/misode/vanilla-worldgen/1.18-experimental/dimension/overworld.json')
	.then(r => r.json())
	.then(data => {
		const source = data.generator.biome_source
		const biomes = new Climate.Parameters<string>(source.biomes
			.map((b: any) => [readParams(b.parameters), () => b.biome]))

		const overworld = new MultiNoise(BigInt(5394), biomes, source.temperature_noise, source.humidity_noise, source.continentalness_noise, source.erosion_noise, source.weirdness_noise)
		plot('Overworld', overworld)
	})

function readParams(params: any) {
	const p = ['temperature', 'humidity', 'continentalness', 'erosion', 'depth', 'weirdness'].map(c => {
		const value = params[c]
		return typeof value === 'number' ? Climate.param(value) : Climate.range(value[0], value[1])
	})
	return new Climate.ParamPoint(p[0], p[1], p[2], p[3], p[4], p[5], params.offset)
}

function plot(name: string, source: MultiNoise, size = 160, res = 2) {
	const plot = document.createElement('div')
	const label = document.createElement('span')
	label.textContent = `${name} (loading)`
	plot.append(label)
	plot.classList.add('plot')
	const canvas = document.createElement('canvas')
	canvas.classList.add('pixelated')
	canvas.style.width = `${size * res}px`
	canvas.style.height = `${size * res}px`
	canvas.width = size
	canvas.height = size
	plot.append(canvas)
	document.querySelector('main')?.append(plot)

	const ctx = canvas.getContext('2d')!
	const img = ctx.createImageData(size, size)

	setTimeout(() => {
		const unknown = new Set<string>()

		const t0 = performance.now()
		for (let x = 0; x < size; x += 1) {
			for (let z = 0; z < size; z += 1) {
				const i = z * 4 + x * 4 * img.width
				const biome = source.getBiome(x, 64, z) as keyof typeof colors
				const color = colors[biome]
				if (color === undefined) {
					unknown.add(biome)
					continue
				}
				img.data[i] = color[0]
				img.data[i + 1] = color[1]
				img.data[i + 2] = color[2]
				img.data[i + 3] = 255
			}
		}
		const t1 = performance.now()
		label.textContent = `${name} (${(t1 - t0).toFixed(0)}ms)`

		if (unknown.size > 0) {
			console.warn(`Encountered unknown biomes: ${[...unknown].join(', ')}`)
		}
	
		ctx.putImageData(img, 0, 0)
	})
}
