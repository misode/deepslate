import { BlockState } from '../core'
import { BlendedNoise, clamp, clampedLerp, clampedMap, LegacyRandom, map, NoiseParameters, NormalNoise, square, XoroshiroRandom } from '../math'
import { Climate, TerrainShaper } from './biome'
import type { BlockStateFiller, InterpolatableNoise, NoiseChunk, NoiseFiller } from './NoiseChunk'
import { TerrainInfo } from './NoiseChunk'
import { Noises } from './Noises'
import { NoiseSettings, NoiseSlideSettings } from './NoiseSettings'

export class NoiseSampler {
	private readonly blendedNoise: BlendedNoise
	private readonly temperatureNoise: NormalNoise
	private readonly humidityNoise: NormalNoise
	private readonly continentalnessNoise: NormalNoise
	private readonly erosionNoise: NormalNoise
	private readonly weirdnessNoise: NormalNoise
	private readonly offsetNoise: NormalNoise
	private readonly jaggedNoise: NormalNoise

	private readonly pillarNoise: NormalNoise
	private readonly pillarRarenessModulator: NormalNoise
	private readonly pillarThicknessModulator: NormalNoise
	private readonly spaghetti2DNoise: NormalNoise
	private readonly spaghetti2DElevationModulator: NormalNoise
	private readonly spaghetti2DRarityModulator: NormalNoise
	private readonly spaghetti2DThicknessModulator: NormalNoise
	private readonly spaghetti3DNoise1: NormalNoise
	private readonly spaghetti3DNoise2: NormalNoise
	private readonly spaghetti3DRarityModulator: NormalNoise
	private readonly spaghetti3DThicknessModulator: NormalNoise
	private readonly spaghettiRoughnessNoise: NormalNoise
	private readonly spaghettiRoughnessModulator: NormalNoise
	private readonly bigEntranceNoise: NormalNoise
	private readonly layerNoise: NormalNoise
	private readonly cheeseNoise: NormalNoise
	private readonly noodleToggleNoise: InterpolatableNoise
	private readonly noodleThicknessNoise: InterpolatableNoise
	private readonly noodleRidgeANoise: InterpolatableNoise
	private readonly noodleRidgeBNoise: InterpolatableNoise

	public readonly shaper: TerrainShaper
	private readonly baseNoise: InterpolatableNoise

