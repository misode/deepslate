export class NoiseSampler {
	public static computeDimensionDensity(a: number, b: number, c: number, d = 0) {
		return a * (1 - c / 128 + d) + b
	}
}
