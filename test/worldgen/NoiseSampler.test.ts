import { expect } from 'chai'
import { BlendedNoise, Random } from '../../src/math'
import type { BiomeSource, NoiseSettings, TerrainShaper } from '../../src/worldgen'
import { NoiseSampler } from '../../src/worldgen'

describe('NoiseSampler', () => {
	const DELTA = 1e-5
	const setup = (seed: number, settings: Partial<NoiseSettings> = {}, shape: Partial<TerrainShaper.Shape> = {}) => {
		const source: BiomeSource = {
			getBiome: () => 'minecraft:plains',
			getTerrainShape: () => ({offset: 0.03, factor: 342.8571468713332, peaks: 0, nearWater: false, ...shape}),
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
			...settings,
		}
		const noise = new BlendedNoise(new Random(BigInt(seed)))
		const sampler = new NoiseSampler(4, 4, 32, source, noiseSettings, noise)
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
		expect(sampler.samplePeakNoise(21, 3, 2)).closeTo(-3.1598351066398074, DELTA)
		expect(sampler.samplePeakNoise(21, 4, 2)).closeTo(-2.9189312896639086, DELTA)
		expect(sampler.samplePeakNoise(27, 4, 2)).closeTo(-3.752911658139311, DELTA)
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

		const actual = sampler.noiseColumn(3, 2, 0, 32)
		const expected = [1388.7533839145153, 1346.9351532268865, 1305.0809696743927, 1261.0013077733795, 1216.8390476834502, 1170.3207862835893, 1125.9453196591612, 1083.3181910581964, 1035.5867994231999, 993.0324866899045, 949.715255798344, 913.0666527175698, 875.7111666328494, 835.623407329048, 794.0094492866383, 752.8335535546747, 712.5451228625716, 664.6209621033196, 621.7645835282409, 581.5442268462363, 556.381024756077, 517.8946780842942, 477.9543898085911, 438.2199576202992, 398.88884075424716, 361.7870030193688, 314.96947637129585, 274.16862601021944, 235.23945983076663, 203.09014262744756, 160.6810179053775, 117.51382640562653, 26.79212949004065]
		actual.forEach((a, i) => {
			expect(a).closeTo(expected[i], 1e-3)
		})
	})
	it('noiseColumn (peaks)', () => {
		const { sampler } = setup(40163, { densityOffset: -0.5 }, { offset: 0.7, factor: 200, peaks: 80 })

		const actual = sampler.noiseColumn(240, 0, 0, 128)
		const expected = [917.7762140193047, 900.3945151394618, 870.9133720432887, 839.1008201811331, 810.0603056638989, 782.7967537944368, 753.8241032641847, 725.1090112055715, 706.7069101843655, 681.4902616982876, 667.7627539387888, 643.0435789084897, 623.4316776332035, 598.791593774281, 575.7106539064443, 547.4619958216178, 523.5228506441963, 498.10053057055325, 457.32590596425433, 429.0337241408262, 403.1074050418551, 379.50853829131165, 335.10436061028935, 306.9879928642743, 279.5658927363863, 254.38696998625687, 230.60760075802182, 198.2461946704217, 169.05599130216638, 143.0375846427595, 111.40970476991126, 82.8268218802595, 63.20002818818692, 40.021774013692834, 33.897521960076745, 14.89385100055123, -6.651597258696146, -22.838379612989943, -31.00018730030282, 12.683222709728371, 5.996600647263573, -28.19877292911196, -36.89357689141703, -45.55605589668203, -49.64479647193142, -49.06501549495976, -44.57239674740043, -50.112960517654244, -62.048633864533315, -72.48233953782554, -75.29384516285994, -88.73601016182334, -99.87900711469344, -109.52523897059574, -113.7665722634807, -121.90751922336281, -134.21331107407357, -141.57108187961776, -129.99338869357717, -134.85430280498375, -140.8944327134682, -145.9102259203769, -152.50089904294364, -151.74516582072272, -156.59241893346993, -158.87173000496395, -168.51651061579776, -174.38387822933302, -182.59749505103972, -186.15966210123904, -209.41956040922938, -216.9505364711756, -217.18049607033822, -224.9177472650118, -231.06826772529502, -236.80269882563948, -243.1961374617338, -247.7806562491154, -254.04037554370973, -255.87673239246354, -259.06013732391375, -268.4909184058265, -258.2748317194063, -263.5436008256584, -264.0683057907068, -272.474415214652, -281.66260035218477, -283.3818383215865, -287.4248394279721, -291.94747186172776, -322.7406395596516, -326.62798320386185, -333.3669198373458, -343.7212546978129, -347.6592202087042, -350.2089995313628, -346.73980007936694, -351.4912400190129, -360.37024555523504, -359.963194004109, -359.8631148243237, -404.192214039217, -410.1564287003767, -412.18009571617034, -415.7820894284133, -417.14645839605816, -445.0910122316481, -454.43110354930604, -461.91143716131995, -469.7633508365165, -480.04126459670914, -486.5626873857661, -512.4920360205484, -520.8540392343822, -527.1901875579281, -528.059479334029, -534.5050379519128, -537.0565297206163, -550.2157333197729, -557.3704560045222, -565.0243059360959, -574.3210275029726, -540.9444297327915, -549.9406111594877, -561.6013197913998, -564.2224696002862, -569.9573669953611, -579.7002452945388, -586.3042695881452]
		actual.forEach((a, i) => {
			expect(a).closeTo(expected[i], 1e-3)
		})
	})
})
