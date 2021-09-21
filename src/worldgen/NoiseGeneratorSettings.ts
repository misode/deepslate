import type { BlockState } from '../core'
import type { NoiseParameters } from '../math'
import type { NoiseSettings } from './NoiseSettings'

export type NoiseGeneratorSettings = {
	structures: StructureSettings,
	noise: NoiseSettings,
	octaves: NoiseOctaves,
	defaultBlock: BlockState,
	defaultFluid: BlockState,
	bedrockRoofPosition: number,
	bedrockFloorPosition: number,
	seaLevel: number,
	disableMobGeneration: boolean,
	aquifersEnabled: boolean,
	noiseCavesEnabled: boolean,
	deepslateEnabled: boolean,
	oreVeinsEnabled: boolean,
	noodleCavesEnabled: boolean,
}

export type StructureSettings = {
	stronghold?: {
		distance: number,
		spread: number,
		count: number,
	},
	structures: {
		[structureFeature: string]: {
			spacing: number,
			separation: number,
			salt: number,
		},
	},
}

export type NoiseOctaves = {
	temperature: NoiseParameters,
	humidity: NoiseParameters,
	continentalness: NoiseParameters,
	erosion: NoiseParameters,
	weirdness: NoiseParameters,
	shift: NoiseParameters,
}