	constructor(
		private readonly settings: NoiseSettings,
		private readonly isNoiseCavesEnabled: boolean,
		seed: bigint,
		legacyRandomSource: boolean = false,
	) {
		const large = settings.hasLargeBiomes
		const random = (legacyRandomSource ? new LegacyRandom(seed) : XoroshiroRandom.create(seed)).forkPositional()
		if (!legacyRandomSource) {
			this.blendedNoise = new BlendedNoise(random.fromHashOf('minecraft:terrain'), settings.sampling, NoiseSettings.cellWidth(settings), NoiseSettings.cellHeight(settings))
			this.temperatureNoise = Noises.instantiate(random, large ? Noises.TEMPERATURE_LARGE : Noises.TEMPERATURE)
			this.humidityNoise = Noises.instantiate(random, large ? Noises.VEGETATION_LARGE : Noises.VEGETATION)
			this.offsetNoise = Noises.instantiate(random, Noises.SHIFT)
		} else {
			this.blendedNoise = new BlendedNoise(new LegacyRandom(seed), settings.sampling, NoiseSettings.cellWidth(settings), NoiseSettings.cellHeight(settings))
			this.temperatureNoise = new NormalNoise(new LegacyRandom(seed), NoiseParameters.create(-7, [1, 1]))
			this.humidityNoise = new NormalNoise(new LegacyRandom(seed + BigInt(1)), NoiseParameters.create(-7, [1, 1]))
			this.offsetNoise = new NormalNoise(new LegacyRandom(seed + BigInt(5)), NoiseParameters.create(0, [0]))
		}
		this.continentalnessNoise = Noises.instantiate(random, large ? Noises.CONTINENTALNESS_LARGE : Noises.CONTINENTALNESS)
		this.erosionNoise = Noises.instantiate(random, large ? Noises.EROSION_LARGE : Noises.EROSION)
		this.weirdnessNoise = Noises.instantiate(random, Noises.RIDGE)

		this.pillarNoise = Noises.instantiate(random, Noises.PILLAR)
		this.pillarRarenessModulator = Noises.instantiate(random, Noises.PILLAR_RARENESS)
		this.pillarThicknessModulator = Noises.instantiate(random, Noises.PILLAR_THICKNESS)
		this.spaghetti2DNoise = Noises.instantiate(random, Noises.SPAGHETTI_2D)
		this.spaghetti2DElevationModulator = Noises.instantiate(random, Noises.SPAGHETTI_2D_ELEVATION)
		this.spaghetti2DRarityModulator = Noises.instantiate(random, Noises.SPAGHETTI_2D_MODULATOR)
		this.spaghetti2DThicknessModulator = Noises.instantiate(random, Noises.SPAGHETTI_2D_THICKNESS)
		this.spaghetti3DNoise1 = Noises.instantiate(random, Noises.SPAGHETTI_3D_1)
		this.spaghetti3DNoise2 = Noises.instantiate(random, Noises.SPAGHETTI_3D_2)
		this.spaghetti3DRarityModulator = Noises.instantiate(random, Noises.SPAGHETTI_3D_RARITY)
		this.spaghetti3DThicknessModulator = Noises.instantiate(random, Noises.SPAGHETTI_3D_THICKNESS)
		this.spaghettiRoughnessNoise = Noises.instantiate(random, Noises.SPAGHETTI_ROUGHNESS)
		this.spaghettiRoughnessModulator = Noises.instantiate(random, Noises.SPAGHETTI_ROUGHNESS_MODULATOR)
		this.bigEntranceNoise = Noises.instantiate(random, Noises.CAVE_ENTRANCE)
		this.layerNoise = Noises.instantiate(random, Noises.CAVE_LAYER)
		this.cheeseNoise = Noises.instantiate(random, Noises.CAVE_CHEESE)

		const noodleMinY = settings.minY + 4
		const noodleMaxY = noodleMinY + settings.height
		this.noodleToggleNoise = this.yLimitedInterpolatable(Noises.instantiate(random, Noises.NOODLE), noodleMinY, noodleMaxY, -1, 1)
		this.noodleThicknessNoise = this.yLimitedInterpolatable(Noises.instantiate(random, Noises.NOODLE_THICKNESS), noodleMinY, noodleMaxY, 0, 1)
		this.noodleRidgeANoise = this.yLimitedInterpolatable(Noises.instantiate(random, Noises.NOODLE_RIDGE_A), noodleMinY, noodleMaxY, 0, 8/3)
		this.noodleRidgeBNoise = this.yLimitedInterpolatable(Noises.instantiate(random, Noises.NOODLE_RIDGE_B), noodleMinY, noodleMaxY, 0, 8/3)

		this.jaggedNoise = Noises.instantiate(random, Noises.JAGGED)

		this.shaper = settings.terrainShaper
		this.baseNoise = noiseChunk => noiseChunk.createNoiseInterpolator(
			(x, y, z) => this.calculateBlendedBaseNoise(x, y, z, noiseChunk.getNoiseData(x >> 2, z >> 2).terrainInfo))
	}

	public yLimitedInterpolatable(noise: NormalNoise, minY: number, maxY: number, base: number, scale: number): InterpolatableNoise {
		const filler: NoiseFiller = (x, y, z) => {
			if (y > maxY || y < minY) {
				return base
			}
			return noise.sample(x * scale, y * scale, z * scale)
		}
		return noiseChunk => noiseChunk.createNoiseInterpolator(filler)
	}

