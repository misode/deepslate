import { BlendedNoise, ImprovedNoise, LegacyRandom, NormalNoise, PerlinNoise, PerlinSimplexNoise, SimplexNoise } from 'deepslate'
import React from 'react'
import Plot from '../Plot'

const SIZE = 240
const SEED = BigInt(6203)

function gray(min: number, max: number) {
	return (value: number) => (value - min) / (max - min) * 256
}

export function ImprovedNoiseExample() {
	return <Plot name="Improved" width={SIZE} colorizer={gray(-1, 1)}
		initializer={() => new ImprovedNoise(new LegacyRandom(SEED))}
		sampler={noise => (x, y) => noise.sample(x / 32, y / 32, 0)}
	/>
}

export function PerlinNoiseExample() {
	return <>
		<Plot name="Perlin -6, [1, 1]" width={SIZE} colorizer={gray(-1, 1)}
			initializer={() => new PerlinNoise(new LegacyRandom(SEED), -6, [1, 1])}
			sampler={noise => (x, y) => noise.sample(x / 2, y / 2, 0)}
		/>
		<Plot name="Perlin -5, [1, 1, 1, 1]" width={SIZE} colorizer={gray(-1, 1)}
			initializer={() => new PerlinNoise(new LegacyRandom(SEED), -5, [1, 1, 1, 1])}
			sampler={noise => (x, y) => noise.sample(x / 2, y / 2, 0)}
		/>
		<Plot name="Perlin -5, [1, 0, 2, 3]" width={SIZE} colorizer={gray(-1, 1)}
			initializer={() => new PerlinNoise(new LegacyRandom(SEED), -5, [1, 0, 2, 3])}
			sampler={noise => (x, y) => noise.sample(x / 2, y / 2, 0)}
		/>
		<Plot name="Perlin -4, [1, 1]" width={SIZE} colorizer={gray(-1, 1)}
			initializer={() => new PerlinNoise(new LegacyRandom(SEED), -4, [1, 1])}
			sampler={noise => (x, y) => noise.sample(x / 2, y / 2, 0)}
		/>
	</>
}

export function NormalNoiseExample() {
	return <>
		<Plot name="Normal -6, [1, 1]" width={SIZE} colorizer={gray(-1, 1)}
			initializer={() => new NormalNoise(new LegacyRandom(SEED), { firstOctave: -6, amplitudes: [1, 1] })}
			sampler={noise => (x, y) => noise.sample(x / 2, y / 2, 0)}
		/>
		<Plot name="Normal -5, [1, 1]" width={SIZE} colorizer={gray(-1, 1)}
			initializer={() => new NormalNoise(new LegacyRandom(SEED), { firstOctave: -5, amplitudes: [1, 1] })}
			sampler={noise => (x, y) => noise.sample(x / 2, y / 2, 0)}
		/>
		<Plot name="Normal -5, [1, 1, 1, 1]" width={SIZE} colorizer={gray(-1, 1)}
			initializer={() => new NormalNoise(new LegacyRandom(SEED), { firstOctave: -5, amplitudes: [1, 1, 1, 1] })}
			sampler={noise => (x, y) => noise.sample(x / 2, y / 2, 0)}
		/>
	</>
}

export function BlendedNoiseExample() {
	return <Plot name="Blended" width={SIZE} colorizer={gray(-1, 1)}
		initializer={() => new BlendedNoise(new LegacyRandom(SEED), 1, 1, 80, 160, 4)}
		sampler={noise => (x, y) => noise.sample(x, y, 0)}
	/>
}

export function SimplexNoiseExample() {
	return <Plot name="Simplex" width={SIZE} colorizer={gray(-1, 1)}
		initializer={() => new SimplexNoise(new LegacyRandom(SEED))}
		sampler={noise => (x, y) => noise.sample(x / 32, y / 32, 0)}
	/>
}

export function PerlinSimplexNoiseExample() {
	return <Plot name="PerlinSimplex [-3, -2, -1]" width={SIZE} colorizer={gray(-1, 1)}
		initializer={() => new PerlinSimplexNoise(new LegacyRandom(SEED), [-3, -2, -1])}
		sampler={noise => (x, y) => noise.sample(x / 32, y / 32, false)}
	/>
}
