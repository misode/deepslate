import { Json } from '../../core'
import { lerp, Spline } from '../../math'

type Point = {
	readonly continents: number,
	readonly erosion: number,
	readonly weirdness: number,
	readonly ridges: number,
}

export class TerrainShaper {
	private static readonly GLOBAL_OFFSET = -0.50375

	constructor (
		private readonly offsetSampler: { apply: (p: Point) => number },
		private readonly factorSampler: { apply: (p: Point) => number },
		private readonly jaggednessSampler: { apply: (p: Point) => number },
	) {}

	public static fromJson(obj: unknown): TerrainShaper {
		const root = Json.readObject(obj) ?? {}
		return new TerrainShaper(
			this.splineFromJson(root.offset),
			this.splineFromJson(root.factor),
			this.splineFromJson(root.offset),
		)
	}

	private static splineFromJson(obj: unknown) {
		if (typeof obj === 'number') {
			return () => obj
		}
		const root = Json.readObject(obj) ?? {}
		const coordinate = Json.readString(root.coordinate) ?? 'continents'
		const spline = new Spline<Point>(coordinate, p => (p as any)[coordinate])
		const points = Json.readArray(root.points, e => Json.readObject(e) ?? {}) ?? []
		if (points.length === 0) {
			return () => 0
		}
		for (const point of points) {
			const location = Json.readNumber(point.location) ?? 0
			const value = this.splineFromJson(point.value)
			const derivative = Json.readNumber(point.derivative) ?? 0
			spline.addPoint(location, value, derivative)
		}
		return spline
	}

	public offset(point: Point) {
		return this.offsetSampler.apply(point) + TerrainShaper.GLOBAL_OFFSET
	}

	public factor(point: Point) {
		return this.factorSampler.apply(point)
	}

	public jaggedness(point: Point) {
		return this.jaggednessSampler.apply(point)
	}

	public static point(continents: number, erosion: number, weirdness: number): Point {
		return {
			continents,
			erosion,
			weirdness,
			ridges: this.peaksAndValleys(weirdness),
		}
	}

	public static peaksAndValleys(weirdness: number) {
		return -(Math.abs(Math.abs(weirdness) - 0.6666667) - 0.33333334) * 3.0
	}

	public static overworld() {
		const beachSpline = this.buildErosionOffsetSpline('beachSpline', -0.05, 0.0, 0.0, 0.1, 0.0, -0.03, false, false)
		const lowSpline = this.buildErosionOffsetSpline('lowSpline', -0.1, 0.03, 0.1, 0.1, 0.01, -0.03, false, false)
		const midSpline = this.buildErosionOffsetSpline('midSpline', -0.1, 0.03, 0.1, 0.7, 0.01, -0.03, true, true)
		const highSpline = this.buildErosionOffsetSpline('highSpline', 0.3, 0.03, 0.1, 1.0, 0.01, 0.01, true, true)
	
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
			.addPoint(-0.15, this.getErosionFactor('erosionCoast', 6.25, true))
			.addPoint(-0.1, this.getErosionFactor('erosionInland', 5.47, true))
			.addPoint(0.03, this.getErosionFactor('erosionMidInland', 5.08, true))
			.addPoint(0.06, this.getErosionFactor('erosionFarInland', 4.69, false))
	
		const jaggednessSampler = new Spline<Point>('Jaggedness', p => p.continents)
			.addPoint(0.11, 0.0)
			.addPoint(0.03, this.buildErosionJaggednessSpline(1, 0.5, 0, 0))
			.addPoint(0.65, this.buildErosionJaggednessSpline(1, 1, 1, 0))
		
		return new TerrainShaper(offsetSampler, factorSampler, jaggednessSampler)
	}

