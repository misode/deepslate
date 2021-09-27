import { read as readNbt, Structure, StructureRenderer } from 'deepslate'
import { mat4 } from 'gl-matrix'
import React, { useEffect, useRef } from 'react'
import { ResourceManager } from './resources'

export default function Renderer() {
	const canvas = useRef<HTMLCanvasElement>()

	useEffect(() => {
		const gl = canvas.current.getContext('webgl')
		if (!gl) {
			throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
		}
		(async () => {
			const exampleRes = await fetch('/deepslate/example.nbt')
			const exampleData = await exampleRes.arrayBuffer()
			const exampleNbt = readNbt(new Uint8Array(exampleData))
			const structure = Structure.fromNbt(exampleNbt.result)

			const resources = new ResourceManager()
			await Promise.all([
				resources.loadFromZip('/deepslate/assets.zip'),
				resources.loadBlocks('https://raw.githubusercontent.com/Arcensoth/mcdata/master/processed/reports/blocks/simplified/data.min.json'),
			])

			const renderer = new StructureRenderer(gl, structure, resources)

			const viewMatrix = mat4.create()
			mat4.translate(viewMatrix, viewMatrix, [0, 0, -3])
			mat4.rotate(viewMatrix, viewMatrix, 0.8, [1, 0, 0])
			mat4.rotate(viewMatrix, viewMatrix, 0.5, [0, 1, 0])
			mat4.translate(viewMatrix, viewMatrix, [-1.5, -1, -1.5])
			renderer.drawStructure(viewMatrix)
		})()
	}, [])

	return <canvas ref={canvas} width={400} height={400}></canvas>
}
