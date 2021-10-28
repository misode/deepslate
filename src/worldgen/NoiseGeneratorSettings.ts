import { BlockState, Json } from '../core'
import { NoiseParameters } from '../math'
import { NoiseSettings } from './NoiseSettings'

export type NoiseGeneratorSettings = {
	structures: StructureSettings,
	noise: NoiseSettings,
	/** @deprecated */
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
	legacyRandomSource: boolean,
}
export namespace NoiseGeneratorSettings {
	export function fromJson(obj: unknown): NoiseGeneratorSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			structures: StructureSettings.fromJson(root.structures),
			noise: NoiseSettings.fromJson(root.noise),
			octaves: NoiseOctaves.fromJson(root.octaves),
			defaultBlock: BlockState.fromJson(root.default_block),
			defaultFluid: BlockState.fromJson(root.default_fluid),
			bedrockRoofPosition: Json.readInt(root.bedrock_roof_position) ?? 0,
			bedrockFloorPosition: Json.readInt(root.bedrock_floor_position) ?? 0,
			seaLevel: Json.readInt(root.sea_level) ?? 0,
			disableMobGeneration: Json.readBoolean(root.disable_mob_generation) ?? false,
			aquifersEnabled: Json.readBoolean(root.aquifers_enabled) ?? false,
			noiseCavesEnabled: Json.readBoolean(root.noise_caves_enabled) ?? false,
			deepslateEnabled: Json.readBoolean(root.deepslate_enabled) ?? false,
			oreVeinsEnabled: Json.readBoolean(root.ore_veins_enabled) ?? false,
			noodleCavesEnabled: Json.readBoolean(root.noodle_caves_enabled) ?? false,
			legacyRandomSource: Json.readBoolean(root.legacy_random_source) ?? false,
		}
	}
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
export namespace StructureSettings {
	export function fromJson(obj: unknown): StructureSettings {
		const root = Json.readObject(obj) ?? {}
		return {
			stronghold: Json.compose(root.stronghold, Json.readObject, s => ({
				distance: Json.readInt(s.distance) ?? 0,
				spread: Json.readInt(s.spread) ?? 0,
				count: Json.readInt(s.count) ?? 0,
			})),
			structures: Json.readMap(root.structures, s => (s => ({
				spacing: Json.readInt(s.spacing) ?? 0,
				separation: Json.readInt(s.separation) ?? 0,
				salt: Json.readInt(s.salt) ?? 0,
			}))(Json.readObject(s) ?? {})),
		}
	}
}

export type NoiseOctaves = {
	temperature: NoiseParameters,
	humidity: NoiseParameters,
	continentalness: NoiseParameters,
	erosion: NoiseParameters,
	weirdness: NoiseParameters,
	shift: NoiseParameters,
}
export namespace NoiseOctaves {
	export function fromJson(obj: unknown): NoiseOctaves {
		const root = Json.readObject(obj) ?? {}
		return {
			temperature: NoiseParameters.fromJson(root.temperature),
			humidity: NoiseParameters.fromJson(root.humidity),
			continentalness: NoiseParameters.fromJson(root.continentalness),
			erosion: NoiseParameters.fromJson(root.erosion),
			weirdness: NoiseParameters.fromJson(root.weirdness),
			shift: NoiseParameters.fromJson(root.shift),
		}
	}
}