	private static getErosionFactor(string: string, f: number, bl: boolean) {
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

	private static buildErosionOffsetSpline(name: string, f: number, f2: number, f3: number, f4: number, f5: number, f6: number, bl: boolean, bl2: boolean) {
		const mountain1 = this.buildMountainRidgeSplineWithPoints(lerp(f4, 0.6, 1.5), bl2)
		const mountain2 = this.buildMountainRidgeSplineWithPoints(lerp(f4, 0.6, 1.0), bl2)
		const mountain3 = this.buildMountainRidgeSplineWithPoints(f4,bl2)
		const widePlateau = this.ridgeSpline(name + '-widePlateau', f - 0.15, 0.5 * f4, lerp(0.5, 0.5, 0.5) * f4, 0.5 * f4, 0.6 * f4, 0.5)
		const narrowPlateau = this.ridgeSpline(name + '-narrowPlateau', f, f5 * f4, f2 * f4, 0.5 * f4, 0.6 * f4, 0.5)
		const plains = this.ridgeSpline(name + '-plains', f, f5, f5, f2, f3, 0.5)
		const plainsFarInland = this.ridgeSpline(name + '-plainsFarInland',f, f5, f5, f2, f3, 0.5)
		const extremeHills = new Spline<Point>(name, p => p.ridges)
			.addPoint(-1.0, f)
			.addPoint(-0.4, plains)
			.addPoint(0.0, f3 + 0.07)
		const swampsRidges = this.ridgeSpline(name + '-swamps', -0.02, f6, f6, f2, f3, 0.0)

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

	private static buildMountainRidgeSplineWithPoints(f: number, bl: boolean) {
		const spline = new Spline<Point>(`M-spline for continentalness: ${f} ${bl}`, p => p.ridges)
		const f4 = this.mountainContinentalness(-1.0, f, -0.7)
		const f6 = this.mountainContinentalness(1.0, f, -0.7)
		const f7 = this.calculateMountainRidgeZeroContinentalnessPoint(f)
		if (-0.65 < f7 && f7 < 1.0) {
			const f9 = this.mountainContinentalness(-0.65, f, -0.7)
			const f11 = this.mountainContinentalness(-0.75, f, -0.7)
			const f12 = this.calculateSlope(f4, f11, -1.0, -0.75)
			spline.addPoint(-1.0, f4, f12)
			spline.addPoint(-0.75, f11)
			spline.addPoint(-0.65, f9)
			const f13 = this.mountainContinentalness(f7, f, -0.7)
			const f14 = this.calculateSlope(f13, f6, f7, 1.0)
			spline.addPoint(f7 - 0.01, f13)
			spline.addPoint(f7, f13, f14)
			spline.addPoint(1.0, f6, f14)
		} else {
			const f16 = this.calculateSlope(f4, f6, -1.0, 1.0)
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

	private static mountainContinentalness(f: number, f2: number, f3: number) {
		const f6 = 1.0 - (1.0 - f2) * 0.5
		const f7 = 0.5 * (1.0 - f2)
		const f8 = (f + 1.17) * 0.46082947
		const f9 = f8 * f6 - f7
		if (f < f3) {
			return Math.max(f9, -0.2222)
		}
		return Math.max(f9, 0)
	}

	private static calculateMountainRidgeZeroContinentalnessPoint(f: number) {
		const f4 = 1.0 - (1.0 - f) * 0.5
		const f5 = 0.5 * (1.0 - f)
		const f6 = f5 / (0.46082947 * f4) - 1.17
		return f6
	}

	private static calculateSlope(f: number, f2: number, f3: number, f4: number) {
		return (f2 - f) / (f4 - f3)
	}

	private static ridgeSpline(name: string, f: number, f2: number, f3: number, f4: number, f5: number, f6: number) {
		const f7 = Math.max(0.5 * (f2 - f), f6)
		const f8 = 5.0 * (f3 - f2)
		return new Spline<Point>(name, (p) => p.ridges)
			.addPoint(-1.0, f, f7)
			.addPoint(-0.4, f2, Math.min(f7, f8))
			.addPoint(0.0, f3, f8)
			.addPoint(0.4, f4, 2.0 * (f4 - f3))
			.addPoint(1.0, f5, 0.7 * (f5 - f4))
	}
	
	private static buildErosionJaggednessSpline(f: number, f2: number, f3: number, f4: number) {
		const ridgeSpline1 = this.buildRidgeJaggednessSpline(f, f3)
		const ridgeSpline2 = this.buildRidgeJaggednessSpline(f2, f4)
		return new Spline<Point>('Jaggedness-erosion', p => p.erosion)
			.addPoint(-1, ridgeSpline1)
			.addPoint(-0.78, ridgeSpline2)
			.addPoint(-0.5775, ridgeSpline2)
			.addPoint(-0.375, 0)
	}

	private static buildRidgeJaggednessSpline(f: number, f2: number) {
		const f3 = TerrainShaper.peaksAndValleys(0.4)
		const f4 = TerrainShaper.peaksAndValleys(0.56666666)
		const f5 = (f3 + f4) / 2
		return new Spline<Point>('Jaggedness-ridges', p => p.ridges)
			.addPoint(f3, 0)
			.addPoint(f5, f2 > 0 ? this.buildWeirdnessJaggednessSpline(f2) : 0)
			.addPoint(1, f > 0 ? this.buildWeirdnessJaggednessSpline(f) : 0)
	}

	private static buildWeirdnessJaggednessSpline(f: number) {
		return new Spline<Point>('Jaggedness-weirdness', p => p.weirdness)
			.addPoint(-0.01, 0.63 * f)
			.addPoint(0.01, 0.3 * f)
	}
}