	public noiseData(x: number, z: number) {
		const xx = x + this.getOffset(x, 0, z)
		const zz = z + this.getOffset(z, x, 0)
		const continentalness = this.getContinentalness(xx, zz)
		const erosion = this.getErosion(xx, zz)
		const weirdness = this.getWeirdness(xx, zz)
		const terrainInfo = this.terrainInfo(continentalness, erosion, weirdness)
		return FlatNoiseData.create(xx, zz, continentalness, erosion, weirdness, terrainInfo)
	}

	public sample(x: number, y: number, z: number) {
		return this.target(x, y, z, this.noiseData(x, z))
	}

	public target(x: number, y: number, z: number, noiseData: FlatNoiseData) {
		const xx = noiseData.shiftedX
		const yy = y + this.getOffset(y, z, x)
		const zz = noiseData.shiftedZ
		const temperature = this.getTemperature(xx, yy, zz)
		const humidity = this.getHumidity(xx, yy, zz)
		const depth = this.computeDimensionDensity(y << 2, noiseData.terrainInfo)
		return Climate.target(temperature, humidity, noiseData.continentalness, noiseData.erosion, depth, noiseData.weirdness)
	}

	public terrainInfo(continentalness: number, erosion: number, weirdness: number) {
		const point = TerrainShaper.point(continentalness, erosion, weirdness)
		const offset = this.shaper.offset(point)
		const factor = this.shaper.factor(point)
		const jaggedness = this.shaper.jaggedness(point)
		return TerrainInfo.create(offset, factor, jaggedness)
	}

	public getOffset(x: number, y: number, z: number) {
		return this.offsetNoise.sample(x, y, z) * 4
	}

	public getTemperature(x: number, y: number, z: number) {
		return this.temperatureNoise.sample(x, y, z)
	}

	public getHumidity(x: number, y: number, z: number) {
		return this.humidityNoise.sample(x, y, z)
	}

	public getContinentalness(x: number, z: number) {
		return this.continentalnessNoise.sample(x, 0, z)
	}

	public getErosion(x: number, z: number) {
		return this.erosionNoise.sample(x, 0, z)
	}

	public getWeirdness(x: number, z: number) {
		return this.weirdnessNoise.sample(x, 0, z)
	}

	public makeBaseNoiseFiller(noiseChunk: NoiseChunk, filler: NoiseFiller, isNoodleCavesEnabled: boolean): BlockStateFiller {
		const baseSampler = this.baseNoise(noiseChunk)
		const noodleToggle = isNoodleCavesEnabled ? this.noodleToggleNoise(noiseChunk) : () => -1
		const noodleThickness = isNoodleCavesEnabled ? this.noodleThicknessNoise(noiseChunk) : () => 0
		const noodleRidgeA = isNoodleCavesEnabled ? this.noodleRidgeANoise(noiseChunk) : () => 0
		const noodleRidgeB = isNoodleCavesEnabled ? this.noodleRidgeBNoise(noiseChunk) : () => 0

		return (x: number, y: number, z: number) => {
			let noise = baseSampler()
			noise = clamp(noise * 0.64, -1, 1)
			noise = noise / 2 - noise * noise * noise / 24
			if (noodleToggle() >= 0) {
				const thickness = clampedMap(noodleThickness(), -1, 1, 0.05, 0.1)
				const ridgeA = Math.abs(1.5 * noodleRidgeA()) - thickness
				const ridgeB = Math.abs(1.5 * noodleRidgeB()) - thickness
				noise = Math.min(noise, Math.max(ridgeA, ridgeB))
			}
			noise += filler(x, y, z)
			if (noise > 0) return null
			return BlockState.AIR
		}
	}

	public calculateBlendedBaseNoise(x: number, y: number, z: number, terrain: TerrainInfo) {
		const density = this.blendedNoise.sample(x, y, z)
		return this.calculateBaseNoise(x, y, z, terrain, density, !this.isNoiseCavesEnabled, true)
	}

