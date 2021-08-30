import { lerp, Spline } from '../../math'

export namespace TerrainShaper {
	export type Point = {
		readonly continents: number,
		readonly erosion: number,
		readonly weirdness: number,
		readonly ridges: number,
	}

	export type Shape = {
		readonly offset: number,
		readonly factor: number,
		readonly peaks: number,
		readonly isCoastal: boolean,
	}

	export function offset(point: Point) {
		return offsetSampler.apply(point) + 0.015
	}

	export function factor(point: Point) {
		return factorSampler.apply(point)
	}

	export function peaks(point: Point) {
		return peaksSampler.apply(point)
	}

	export function peaksAndValleys(weirdness: number) {
		return -(Math.abs(Math.abs(weirdness) - 0.6666667) - 0.33333334) * 3.0
	}

	export function point(continents: number, erosion: number, weirdness: number): Point {
		return {
			continents,
			erosion,
			weirdness,
			ridges: peaksAndValleys(weirdness),
		}
	}

	export function isCoastal(continentalness: number, weirdness: number) {
		if (continentalness < -0.2) {
			return false
		}
		if (continentalness < -0.05) {
			return true
		}
		return Math.abs(weirdness) < 0.15
	}

	export function shape(point: Point, isCoastal: boolean): Shape {
		return {
			offset: offset(point),
			factor: factor(point),
			peaks: peaks(point),
			isCoastal,
		}
	}

	const beachSpline = buildErosionOffsetSpline('beachSpline', -0.15, -0.05, 0.0, 0.0, 0.1, 0.0, -0.03, false, false)
	const lowSpline = buildErosionOffsetSpline('lowSpline', -0.1, -0.1, 0.03, 0.1, 0.1, 0.01, -0.03, false, false)
	const midSpline = buildErosionOffsetSpline('midSpline', -0.1, -0.1, 0.03, 0.1, 0.7, 0.01, -0.03, true, true)
	const highSpline = buildErosionOffsetSpline('highSpline', -0.05, 0.3, 0.03, 0.1, 1.0, 0.01, 0.01, true, true)

	const offsetSampler = new Spline<Point>('offsetSampler', p => p.continents)
		.addPoint(-1.1, 0.044)
		.addPoint(-1.02, -0.2222)
		.addPoint(-0.51, -0.2222)
		.addPoint(-0.44, -0.12)
		.addPoint(-0.18, -0.12)
		.addPoint(-0.16, beachSpline)
		.addPoint(-0.15, beachSpline)
		.addPoint(-0.1, lowSpline)
		.addPoint(0.25, midSpline)
		.addPoint(1.0, highSpline)

	const factorSampler = new Spline<Point>('Factor-Continents', p => p.continents)
		.addPoint(-0.19, 505.0)
		.addPoint(-0.15, getErosionFactor('erosionCoast', 800.0, true, 'ridgeCoast-OldMountains'))
		.addPoint(-0.1, getErosionFactor('erosionInland', 700.0, true, 'ridgeInland-OldMountains'))
		.addPoint(0.03, getErosionFactor('erosionMidInland', 650.0, true, 'ridgeMidInland-OldMountains'))
		.addPoint(0.06, getErosionFactor('erosionFarInland', 600.0, false, 'ridgeFarInland-OldMountains'))

	const peaksSampler = new Spline<Point>('Peaks', p => p.continents)
		.addPoint(0.1, 0.0)
		.addPoint(0.2, new Spline<Point>('Peaks-erosion', p => p.erosion)
			.addPoint(-0.8, new Spline<Point>('Peaks-erosion-ridges', p => p.ridges)
				.addPoint(-1.0, 0.0)
				.addPoint(0.2, 0.0)
				.addPoint(1.0, new Spline<Point>('Peaks-erosion-ridges-weirdness', p => p.weirdness)
					.addPoint(-0.01, 80.0)
					.addPoint(0.01, 20.0)))
			.addPoint(-0.4, 0.0))

	function getErosionFactor(string: string, f: number, bl: boolean, string2: string) {
		const spline = new Spline<Point>(string, p => p.erosion)
			.addPoint(-0.6, f)
			.addPoint(-0.5, 342.0)
			.addPoint(-0.35, f)
			.addPoint(-0.25, f)
			.addPoint(-0.1, 342.0)
			.addPoint(0.03, f)
		if (bl) {
			const spline1 = new Spline<Point>('weirdnessShattered', p => p.weirdness).addPoint(0.0, f).addPoint(0.1, 80.0)
			const spline2 = new Spline<Point>('ridgesShattered', p => p.ridges).addPoint(-0.9, f).addPoint(-0.69, spline1)
			spline
				.addPoint(0.35, f)
				.addPoint(0.45, spline2)
				.addPoint(0.55, spline2)
				.addPoint(0.62, f)
		} else {
			const spline1 = new Spline<Point>(string2, p => p.ridges).addPoint(-0.7, f).addPoint(-0.15, 175.0)
			const spline2 = new Spline<Point>(string2, p => p.ridges).addPoint(0.45, f).addPoint(0.7, 200.0)
			spline
				.addPoint(0.05, spline2)
				.addPoint(0.4, spline2)
				.addPoint(0.45, spline1)
				.addPoint(0.55, spline1)
				.addPoint(0.58, f)
		}
		return spline
	}

