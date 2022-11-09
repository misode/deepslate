import { Climate, DensityFunction, Identifier, MultiNoiseBiomeSource, NoiseGeneratorSettings, NoiseRouter, RandomState, WorldgenRegistries } from 'deepslate'
import React from 'react'
import Plot from '../Plot'
import colors from './biomeColors.json'

const temperatureNoise = WorldgenRegistries.NOISE.register(Identifier.parse('test:temperature'), { firstOctave: -7, amplitudes: [1, 1] })
const vegetationNoise = WorldgenRegistries.NOISE.register(Identifier.parse('test:vegetation'), { firstOctave: -7, amplitudes: [1, 1] })

const settings = NoiseGeneratorSettings.create({
	noiseRouter: NoiseRouter.create({
		temperature: new DensityFunction.Noise(0.25, 0, temperatureNoise),
		vegetation: new DensityFunction.Noise(0.25, 0, vegetationNoise),
	}),
})

export function NetherExample() {
	return <Plot name="Nether" width={160} scale={2}
		initializer={() => {
			const source = new MultiNoiseBiomeSource([
				[Climate.parameters(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('nether_wastes')],
				[Climate.parameters(0.0, -0.5, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('soul_sand_valley')],
				[Climate.parameters(0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), () => Identifier.create('crimson_forest')],
				[Climate.parameters(0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.375), () => Identifier.create('warped_forest')],
				[Climate.parameters(-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.175), () => Identifier.create('basalt_deltas')],
			])
			const randomState = new RandomState(settings, BigInt(5))
			return { source, climate: randomState.sampler }
		}}
		sampler={({ source, climate }) => (x, y) => source.getBiome(x, 64, y, climate)}
		colorizer={(id: Identifier) => colors[id.toString()] ?? [0, 0, 0]}
	/>
}
