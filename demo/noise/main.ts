import { BlendedNoise, ImprovedNoise, NormalNoise, PerlinNoise, PerlinSimplexNoise, Random, SimplexNoise } from 'deepslate'

const SIZE = 160
const RES = 2

const noise0 = new ImprovedNoise(new Random(BigInt(6203)))
plot('Improved', (x: number, y: number) => noise0.sample(x / 16, y / 16, 0))

const noise1 = new PerlinNoise(new Random(BigInt(6203)), -6, [1, 1])
plot('Perlin -6, [1, 1]', (x: number, y: number) => noise1.sample(x, y, 0))

const noise2 = new PerlinNoise(new Random(BigInt(6203)), -5, [1, 1, 1, 1])
plot('Perlin -5, [1, 1, 1, 1]', (x: number, y: number) => noise2.sample(x, y, 0))

const noise3 = new PerlinNoise(new Random(BigInt(6203)), -5, [1, 0, 2, 3])
plot('Perlin -5, [1, 0, 2, 3]', (x: number, y: number) => noise3.sample(x, y, 0))

const noise4 = new PerlinNoise(new Random(BigInt(6203)), -4, [1, 1])
plot('Perlin -4, [1, 1]', (x: number, y: number) => noise4.sample(x, y, 0))

const noise5 = new NormalNoise(new Random(BigInt(6203)), -6, [1, 1])
plot('Normal -6, [1, 1]', (x: number, y: number) => noise5.sample(x, y, 0), -1, 1)

const noise6 = new NormalNoise(new Random(BigInt(6203)), -5, [1, 1, 1, 1])
plot('Normal -5, [1, 1, 1, 1]', (x: number, y: number) => noise6.sample(x, y, 0), -1, 1)

const noise7 = new BlendedNoise(new Random(BigInt(6203)))
plot('Blended', (x: number, y: number) => noise7.sample(x, y, 0, 600, 600, 8, 4), -256, 256)

const noise8 = new SimplexNoise(new Random(BigInt(6203)))
plot('Simplex', (x: number, y: number) => noise8.sample(x / 16, y / 16, 0))

const noise9 = new PerlinSimplexNoise(new Random(BigInt(6203)), [-3, -2, -1])
plot('PerlinSimplex [-3, -2, -1]', (x: number, y: number) => noise9.sample(x / 16, y / 16, false))

function plot(name: string, sampler: (x: number, y: number) => number, min = -1, max = 1) {
	const plot = document.createElement('div')
	const label = document.createElement('span')
	label.textContent = `${name} (loading)`
	plot.append(label)
	plot.classList.add('plot')
	const canvas = document.createElement('canvas')
	canvas.classList.add('pixelated')
	canvas.style.width = `${SIZE * RES}px`
	canvas.style.height = `${SIZE * RES}px`
	canvas.width = SIZE
	canvas.height = SIZE
	plot.append(canvas)
	document.querySelector('main')?.append(plot)

	const ctx = canvas.getContext('2d')!
	const img = ctx.createImageData(SIZE, SIZE)

	setTimeout(() => {
		const t0 = performance.now()
		for (let x = 0; x < SIZE; x += 1) {
			for (let y = 0; y < SIZE; y += 1) {
				const i = y * 4 + x * 4 * img.width
				const value = sampler(x, y)
				const color = (value - min) / (max - min) * 256
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
