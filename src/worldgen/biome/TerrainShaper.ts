import { lerp, Spline } from '../../math'

export namespace TerrainShaper {
	export type Point = {
		readonly continents: number,
		readonly erosion: number,
		readonly weirdness: number,
		readonly ridges: number,
	}

	export function offset(point: Point) {
		return offsetSampler.apply(point) + 0.015
	}

	export function factor(point: Point) {
		return factorSampler.apply(point)
	}

	export function jaggedness(point: Point) {
		return jaggednessSampler.apply(point)
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

	const beachSpline = buildErosionOffsetSpline('beachSpline', -0.05, 0.0, 0.0, 0.1, 0.0, -0.03, false, false)
	const lowSpline = buildErosionOffsetSpline('lowSpline', -0.1, 0.03, 0.1, 0.1, 0.01, -0.03, false, false)
	const midSpline = buildErosionOffsetSpline('midSpline', -0.1, 0.03, 0.1, 0.7, 0.01, -0.03, true, true)
	const highSpline = buildErosionOffsetSpline('highSpline', 0.3, 0.03, 0.1, 1.0, 0.01, 0.01, true, true)

	const offsetSampler = new Spline<Point>('Offset', p => p.continents)
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

	const factorSampler = new Spline<Point>('Factor', p => p.continents)
		.addPoint(-0.19, 3.95)
		.addPoint(-0.15, getErosionFactor('erosionCoast', 6.25, true))
		.addPoint(-0.1, getErosionFactor('erosionInland', 5.47, true))
		.addPoint(0.03, getErosionFactor('erosionMidInland', 5.08, true))
		.addPoint(0.06, getErosionFactor('erosionFarInland', 4.69, false))

	const jaggednessSampler = new Spline<Point>('Jaggedness', p => p.continents)
		.addPoint(0.11, 0.0)
		.addPoint(0.03, buildErosionJaggednessSpline(1, 0.5, 0, 0))
		.addPoint(0.65, buildErosionJaggednessSpline(1, 1, 1, 0))

	function getErosionFactor(string: string, f: number, bl: boolean) {
		const base = new Spline<Point>('weirdness', p => p.weirdness)
			.addPoint(-0.2, 6.3)
			.addPoint(0.2, f)
		const spline = new Spline<Point>(string, p => p.erosion)
			.addPoint(-0.6, base)
			.addPoint(-0.5, new Spline<Point>('weirdness', p => p.weirdness)
				.addPoint(-0.05, 6.3)
				.addPoint(0.05, 2.67))
			.addPoint(-0.35, base)
			.addPoint(-0.25, base)
			.addPoint(-0.1, new Spline<Point>('weirdness', p => p.weirdness)
				.addPoint(-0.05, 2.67)
				.addPoint(0.05, 6.3))
			.addPoint(0.03, base)
		if (bl) {
			const spline1 = new Spline<Point>('weirdnessShattered', p => p.weirdness).addPoint(0.0, f).addPoint(0.1, 0.625)
			const spline2 = new Spline<Point>('ridgesShattered', p => p.ridges).addPoint(-0.9, f).addPoint(-0.69, spline1)
			spline
				.addPoint(0.35, f)
				.addPoint(0.45, spline2)
				.addPoint(0.55, spline2)
				.addPoint(0.62, f)
		} else {
			const spline1 = new Spline<Point>('ridges', p => p.ridges).addPoint(-0.7, base).addPoint(-0.15, 1.37)
			const spline2 = new Spline<Point>('ridges', p => p.ridges).addPoint(0.45, base).addPoint(0.7, 1.56)
			spline
				.addPoint(0.05, spline2)
				.addPoint(0.4, spline2)
				.addPoint(0.45, spline1)
				.addPoint(0.55, spline1)
				.addPoint(0.58, f)
		}
		return spline
	}

	function buildErosionOffsetSpline(name: string, f: number, f2: number, f3: number, f4: number, f5: number, f6: number, bl: boolean, bl2: boolean) {
		const mountain1 = buildMountainRidgeSplineWithPoints(lerp(f4, 0.6, 1.5), bl2)
		const mountain2 = buildMountainRidgeSplineWithPoints(lerp(f4, 0.6, 1.0), bl2)
		const mountain3 = buildMountainRidgeSplineWithPoints(f4,bl2)
		const widePlateau = ridgeSpline(name + '-widePlateau', f - 0.15, 0.5 * f4, lerp(0.5, 0.5, 0.5) * f4, 0.5 * f4, 0.6 * f4, 0.5)
		const narrowPlateau = ridgeSpline(name + '-narrowPlateau', f, f5 * f4, f2 * f4, 0.5 * f4, 0.6 * f4, 0.5)
		const plains = ridgeSpline(name + '-plains', f, f5, f5, f2, f3, 0.5)
		const plainsFarInland = ridgeSpline(name + '-plainsFarInland',f, f5, f5, f2, f3, 0.5)
		const extremeHills = new Spline<Point>(name, p => p.ridges)
			.addPoint(-1.0, f)
			.addPoint(-0.4, plains)
			.addPoint(0.0, f3 + 0.07)
		const swampsRidges = ridgeSpline(name + '-swamps', -0.02, f6, f6, f2, f3, 0.0)

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
	
	function buildErosionJaggednessSpline(f: number, f2: number, f3: number, f4: number) {
		const ridgeSpline1 = buildRidgeJaggednessSpline(f, f3)
		const ridgeSpline2 = buildRidgeJaggednessSpline(f2, f4)
		return new Spline<Point>('Jaggedness-erosion', p => p.erosion)
			.addPoint(-1, ridgeSpline1)
			.addPoint(-0.78, ridgeSpline2)
			.addPoint(-0.5775, ridgeSpline2)
			.addPoint(-0.375, 0)
	}

	function buildRidgeJaggednessSpline(f: number, f2: number) {
		const f3 = TerrainShaper.peaksAndValleys(0.4)
		const f4 = TerrainShaper.peaksAndValleys(0.56666666)
		const f5 = (f3 + f4) / 2
		return new Spline<Point>('Jaggedness-ridges', p => p.ridges)
			.addPoint(f3, 0)
			.addPoint(f5, f2 > 0 ? buildWeirdnessJaggednessSpline(f2) : 0)
			.addPoint(1, f > 0 ? buildWeirdnessJaggednessSpline(f) : 0)
	}

	function buildWeirdnessJaggednessSpline(f: number) {
		return new Spline<Point>('Jaggedness-weirdness', p => p.weirdness)
			.addPoint(-0.01, 0.63 * f)
			.addPoint(0.01, 0.3 * f)
	}
}
