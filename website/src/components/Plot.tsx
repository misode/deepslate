import type { Spline } from 'deepslate'
import React, { useEffect, useRef, useState } from 'react'

type PlotProps<State, Result> = {
	name: string,
	width: number,
	height?: number,
	scale?: number,
	fetcher?: () => Promise<any>,
	initializer?: (data: any) => State,
	column?: (state: State, x: number) => unknown,
	sampler: (state: State) => (x: number, y: number) => Result,
	colorizer: (result: Result) => number | [number, number, number],
}
export default function Plot<State, Result>({ name, width, height, scale, fetcher, initializer, column, sampler, colorizer }: PlotProps<State, Result>) {
	height = height ?? width
	const canvas = useRef<HTMLCanvasElement>()
	const [time, setTime] = useState<number | undefined>(undefined)

	useEffect(() => {
		Promise.resolve(fetcher?.()).then(data => {
			const state = initializer?.(data)
			const start = performance.now()
			const sample = sampler(state)
			const ctx = canvas.current.getContext('2d')!
			const img = ctx.createImageData(width, height)
			requestAnimationFrame(() => {
				for (let x = 0; x < width; x += 1) {
					column?.(state, x)
					for (let y = 0; y < height; y += 1) {
						const i = x * 4 + y * 4 * img.width
						const result = sample(x, y)
						const color = colorizer(result)
						const [r, g, b] = typeof color === 'number' ? [color, color, color] : color
						img.data[i] = r
						img.data[i + 1] = g
						img.data[i + 2] = b
						img.data[i + 3] = 255
					}
				}
				ctx.putImageData(img, 0, 0)
				setTime(performance.now() - start)
			})
		})
	}, [])

	return <div className="plot pixelated">
		<span>{name} ({time ? `${time.toFixed(0)}ms` : 'loading'})</span>
		<canvas ref={canvas} width={width} height={height} style={scale ? {width: `${width * scale}px`, height: `${(height) * scale}px`} : undefined}></canvas>
	</div>
}

type SplinePlotProps = {
	name: string,
	width: number,
	height?: number,
	scale?: number,
	range: [number, number],
	spline: Spline<number> | ((x: number) => number),
}
export function SplinePlot({ name, width, height, scale, range, spline }: SplinePlotProps) {
	height = height ?? width
	const [minX, maxX] = range
	const canvas = useRef<HTMLCanvasElement>()

	useEffect(() => {
		const ctx = canvas.current.getContext('2d')!

		const fn = typeof spline === 'function' ? spline : (x: number) => spline.apply(x)

		const data = []
		for (let x = minX; x < maxX; x += (maxX - minX) / width) {
			data.push(fn(x))
		}
		const offOut = 10
		const minY = Math.min(0, ...data)
		const maxY = Math.max(0, ...data)
		const slope = (2 * offOut - height) / (maxY - minY)
		const map = (y: number) => {
			return height - offOut + slope * (y - minY)
		}
	
		ctx.strokeStyle = '#555'
		ctx.beginPath()
		ctx.moveTo(0, map(0))
		ctx.lineTo(width, map(0))
		ctx.stroke()
	
		ctx.strokeStyle = 'white'
		ctx.beginPath()
		ctx.moveTo(0, map(data[0]))
		for (let i = 1; i < data.length; i += 1) {
			ctx.lineTo(i, map(data[i]))
		}
		ctx.stroke()
	}, [])

	return <div className="plot">
		<span>{name}</span>
		<canvas ref={canvas} width={width} height={height ?? width} style={scale ? {width: `${width * scale}px`, height: `${(height ?? width) * scale}px`} : undefined}></canvas>
	</div>
}