	public calculateBaseNoise(x: number, y: number, z: number, terrain: TerrainInfo, density: number, disableNoiseCaves: boolean, enableJaggedNess: boolean) {
		if (!this.settings.islandNoiseOverride) {
			const jaggedness = enableJaggedNess ? this.sampleJaggedNoise(terrain.jaggedness, x, z) : 0
			const dimensionDensity = this.computeDimensionDensity(y, terrain)
			const heightDensity = terrain.factor * (jaggedness + dimensionDensity)
			density += heightDensity > 0 ? heightDensity * 4 : heightDensity
		}

		let clampMin = -64
		let clampMax = 64
		if (!disableNoiseCaves && density >= -64) {
			const density2 = density - 1.5625
			const entrances = this.getBigEntrances(x, y, z)
			const roughness = this.getSpaghettiRoughness(x, y, z)
			const spaghetti3D = this.getSpaghetti3D(x, y, z)
			const spaghetti = Math.min(entrances, spaghetti3D + roughness)
			if (density2 < 0) {
				clampMax = spaghetti
			} else {
				const caverns = this.getLayerizedCaverns(x, y, z)
				if (caverns > 64) {
					density = 64
				} else {
					const cheese = this.getCheese(x, y, z)
					density = cheese + caverns + clampedLerp(0.5, 0, density2 * 1.28)
				}
				const spaghetti2D = this.getSpaghetti2D(x, y, z)
				clampMin = this.getPillars(x, y, z)
				clampMax = Math.min(spaghetti, spaghetti2D + roughness)
			}
		}

		density = clamp(density, clampMin, clampMax)
		density = this.applySlide(density, y / NoiseSettings.cellHeight(this.settings))
		density = clamp(density, -64, 64)
		return density
	}

	public sampleJaggedNoise(jaggedness: number, x: number, z: number) {
		if (jaggedness === 0) return 0
		const noise = this.jaggedNoise.sample(x * 1500, 0, z * 1500)
		return noise > 0 ? jaggedness * noise : jaggedness / 2 * noise
	}

	public computeDimensionDensity(y: number, terrainInfo: TerrainInfo) {
		return 1 - y / 128 + terrainInfo.offset
	}

	public getBigEntrances(x: number, y: number, z: number) {
		const noise = this.bigEntranceNoise.sample(x * 0.75, y * 0.5, z * 0.75) + 0.37
		return noise + clampedLerp(0.3, 0, (y + 10) / 40)
	}

	public getSpaghettiRoughness(x: number, y: number, z: number) {
		const roughness = this.spaghettiRoughnessNoise.sample(x, y, z)
		const modulator = map(this.spaghettiRoughnessModulator.sample(x, y, z), -1, 1, 0, 1)
		return (0.4 - Math.abs(roughness)) * modulator
	}

	public getSpaghetti2D(x: number, y: number, z: number) {
		const rarity = this.quantizeSpaghettiRarity2D(this.spaghetti2DRarityModulator.sample(x * 2, y, z * 2))
		const thickness = map(this.spaghetti2DThicknessModulator.sample(x * 2, y, z * 2), -1, 1, 0.6, 1.3)
		const noise = this.sampleWithRarity(this.spaghetti2DNoise, x, y, z, rarity)
		const thickNoise = Math.abs(rarity * noise) - 0.083 * thickness
		const minCellY = NoiseSettings.minCellY(this.settings)
		const elevation = map(this.spaghetti2DElevationModulator.sample(x, 0, z), -1, 1, minCellY, 8)
		const thickElevation = Math.abs(elevation - y / 8) - 1 * thickness
		return clamp(Math.max(thickElevation, thickNoise), -1, 1)
	}
	