	function buildErosionOffsetSpline(name: string, f: number, f2: number, f3: number, f4: number, f5: number, f6: number, f7: number, bl: boolean, bl2: boolean) {
		const mountain1 = buildMountainRidgeSplineWithPoints(lerp(f5, 0.6, 1.5), bl2)
		const mountain2 = buildMountainRidgeSplineWithPoints(lerp(f5, 0.6, 1.0), bl2)
		const mountain3 = buildMountainRidgeSplineWithPoints(f5,bl2)
		const widePlateau = ridgeSpline(name + '-widePlateau', f - 0.15, 0.5 * f5, lerp(0.5, 0.5, 0.5) * f5, 0.5 * f5, 0.6 * f5, 0.5)
		const narrowPlateau = ridgeSpline(name + '-narrowPlateau', f, f6 * f5, f3 * f5, 0.5 * f5, 0.6 * f5, 0.5)
		const plains = ridgeSpline(name + '-plains', f, f6,f6, f3, f4, 0.5)
		const plainsFarInland = ridgeSpline(name + '-plainsFarInland',f, f6, f6, f3, f4, 0.5)
		const extremeHills = new Spline<Point>(name, p => p.ridges)
			.addPoint(-1.0, f)
			.addPoint(-0.4, plains)
			.addPoint(0.0, f4 + 0.07)
		const swampsRidges = ridgeSpline(name + '-swamps', -0.02, f7, f7, f3, f4, 0.0)

		const erosion = new Spline<Point>(name, p => p.erosion)
			.addPoint(-0.85, mountain1)
			.addPoint(-0.7, mountain2)
			.addPoint(-0.4, mountain3)
			.addPoint(-0.35, widePlateau)
			.addPoint(-0.1, narrowPlateau)
			.addPoint(0.2, plains)
		if (bl) {
			erosion
				.addPoint(0.4, plainsFarInland)
				.addPoint(0.45, extremeHills)
				.addPoint(0.55, extremeHills)
				.addPoint(0.58, plainsFarInland)
		}
		erosion.addPoint(0.7, swampsRidges)
		return erosion
	}

	function buildMountainRidgeSplineWithPoints(f: number, bl: boolean) {
		const spline = new Spline<Point>(`M-spline for continentalness: ${f} ${bl}`, p => p.ridges)
		const f4 = mountainContinentalness(-1.0, f, -0.7)
		const f6 = mountainContinentalness(1.0, f, -0.7)
		const f7 = calculateMountainRidgeZeroContinentalnessPoint(f)
		if (-0.65 < f7 && f7 < 1.0) {
			const f9 = mountainContinentalness(-0.65, f, -0.7)
			const f11 = mountainContinentalness(-0.75, f, -0.7)
			const f12 = calculateSlope(f4, f11, -1.0, -0.75)
			spline.addPoint(-1.0, f4, f12)
			spline.addPoint(-0.75, f11)
			spline.addPoint(-0.65, f9)
			const f13 = mountainContinentalness(f7, f, -0.7)
			const f14 = calculateSlope(f13, f6, f7, 1.0)
			spline.addPoint(f7 - 0.01, f13)
			spline.addPoint(f7, f13, f14)
			spline.addPoint(1.0, f6, f14)
		} else {
			const f16 = calculateSlope(f4, f6, -1.0, 1.0)
			if (bl) {
				spline.addPoint(-1.0, Math.max(0.2, f4))
				spline.addPoint(0.0, lerp(0.5, f4, f6), f16)
			} else {
				spline.addPoint(-1.0, f4, f16)
			}
			spline.addPoint(1.0, f6, f16)
		}
		return spline
	}

	function mountainContinentalness(f: number, f2: number, f3: number) {
		const f6 = 1.0 - (1.0 - f2) * 0.5
		const f7 = 0.5 * (1.0 - f2)
		const f8 = (f + 1.17) * 0.46082947
		const f9 = f8 * f6 - f7
		if (f < f3) {
			return Math.max(f9, -0.2222)
		}
		return Math.max(f9, 0)
	}

	function calculateMountainRidgeZeroContinentalnessPoint(f: number) {
		const f4 = 1.0 - (1.0 - f) * 0.5
		const f5 = 0.5 * (1.0 - f)
		const f6 = f5 / (0.46082947 * f4) - 1.17
		return f6
	}

	function calculateSlope(f: number, f2: number, f3: number, f4: number) {
		return (f2 - f) / (f4 - f3)
	}

	function ridgeSpline(name: string, f: number, f2: number, f3: number, f4: number, f5: number, f6: number) {
		const f7 = Math.max(0.5 * (f2 - f), f6)
		const f8 = 5.0 * (f3 - f2)
		return new Spline<Point>(name, (p) => p.ridges)
			.addPoint(-1.0, f, f7)
			.addPoint(-0.4, f2, Math.min(f7, f8))
			.addPoint(0.0, f3, f8)
			.addPoint(0.4, f4, 2.0 * (f4 - f3))
			.addPoint(1.0, f5, 0.7 * (f5 - f4))
	}
}
