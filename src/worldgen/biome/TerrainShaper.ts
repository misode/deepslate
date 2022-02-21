import type { NumberFunction } from '../../math'
import { CubicSpline } from '../../math'
import { Json } from '../../util'

const COORDINATES = ['continents', 'erosion', 'weirdness', 'ridges'] as const
type Point = Record<typeof COORDINATES[number], number>

export class TerrainShaper {
	private static readonly GLOBAL_OFFSET = -0.50375

	private static readonly EXTRACTOR = (coordinate: unknown) => {
		const key = Json.readString(coordinate) ?? 'continents'
		return TerrainShaper.extractor(key as keyof Point)
	}

	public static readonly CONTINENTS = TerrainShaper.extractor('continents')
	public static readonly EROSION = TerrainShaper.extractor('erosion')
	public static readonly WEIRDNESS = TerrainShaper.extractor('weirdness')
	public static readonly RIDGES = TerrainShaper.extractor('ridges')

	private static extractor(key: keyof Point): NumberFunction<Point> {
		return {
			compute: p => p[key],
		}
	}

	constructor (
		private readonly offsetSampler: CubicSpline<Point>,
		private readonly factorSampler: CubicSpline<Point>,
		private readonly jaggednessSampler: CubicSpline<Point>,
	) {}

	public static fromJson(obj: unknown): TerrainShaper {
		const root = Json.readObject(obj) ?? {}
		return new TerrainShaper(
			CubicSpline.fromJson(root.offset, this.EXTRACTOR),
			CubicSpline.fromJson(root.factor, this.EXTRACTOR),
			CubicSpline.fromJson(root.jaggedness, this.EXTRACTOR),
		)
	}

	public offset(point: Point) {
		return this.offsetSampler.compute(point) + TerrainShaper.GLOBAL_OFFSET
	}

	public factor(point: Point) {
		return this.factorSampler.compute(point)
	}

	public jaggedness(point: Point) {
		return this.jaggednessSampler.compute(point)
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
}
