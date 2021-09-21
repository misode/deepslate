import { expect } from 'chai'
import type { BiomeSource, NoiseSettings, TerrainShaper } from '../../src/worldgen'
import { NoiseSampler } from '../../src/worldgen'

describe('NoiseSampler', () => {
	const DELTA = 1e-5
	const setup = (seed: number, settings: Partial<NoiseSettings> = {}, shape: Partial<TerrainShaper.Shape> = {}) => {
		const source: BiomeSource = {
			getBiome: () => 'minecraft:plains',
		}
		const noiseSettings: NoiseSettings = {
			minY: 0,
			height: 128,
			densityFactor: 1,
			densityOffset: 0,
			xzSize: 1,
			ySize: 1,
			sampling: {
				xzScale: 1,
				yScale: 1,
				xzFactor: 80,
				yFactor: 320,
			},
			bottomSlide: { offset: 0, size: 0, target: 0 },
			topSlide: { offset: 0, size: 0, target: 0 },
			useSimplexSurfaceNoise: false,
			randomDensityOffset: false,
			islandNoiseOverride: false,
			isAmplified: false,
			useLegacyRandom: false,
			...settings,
		}
		const octaves = {
			temperature: { firstOctave: 0, amplitudes: [0] },
			humidity: { firstOctave: 0, amplitudes: [0] },
			continentalness: { firstOctave: 0, amplitudes: [0] },
			erosion: { firstOctave: 0, amplitudes: [0] },
			weirdness: { firstOctave: 0, amplitudes: [0] },
			shift: { firstOctave: 0, amplitudes: [0] },
		}
		const sampler = new NoiseSampler(4, 4, 32, source, noiseSettings, octaves, BigInt(seed), {offset: 0.03, factor: 342.8571468713332, peaks: 0, nearWater: false, ...shape})
		return { sampler }
	}
	it('computeDimensionDensity', () => {
		expect(NoiseSampler.computeDimensionDensity(600, 0.03, 0)).equal(600.03)
		expect(NoiseSampler.computeDimensionDensity(600, 0.03, 16)).equal(525.03)
		expect(NoiseSampler.computeDimensionDensity(600, 0.03, 64)).equal(300.03)
		expect(NoiseSampler.computeDimensionDensity(600, 0.03, 96)).equal(150.03)
		expect(NoiseSampler.computeDimensionDensity(600, 0.03, 128)).equal(0.03)
	})
	it('samplePeakNoise', () => {
		const { sampler } = setup(123)
		
		expect(sampler.samplePeakNoise(0, 3, 2)).closeTo(0, DELTA)
		expect(sampler.samplePeakNoise(21, 3, 2)).closeTo(4.943226498840318, DELTA)
		expect(sampler.samplePeakNoise(21, 4, 2)).closeTo(4.957121185874768, DELTA)
		expect(sampler.samplePeakNoise(27, 4, 2)).closeTo(6.37344152469613, DELTA)
	})
	it('computeInitialDensity', () => {
		const { sampler } = setup(123)

		expect(sampler.computeInitialDensity(0, 0.03, 600, 0, 0)).equal(2472)
		expect(sampler.computeInitialDensity(16, 0.03, 600, 0, 0)).equal(2172)
		expect(sampler.computeInitialDensity(64, 0.03, 600, 0, 0)).equal(1272)
		expect(sampler.computeInitialDensity(96, 0.03, 600, 0, 0)).equal(672.0000000000001)
		expect(sampler.computeInitialDensity(128, 0.03, 600, 0, 0)).equal(72)

		const { sampler: sampler2 } = setup(123, { densityOffset: 0.2 })

		expect(sampler2.computeInitialDensity(0, 0.03, 600, 0, 0)).equal(2952)
		expect(sampler2.computeInitialDensity(16, 0.03, 600, 0, 0)).equal(2652)
		expect(sampler2.computeInitialDensity(64, 0.03, 600, 0, 0)).equal(1752)
		expect(sampler2.computeInitialDensity(96, 0.03, 600, 0, 0)).equal(1152)
		expect(sampler2.computeInitialDensity(128, 0.03, 600, 0, 0)).equal(552)
	})
	it('applySlides', () => {
		const { sampler } = setup(123, { bottomSlide: { offset: 0, size: 4, target: 30 }, topSlide: { offset: 2, size: 5, target: -29 } })

		expect(sampler.applySlide(10, 1)).equal(25)
		expect(sampler.applySlide(-4, 31)).equal(-29)
		expect(sampler.applySlide(8, 29)).equal(-21.6)
	})
	it('noiseColumn', () => {
		const { sampler } = setup(123)

		const actual = Array(33)
		sampler.fillNoiseColumn(actual, 3, 2, 0, 32)
		const expected = [1430.6154715215391, 1386.8870898291266, 1341.2969487411078, 1301.9233383312003, 1251.258060185944, 1207.8975049113142, 1165.7660341350932, 1117.8035620357728, 1074.5002678723133, 1019.7432005721895, 975.462828536133, 929.834532555468, 903.8604764734253, 856.0179866871305, 808.7008448945206, 764.6666148468545, 727.2316345289347, 700.2069393073615, 663.9041835569908, 626.7831242992501, 586.5231385991771, 540.810868359086, 495.1456862924324, 453.8237731669361, 398.19689821607705, 350.69960872357603, 304.5433937239481, 247.15237655286595, 205.00801097068205, 157.38964397233582, 109.50203584881083, 67.37656654544718, 21.47036132305741]
		actual.forEach((a, i) => {
			expect(a).closeTo(expected[i], 1e-3)
		})
	})
	it('noiseColumn (peaks)', () => {
		const { sampler } = setup(40163, { densityOffset: -0.5 }, { offset: 0.7, factor: 200, peaks: 80 })

		const actual = Array(129)
		sampler.fillNoiseColumn(actual, 240, 0, 0, 128)
		const expected = [1021.2315009099146, 995.3750527665128, 972.0414623549419, 945.0351367928993, 921.3901172307167, 896.9853735756715, 874.0405138197885, 851.1280097435146, 829.1688413189853, 806.6115702161186, 783.1436623252105, 759.988031546407, 742.5707192420313, 721.6175362230038, 696.7124840888524, 670.8915724990139, 645.2876903234902, 622.3502270545708, 601.1105557694026, 578.5030531485505, 559.0404586998468, 536.909354635122, 515.3647076882077, 482.62111435370923, 458.1896963662372, 417.6191289891158, 389.9911721153091, 363.84266774487844, 336.9927555425485, 305.49043056731244, 277.6342111548576, 249.52958369495647, 213.21131973306632, 188.04964264448802, 163.3796528194463, 139.62989869962638, 111.53198208271962, 84.4472943594289, 63.035554951377655, 36.16155980242505, 8.343662922738654, -15.81190648523571, -25.826194466646548, -34.936610344543226, -40.175203820683436, -51.39233390144972, -60.68064001411531, -62.89925263545594, -71.52625998231412, -79.47686235848853, -75.03900263721965, -79.62451566470236, -84.28365754619338, -95.45443462799398, -99.49196922054338, -103.94406779312742, -109.15403951361917, -114.85070882777266, -123.21700159588863, -133.07911193600725, -129.39265797635593, -137.13816424850853, -145.2449036315719, -153.18870009815376, -157.96640842236908, -161.8896733099463, -166.55596651019988, -178.95566416493315, -179.11128030877202, -180.5633613186599, -184.90346517166608, -193.5382361478075, -197.17788763024848, -185.1966047580225, -188.67262860403707, -196.56441166619152, -207.75665891619508, -214.19675369593892, -226.78210874063026, -216.21993104290823, -217.24629431711006, -226.29832753743642, -233.57653531677678, -242.11210390292544, -245.36808026596395, -249.12546461181776, -252.24559238220814, -260.7197557089738, -267.69868786217404, -280.421455371929, -286.9436480814545, -291.5808302691537, -296.8101310208385, -304.5090714830735, -315.739664328868, -315.6149262370564, -323.0438774308488, -328.6173779524789, -340.5784413464402, -348.0956188772743, -353.98490541338754, -358.0871813957928, -362.6682142153362, -363.22889267605234, -363.41565844419125, -367.0107086158454, -371.85960608319624, -380.8014064400732, -385.4128525187455, -391.5636738625976, -404.73183254203093, -413.5501417409696, -477.746845020878, -491.9681223613404, -498.04912490834147, -508.1523074824068, -514.8715187313433, -526.8298740638454, -525.7204515723868, -530.8371278457382, -539.6598070710982, -545.9003033970407, -546.3778558389195, -546.8241010214963, -547.7684905559956, -549.6633494745683, -546.7111487052384, -517.3262781507246, -523.4299997681779]
		actual.forEach((a, i) => {
			expect(a).closeTo(expected[i], 1e-3)
		})
	})
})
