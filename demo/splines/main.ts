import { Spline, TerrainShaper } from 'deepslate'

const WIDTH = 300
const HEIGHT = 200

const spline = new Spline<number>('spline', x => x).addPoint(0, 0).addPoint(1, 1)
plot('Simple [0, 0] -> [1, 1]', 0, 1, x => spline.apply(x))

const spline2 = new Spline<number>('spline2', x => x)
	.addPoint(0, 0)
	.addPoint(0.4, new Spline<number>('spline3', x => 2 * x - x * x)
		.addPoint(0.2, -1)
		.addPoint(1, 1))
plot('Nested with different mapper', 0, 1, x => spline2.apply(x))

plot('Offset from continentalness [-1.1, 1]', -1.1, 1, x => TerrainShaper.offset(TerrainShaper.point(x, -0.45, 0)))
plot('Factor from continentalness [-0.3, 0.3]', -0.3, 0.3, x => TerrainShaper.factor(TerrainShaper.point(x, -0.45, 0)))
plot('Peaks from continentalness [-0.3, 0.3]', -0.3, 0.3, x => TerrainShaper.peaks(TerrainShaper.point(x, -0.8, 0.6)))
plot('Peaks from ridges [0, 1]', 0, 1, x => TerrainShaper.peaks({ continents: 0.11, erosion: -0.45, weirdness: 0, ridges: x }))

const widePlateau = ridgeSpline(-0.1 - 0.15, 0.5 * 0.7, 0.5 * 0.7, 0.5 * 0.7, 0.6 * 0.7, 0.5)
plot('Wide plateau from ridges [-1, 1]', -1, 1, x => widePlateau.apply(x))

const plains = ridgeSpline(-0.1, 0.01, 0.01, 0.03, 0.1, 0.5)
plot('Plains ridges from ridges [-1, 1]', -1, 1, x => plains.apply(x))

function ridgeSpline(f1: number, f2: number, f3: number, f4: number, f5: number, f6: number) {
	const f7 = Math.max(0.5 * (f2 - f1), f6)
	const f8 = 5.0 * (f3 - f2)
	return new Spline<number>('ridge', x => x)
		.addPoint(-1.0, f1, f7)
		.addPoint(-0.4, f2, Math.min(f7, f8))
		.addPoint(0.0, f3, f8)
		.addPoint(0.4, f4, 2.0 * (f4 - f3))
		.addPoint(1.0, f5, 0.7 * (f5 - f4))
}

function plot(name: string, minX: number, maxX: number, fn: (x: number) => number) {
	const plot = document.createElement('div')
	plot.classList.add('plot')
	const label = document.createElement('span')
	label.textContent = name
	plot.append(label)
	const canvas = document.createElement('canvas')
	canvas.width = WIDTH
	canvas.height = HEIGHT
	plot.append(canvas)
	document.querySelector('main')?.append(plot)

	const ctx = canvas.getContext('2d')!

	const data = []
	for (let x = minX; x < maxX; x += (maxX - minX) / WIDTH) {
		data.push(fn(x))
	}
	const offOut = 10
	const minY = Math.min(0, ...data)
	const maxY = Math.max(0, ...data)
	const slope = (2 * offOut - HEIGHT) / (maxY - minY)
	const map = (y: number) => {
		return HEIGHT - offOut + slope * (y - minY)
	}
	
	ctx.strokeStyle = '#555'
	ctx.beginPath()
	ctx.moveTo(0, map(0))
	ctx.lineTo(WIDTH, map(0))
	ctx.stroke()
	
	ctx.strokeStyle = 'white'
	ctx.beginPath()
	ctx.moveTo(0, map(data[0]))
	for (let i = 1; i < data.length; i += 1) {
		ctx.lineTo(i, map(data[i]))
	}
	ctx.stroke()
}
