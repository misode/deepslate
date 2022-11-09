import type { BlockState } from 'deepslate'
import { Chunk, ChunkPos, DensityFunction, Identifier, NoiseChunkGenerator, NoiseGeneratorSettings, NoiseRouter, NoiseSettings, RandomState, WorldgenRegistries } from 'deepslate'
import React from 'react'
import Plot from '../Plot'

export const colors = {
	'minecraft:air': [150, 160, 170],
	'minecraft:water': [20, 80, 170],
	'minecraft:lava': [200, 100, 0],
	'minecraft:stone': [50, 50, 50],
	'minecraft:netherrack': [100, 40, 40],
}

const fooNoise = WorldgenRegistries.NOISE.register(Identifier.parse('test:foo'), { firstOctave: -5, amplitudes: [1, 1] })

const noiseSettings = NoiseSettings.create({ minY: 0, height: 256 })
const simpleSettings = NoiseGeneratorSettings.create({
	seaLevel: 63,
	noise: noiseSettings,
	noiseRouter: NoiseRouter.create({
		finalDensity: new DensityFunction.Ap2('add',
			new DensityFunction.YClampedGradient(0, 256, 1, -1.5),
			new DensityFunction.Noise(1, 1, fooNoise)
		),
	}),
})

interface Props {
	name: string
	z: number
	width: number
	height: number
	scale?: number
	settings: NoiseGeneratorSettings
}
export function GeneratorPlot({ name, z, width, height, scale, settings }: Props) {
	const randomState = new RandomState(settings, BigInt(125))
	return <Plot name={name} width={width} height={height} scale={scale}
		initializer={() => {
			const generator = new NoiseChunkGenerator(null, settings)
			const chunks = Array(Math.ceil(width / 16)).fill(0).map((_, i) => new Chunk(settings.noise.minY, settings.noise.height, ChunkPos.create(i, z >> 4)))
			chunks.forEach(chunk => generator.fill(randomState, chunk))
			return chunks
		}}
		sampler={chunks => (x, y) => chunks[x >> 4].getBlockState([x & 0xF, height - y - 1, z & 0xF])}
		colorizer={(state: BlockState) => colors[state.getName().toString()] ?? [0, 0, 0]}
	/>
}

export function Examples() {
	return <>
		<GeneratorPlot name="Chunk generator" z={37} width={384} height={256}
			settings={simpleSettings} />
	</>
}
