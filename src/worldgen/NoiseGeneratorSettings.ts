import type { BlockState } from '../core'
import type { NoiseSettings } from './NoiseSettings'

export type NoiseGeneratorSettings = {
	structures: StructureSettings,
	noise: NoiseSettings,
	defaultBlock: BlockState,
	defaultFluid: BlockState,
	bedrockRoofPosition: number,
	bedrockFloorPosition: number,
	seaLevel: number,
	minSurfaceLevel: number,
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