	public getSpaghetti3D(x: number, y: number, z: number) {
		const rarity = this.quantizeSpaghettiRarity3D(this.spaghetti3DRarityModulator.sample(x * 2, y, z * 2))
		const thickness = map(this.spaghetti3DThicknessModulator.sample(x, y, z), -1, 1, 0.065, 0.088)
		const noise1 = this.sampleWithRarity(this.spaghetti3DNoise1, x, y, z, rarity)
		const thickNoise1 = Math.abs(rarity * noise1) - thickness
		const noise2 = this.sampleWithRarity(this.spaghetti3DNoise2, x, y, z, rarity)
		const thickNoise2 = Math.abs(rarity * noise2) - thickness
		return clamp(Math.max(thickNoise1, thickNoise2), -1, 1)
	}

	public quantizeSpaghettiRarity2D(value: number) {
		if (value < -0.75) {
			return 0.5
		} else if (value < -0.5) {
			return 0.75
		} else if (value < 0.5) {
			return 1
		} else if (value < 0.75) {
			return 2
		} else {
			return 3
		}
	}

	public quantizeSpaghettiRarity3D(value: number) {
		if (value < -0.5) {
			return 0.75
		} else if (value < 0) {
			return 1
		} else if (value < 0.5) {
			return 1.5
		} else {
			return 2
		}
	}

	public sampleWithRarity(noise: NormalNoise, x: number, y: number, z: number, rarity: number) {
		return noise.sample(x / rarity, y / rarity, z / rarity)
	}

	public getLayerizedCaverns(x: number, y: number, z: number) {
		const noise = this.layerNoise.sample(x, y * 8, z)
		return square(noise) * 4
	}

	public getCheese(x: number, y: number, z: number) {
		const noise = this.cheeseNoise.sample(x, y / 1.5, z)
		return clamp(noise + 0.27, -1, 1)
	}

	public getPillars(x: number, y: number, z: number) {
		const rareness = map(this.pillarRarenessModulator.sample(x, y, z), -1, 1, 0, 2)
		const thickness = map(this.pillarThicknessModulator.sample(x, y, z), -1, 1, 0, 1.1)
		const noise = this.pillarNoise.sample(x * 25, y * 0.3, z * 25)
		const pillars = Math.pow(thickness, 3) * (noise * 2 - rareness)
		if (pillars <= 0.03) {
			return Number.MIN_SAFE_INTEGER
		}
		return pillars
	}

	public applySlide(density: number, y: number) {
		const yCell = y - NoiseSettings.minCellY(this.settings)
		density = NoiseSlideSettings.apply(this.settings.topSlide, density, NoiseSettings.cellCountY(this.settings) - yCell)
		density = NoiseSlideSettings.apply(this.settings.bottomSlide, density, yCell)
		return density
	}

	public getPreliminarySurfaceLevel(x: number, z: number, terrainInfo: TerrainInfo) {
		const maxCellY = NoiseSettings.minCellY(this.settings) + NoiseSettings.cellCountY(this.settings)
		const minCellY = NoiseSettings.minCellY(this.settings)
		const cellHeight = NoiseSettings.cellHeight(this.settings)
		for (let yCell = maxCellY; yCell >=  minCellY; yCell -= 1) {
			const y = yCell * cellHeight
			const density = this.calculateBaseNoise(x, y, z, terrainInfo, -0.703125, true, false)
			if (density >= 0.390625) {
				return y
			}
		}
		return Number.MAX_SAFE_INTEGER
	}
}

export type FlatNoiseData = {
	shiftedX: number,
	shiftedZ: number,
	continentalness: number,
	weirdness: number,
	erosion: number,
	terrainInfo: TerrainInfo,
}
export namespace FlatNoiseData {
	export function create(shiftedX: number, shiftedZ: number, continentalness: number, weirdness: number, erosion: number, terrainInfo: TerrainInfo): FlatNoiseData {
		return { shiftedX, shiftedZ, continentalness, weirdness, erosion, terrainInfo }
	}
}
