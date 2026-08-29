import { Holder, Identifier } from '../core/index.js'
import type { BlendedNoise, Noise } from '../math/index.js'
import { clamp, clampedLerp, clampedMap, CubicSpline, floatLerp, Interval, lazyLerp3, LegacyRandom, NormalNoise, SimplexNoise, Vector } from '../math/index.js'
import { computeIfAbsent, Json } from '../util/index.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

export abstract class DensityFunction {
	public abstract compute(context: DensityFunction.Context): number

	public abstract mapChildren(visitor: DensityFunction.Visitor): DensityFunction

	public mapAll(visitor: DensityFunction.Visitor): DensityFunction {
		const recursiveVisitor: DensityFunction.Visitor = {
			apply(input: DensityFunction) {
				return visitor.apply(input.mapChildren(this))
			},
		}
		return recursiveVisitor.apply(this)
	}

	public abstract range(): Interval
}

export namespace DensityFunction {
	export interface Visitor {
		apply: (density: DensityFunction) => DensityFunction
	}

	export interface Context {
		x: number
		y: number
		z: number
	}

	export function context(x: number, y: number, z: number): Context {
		return {
			x,
			y,
			z,
		}
	}

	abstract class Transformer extends DensityFunction {
		constructor(
			public readonly input: DensityFunction
		) {
			super()
		}

		public abstract transform(context: Context, density: number): number

		public compute(context: Context): number {
			return this.transform(context, this.input.compute(context))
		}
	}

	const noiseParser = Holder.parser(WorldgenRegistries.NOISE, NormalNoise.fromJson)
	const vectorParser = (obj: unknown): Vector => {
		const arr = Json.readArray(obj, v => Json.readNumber(v) ?? 0) ?? []
		return new Vector(arr[0] ?? 0, arr[1] ?? 0, arr[2] ?? 0)
	}

	export function fromJson(obj: unknown, inputParser: (obj: unknown) => DensityFunction = fromJson): DensityFunction {
		if (typeof obj === 'string') {
			return new HolderHolder(Holder.reference(WorldgenRegistries.DENSITY_FUNCTION, Identifier.parse(obj)))
		}
		if (typeof obj === 'number') {
			return new Constant(obj)
		}

		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'blend_alpha': return new ConstantMinMax(1, 0, 1)
			case 'blend_offset': return new ConstantMinMax(0, -Infinity, Infinity)
			case 'beardifier': return new ConstantMinMax(0, -Infinity, Infinity)
			case 'old_blended_noise': return new OldBlendedNoise(
				Json.readNumber(root.xz_scale) ?? 1,
				Json.readNumber(root.y_scale) ?? 1, 
				Json.readNumber(root.xz_factor) ?? 80, 
				Json.readNumber(root.y_factor) ?? 160, 
				Json.readNumber(root.smear_scale_multiplier) ?? 8
			)
			case 'flat_cache': return new FlatCache(inputParser(root.input ?? root.argument))
			case 'interpolated': return new Interpolated(
				inputParser(root.input ?? root.argument),
				Json.readInt(root.cell_size_xz) ?? 4,
				Json.readInt(root.cell_size_y) ?? 4,
			)
			case 'cache_2d': return new Cache2D(inputParser(root.input ?? root.argument))
			case 'cache':
			case 'cache_once':
				return new CacheOnce(inputParser(root.input ?? root.argument))
			case 'cache_all_in_cell': return new CacheAllInCell(inputParser(root.input ?? root.argument))
			case 'noise':
			case 'shifted_noise':
				return new NoiseFunction(
					noiseParser(root.noise),
					Json.readNumber(root.xz_scale) ?? 1,
					Json.readNumber(root.y_scale) ?? 1,
					root.shift_x ? inputParser(root.shift_x) : DensityFunction.Constant.ZERO,
					root.shift_y ? inputParser(root.shift_y) : DensityFunction.Constant.ZERO,
					root.shift_z ? inputParser(root.shift_z) : DensityFunction.Constant.ZERO,
				)
			case 'end_islands':
			case 'end_outer_islands':
				return new EndIslands()
			case 'find_top_surface': return new FindTopSurface(
				inputParser(root.density),
				inputParser(root.upper_bound),
				Json.readInt(root.lower_bound) ?? 0,
				Json.readInt(root.cell_height) ?? 1,
			)
			case 'weird_scaled_sampler': return new WeirdScaledSampler(
				inputParser(root.input),
				Json.readEnum(root.rarity_value_mapper, RarityValueMapper),
				noiseParser(root.noise),
			)
			case 'range_choice': return new RangeChoice(
				inputParser(root.input),
				Json.readNumber(root.min_inclusive) ?? 0,
				Json.readNumber(root.max_exclusive) ?? 1,
				inputParser(root.when_in_range),
				inputParser(root.when_out_of_range),
			)
			case 'shift_a': return new ShiftA(noiseParser(root.noise ?? root.argument))
			case 'shift_b': return new ShiftB(noiseParser(root.noise ?? root.argument))
			case 'shift': return new Shift(noiseParser(root.noise ?? root.argument))
			case 'blend_density': return new BlendDensity(inputParser(root.input ?? root.argument))
			case 'clamp': return new Clamp(
				inputParser(root.input),
				Json.readNumber(root.min) ?? 0,
				Json.readNumber(root.max) ?? 1,
			)
			case 'interval_select':
				return new IntervalSelect(
					inputParser(root.input),
					Json.readArray(root.thresholds, (e) => Json.readNumber(e) ?? 0) ?? [],
					Json.readArray(root.functions, inputParser) ?? [],
				)
			case 'abs':
			case 'square':
			case 'cube':
			case 'sqrt':
			case 'half_negative':
			case 'quarter_negative':
			case 'squeeze':
			case 'invert':
			case 'reciprocal':
			case 'negate':
			case 'log':
			case 'sign':
				return new Unary(type, inputParser(root.input ?? root.argument))
			case 'add':
			case 'sub':
			case 'mul':
			case 'div':
			case 'min':
			case 'max': return new Binary(
				Json.readEnum(type, BinaryType),
				inputParser(root.left ?? root.argument1),
				inputParser(root.right ?? root.argument2),
			)
			case 'spline': return new Spline(
				CubicSpline.fromJson(root.spline, inputParser)
			)
			case 'constant': return new Constant(Json.readNumber(root.value ?? root.argument) ?? 0)
			case 'y_clamped_gradient': return new YClampedGradient(
				Json.readInt(root.from_y) ?? -4064,
				Json.readInt(root.to_y) ?? 4062,
				Json.readNumber(root.from_value) ?? -4064,
				Json.readNumber(root.to_value) ?? 4062,
			)
			case 'gradient': return new Gradient(
				Json.readEnum(root.axis, AxisType),
				Json.readEnum(root.tiling, TilingType),
				Json.readInt(root.from_coordinate) ?? 0,
				Json.readInt(root.to_coordinates) ?? 1,
				Json.readNumber(root.from_value) ?? 0,
				Json.readNumber(root.to_value) ?? 1,
			)
			case 'lerp': return new Lerp(
				inputParser(root.alpha),
				inputParser(root.first),
				inputParser(root.second),
			)
			case 'floor':
			case 'round':
			case 'ceil':
			case 'truncate':
				return new Round(
					type,
					inputParser(root.input),
					inputParser(root.multiple),
				)
			case 'pow': return new Pow(inputParser(root.base), inputParser(root.exponent))
			case 'distance_to_point': return new DistanceToPoint(
				vectorParser(root.point),
				Json.readEnum(root.metric, DistanceMetric),
			)
			case 'slice': return new Slice(
				Json.readEnum(root.axis, AxisType),
				Json.readInt(root.coordinate) ?? 0,
				inputParser(root.input),
			)
		}
		return Constant.ZERO
	}

	export class Constant extends DensityFunction {
		public static ZERO = new Constant(0)
		public static ONE = new Constant(1)
		constructor(public readonly value: number) {
			super()
		}
		public compute() {
			return this.value
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			return Interval.ofExact(this.value)
		}
	}

	export class HolderHolder extends DensityFunction {
		constructor(
			public readonly holder: Holder<DensityFunction>,
		) {
			super()
		}
		public compute(context: Context): number {
			return this.holder.value().compute(context)
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new HolderHolder(Holder.direct(visitor.apply(this.holder.value())))
		}
		public range(): Interval {
			return this.holder.value().range()
		}
	}

	export class ConstantMinMax extends DensityFunction.Constant {
		constructor(
			value: number,
			private readonly min: number,
			private readonly max: number
		){
			super(value)
		}
		public range(): Interval {
			return Interval.of(this.min, this.max)
		}
	}

	export class OldBlendedNoise extends DensityFunction {
		constructor(
			public readonly xzScale: number,
			public readonly yScale: number,
			public readonly xzFactor: number,
			public readonly yFactor: number,
			public readonly smearScaleMultiplier: number,
			private readonly blendedNoise?: BlendedNoise
		) {
			super()
		}
		public compute(context: Context) {
			return this.blendedNoise?.sample(context.x, context.y, context.z) ?? 0
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			if (!this.blendedNoise) {
				return Interval.INFINITE
			}
			return this.blendedNoise.range()
		}
	}

	abstract class Wrapper extends DensityFunction {
		constructor(
			protected readonly wrapped: DensityFunction,
		) {
			super()
		}
		public range(): Interval {
			return this.wrapped.range()
		}
	}

	export class FlatCache extends Wrapper {
		private lastQuartX?: number
		private lastQuartZ?: number
		private lastValue: number = 0
		constructor(wrapped: DensityFunction) {
			super(wrapped)
		}
		public compute(context: Context): number {
			const quartX = context.x >> 2
			const quartZ = context.z >> 2
			if (this.lastQuartX !== quartX || this.lastQuartZ !== quartZ) {
				this.lastValue = this.wrapped.compute(DensityFunction.context(quartX << 2, 0, quartZ << 2))
				this.lastQuartX = quartX
				this.lastQuartZ = quartZ
			}
			return this.lastValue
		}
		public mapChildren(visitor: Visitor) {
			return new FlatCache(visitor.apply(this.wrapped))
		}
	}

	export class CacheAllInCell extends Wrapper {
		constructor(wrapped: DensityFunction) {
			super(wrapped)
		}
		public compute(context: Context) {
			return this.wrapped.compute(context)
		}
		public mapChildren(visitor: Visitor) {
			return new CacheAllInCell(visitor.apply(this.wrapped))
		}
	}

	export class Cache2D extends Wrapper {
		private lastBlockX?: number
		private lastBlockZ?: number
		private lastValue: number = 0
		constructor(wrapped: DensityFunction) {
			super(wrapped)
		}
		public compute(context: Context) {
			const blockX = context.x
			const blockZ = context.z
			if (this.lastBlockX !== blockX || this.lastBlockZ !== blockZ) {
				this.lastValue = this.wrapped.compute(context)
				this.lastBlockX = blockX
				this.lastBlockZ = blockZ
			}
			return this.lastValue
		}
		public mapChildren(visitor: Visitor) {
			return new Cache2D(visitor.apply(this.wrapped))
		}
	}

	export class CacheOnce extends Wrapper {
		private lastBlockX?: number
		private lastBlockY?: number
		private lastBlockZ?: number
		private lastValue: number = 0
		constructor(wrapped: DensityFunction) {
			super(wrapped)
		}
		public compute(context: DensityFunction.Context) {
			const blockX = context.x
			const blockY = context.y
			const blockZ = context.z
			if (this.lastBlockX !== blockX || this.lastBlockY !== blockY || this.lastBlockZ !== blockZ) {
				this.lastValue = this.wrapped.compute(context)
				this.lastBlockX = blockX
				this.lastBlockY = blockY
				this.lastBlockZ = blockZ
			}
			return this.lastValue
		}
		public mapChildren(visitor: Visitor) {
			return new CacheOnce(visitor.apply(this.wrapped))
		}
	}

	export class Interpolated extends Wrapper {
		private readonly values: Map<string, number>
		constructor(
			wrapped: DensityFunction,
			private readonly cellWidth: number,
			private readonly cellHeight: number,
		) {
			super(wrapped)
			this.values = new Map()
		}
		public compute({ x: blockX, y: blockY, z: blockZ }: DensityFunction.Context) {
			const w = this.cellWidth
			const h = this.cellHeight
			const x = ((blockX % w + w) % w) / w
			const y = ((blockY % h + h) % h) / h
			const z = ((blockZ % w + w) % w) / w
			const firstX = Math.floor(blockX / w) * w
			const firstY = Math.floor(blockY / h) * h
			const firstZ = Math.floor(blockZ / w) * w
			const noise000 = () => this.computeCorner(firstX, firstY, firstZ)
			const noise001 = () => this.computeCorner(firstX, firstY, firstZ + w)
			const noise010 = () => this.computeCorner(firstX, firstY + h, firstZ)
			const noise011 = () => this.computeCorner(firstX, firstY + h, firstZ + w)
			const noise100 = () => this.computeCorner(firstX + w, firstY, firstZ)
			const noise101 = () => this.computeCorner(firstX + w, firstY, firstZ + w)
			const noise110 = () => this.computeCorner(firstX + w, firstY + h, firstZ)
			const noise111 = () => this.computeCorner(firstX + w, firstY + h, firstZ + w)
			return lazyLerp3(x, y, z, noise000, noise100, noise010, noise110, noise001, noise101, noise011, noise111)
		}
		private computeCorner(x: number, y: number, z: number) {
			return computeIfAbsent(this.values, `${x} ${y} ${z}`, () => {
				return this.wrapped.compute(DensityFunction.context(x, y, z))
			})
		}
		public mapChildren(visitor: Visitor) {
			return new Interpolated(visitor.apply(this.wrapped), this.cellWidth, this.cellHeight)
		}
		public withCellSize(cellWidth: number, cellHeight: number) {
			return new Interpolated(this.wrapped, cellWidth, cellHeight)
		}
	}

	export class NoiseFunction extends DensityFunction {
		constructor(
			public readonly noise: Holder<NormalNoise>,
			public readonly xzScale: number,
			public readonly yScale: number,
			public readonly shiftX: DensityFunction,
			public readonly shiftY: DensityFunction,
			public readonly shiftZ: DensityFunction,
			public readonly noiseSampler?: Noise,
		) {
			super()
		}
		public compute(context: Context) {
			const x = context.x * this.xzScale + this.shiftX.compute(context)
			const y = context.y * this.yScale + this.shiftY.compute(context)
			const z = context.z * this.xzScale + this.shiftZ.compute(context)
			return this.noiseSampler?.get3D(x, y, z) ?? 0
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new NoiseFunction(this.noise, this.xzScale, this.yScale, visitor.apply(this.shiftX), visitor.apply(this.shiftY), visitor.apply(this.shiftZ), this.noiseSampler)
		}
		public range(): Interval {
			if (!this.noiseSampler) {
				return Interval.INFINITE
			}
			return this.noiseSampler.range()
		}
	}

	export class EndIslands extends DensityFunction {
		private readonly islandNoise: SimplexNoise
		constructor(seed?: bigint) {
			super()
			const random = new LegacyRandom(seed ?? BigInt(0))
			random.consume(17292)
			this.islandNoise = new SimplexNoise(random)
		}
		private getHeightValue(x: number, z: number) {
			const x0 = Math.floor(x / 2)
			const z0 = Math.floor(z / 2)
			const x1 = x % 2
			const z1 = z % 2
			let f = clamp(100 - Math.sqrt(x * x + z * z) * 8, -100, 80)

			for (let i = -12; i <= 12; i += 1) {
				for (let j = -12; j <= 12; j += 1) {
					const x2 = x0 + i
					const z2 = z0 + j
					if (x2 * x2 + z2 * z2 <= 4096 || this.islandNoise.get2D(x2, z2) >= -0.9) {
						continue
					}
					const f1 = (Math.abs(x2) * 3439 + Math.abs(z2) * 147) % 13 + 9
					const x3 = x1 + i * 2
					const z3 = z1 + j * 2
					const f2 = 100 - Math.sqrt(x3 * x3 + z3 * z3) * f1
					const f3 = clamp(f2, -100, 80)
					f = Math.max(f, f3)
				}
			}

			return f
		}
		public compute({ x, y, z }: DensityFunction.Context) {
			return (this.getHeightValue(Math.floor(x / 8), Math.floor(z / 8)) - 8) / 128
		}
		public mapChildren(visitor: Visitor) {
			return this
		}
		public range(): Interval {
			return Interval.of(-0.84375, 0.5625)
		}
	}

	export class FindTopSurface extends DensityFunction {
		constructor(
			public readonly density: DensityFunction,
			public readonly upperBound: DensityFunction,
			public readonly lowerBound: number,
			public readonly cellHeight: number,
		) {
			super()
		}
		public compute(context: DensityFunction.Context) {
			const topY = Math.floor(this.upperBound.compute(context) / this.cellHeight) * this.cellHeight
			if (topY < this.lowerBound) {
				return this.lowerBound
			}
			for (let blockY = topY; blockY >= this.lowerBound; blockY -= this.cellHeight) {
				if (this.density.compute(DensityFunction.context(context.x, blockY, context.z)) > 0) {
					return blockY
				}
			}
			return this.lowerBound
		}
		public mapChildren(visitor: Visitor) {
			return new FindTopSurface(visitor.apply(this.density), visitor.apply(this.upperBound), this.lowerBound, this.cellHeight)
		}
		public range() {
			return Interval.of(this.lowerBound, Math.max(this.lowerBound, this.upperBound.range().max))
		}
	}

	const RarityValueMapper = ['type_1', 'type_2'] as const

	export class WeirdScaledSampler extends Transformer {
		private static readonly ValueMapper: Record<typeof RarityValueMapper[number], (value: number) => number> = {
			type_1: WeirdScaledSampler.rarityValueMapper1,
			type_2: WeirdScaledSampler.rarityValueMapper2,
		}
		private readonly mapper: (value: number) => number
		constructor(
			input: DensityFunction,
			public readonly rarityValueMapper: typeof RarityValueMapper[number],
			public readonly noise: Holder<NormalNoise>,
			public readonly noiseSampler?: Noise,
		) {
			super(input)
			this.mapper = WeirdScaledSampler.ValueMapper[this.rarityValueMapper]
		}
		public transform(context: Context, density: number) {
			if (!this.noiseSampler) {
				return 0
			}
			const rarity = this.mapper(density)
			return rarity * Math.abs(this.noiseSampler.get3D(context.x / rarity, context.y / rarity, context.z / rarity))
		}
		public mapChildren(visitor: Visitor) {
			return new WeirdScaledSampler(visitor.apply(this.input), this.rarityValueMapper, this.noise, this.noiseSampler)
		}
		public range(): Interval {
			return Interval.of(0, this.rarityValueMapper === 'type_1' ? 2 : 3)
		}
		public static rarityValueMapper1(value: number) {
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
		public static rarityValueMapper2(value: number) {
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
	}

	export class RangeChoice extends DensityFunction {
		constructor(
			public readonly input: DensityFunction,
			public readonly minInclusive: number,
			public readonly maxExclusive: number,
			public readonly whenInRange: DensityFunction,
			public readonly whenOutOfRange: DensityFunction,
		) {
			super()
		}
		public compute(context: Context) {
			const x = this.input.compute(context)
			return (this.minInclusive <= x && x < this.maxExclusive)
				? this.whenInRange.compute(context)
				: this.whenOutOfRange.compute(context)
		}
		public mapChildren(visitor: Visitor) {
			return new RangeChoice(visitor.apply(this.input), this.minInclusive, this.maxExclusive, visitor.apply(this.whenInRange), visitor.apply(this.whenOutOfRange))
		}
		public range(): Interval {
			return Interval.encapsulating(this.whenInRange.range(), this.whenOutOfRange.range())
		}
	}

	export abstract class ShiftNoise extends DensityFunction {
		constructor(
			public readonly noise: Holder<NormalNoise>,
			public readonly noiseSampler?: Noise,
		) {
			super()
		}
		public compute(context: Context) {
			return (this.noiseSampler?.get3D(context.x * 0.25, context.y * 0.25, context.z * 0.25) ?? 0) * 4
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			if (!this.noiseSampler) {
				return Interval.INFINITE
			}
			return Interval.mul(this.noiseSampler.range(), Interval.ofExact(4))
		}
		public abstract withNewNoise(noiseSampler: Noise): ShiftNoise
	}

	export class ShiftA extends ShiftNoise {
		constructor(
			noise: Holder<NormalNoise>,
			noiseSampler?: Noise,
		) {
			super(noise, noiseSampler)
		}
		public compute(context: Context) {
			return super.compute(DensityFunction.context(context.x, 0, context.z))
		}
		public withNewNoise(noiseSampler: Noise) {
			return new ShiftA(this.noise, noiseSampler)
		}
	}

	export class ShiftB extends ShiftNoise {
		constructor(
			noise: Holder<NormalNoise>,
			noiseSampler?: Noise,
		) {
			super(noise, noiseSampler)
		}
		public compute(context: Context) {
			return super.compute(DensityFunction.context(context.z, context.x, 0))
		}
		public withNewNoise(noiseSampler: Noise) {
			return new ShiftB(this.noise, noiseSampler)
		}
	}

	export class Shift extends ShiftNoise {
		constructor(
			noise: Holder<NormalNoise>,
			noiseSampler?: Noise,
		) {
			super(noise, noiseSampler)
		}
		public withNewNoise(noiseSampler: Noise) {
			return new Shift(this.noise, noiseSampler)
		}
	}

	export class BlendDensity extends Transformer {
		constructor(
			input: DensityFunction,
		) {
			super(input)
		}
		public transform(context: Context, density: number) {
			return density // blender not supported
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new BlendDensity(visitor.apply(this.input))
		}
		public range(): Interval {
			return Interval.INFINITE
		}
	}

	export class Clamp extends Transformer {
		constructor(
			input: DensityFunction,
			public readonly min: number,
			public readonly max: number,
		) {
			super(input)
		}
		public transform(context: Context, density: number) {
			return clamp(density, this.min, this.max)
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Clamp(visitor.apply(this.input), this.min, this.max)
		}
		public range() {
			return Interval.clamp(this.input.range(), this.min, this.max)
		}
	}

	export class IntervalSelect extends DensityFunction {
		constructor(
			public readonly input: DensityFunction,
			public readonly thresholds: number[],
			public readonly functions: DensityFunction[],
		) {
			super()
			const minLength = Math.min(thresholds.length, functions.length)
			this.thresholds = this.thresholds.slice(0, minLength)
			this.functions = this.functions.slice(0, minLength)
		}
		public compute(context: Context) {
			const input = this.input.compute(context)
			for (let i = 0; i < this.thresholds.length; i += 1) {
				if (input < this.thresholds[i]) {
					return this.functions[i].compute(context)
				}
			}
			return this.functions[this.functions.length-1].compute(context)
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new IntervalSelect(visitor.apply(this.input), this.thresholds, this.functions.map(visitor.apply))
		}
		public range(): Interval {
			return Interval.encapsulating(...this.functions.map(fn => fn.range()))
		}
	}

	const UnaryType = ['abs', 'square', 'cube', 'sqrt', 'half_negative', 'quarter_negative', 'squeeze', 'invert', 'reciprocal', 'negate', 'log', 'sign'] as const

	export class Unary extends Transformer {
		constructor(
			public readonly type: typeof UnaryType[number],
			input: DensityFunction,
		) {
			super(input)
		}
		public transform(context: Context, density: number) {
			return Unary.transform(this.type, density)
		}
		private static transform(type: typeof UnaryType[number], d: number): number {
			switch (type) {
				case 'abs': return Math.abs(d)
				case 'square': return d * d
				case 'cube': return d * d * d
				case 'half_negative': return d > 0 ? d : d * 0.5
				case 'quarter_negative': return d > 0 ? d : d * 0.25
				case 'squeeze':
					const c = clamp(d, -1, 1)
					return c / 2 - c * c * c / 24
				case 'invert':
				case 'reciprocal':
					return 1/d
				case 'negate': return -d
				case 'sqrt': return Math.sqrt(d)
				case 'log': return Math.log(d)
				case 'sign': return Math.sign(d)
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Unary(this.type, visitor.apply(this.input))
		}
		public range(): Interval {
			const inputRange = this.input.range()
			switch (this.type) {
				case 'abs': return Interval.abs(inputRange)
				case 'square': return Interval.square(inputRange)
				case 'cube':
				case 'half_negative':
				case 'quarter_negative':
				case 'squeeze':
					return Interval.mapMonotonic(inputRange, value => Unary.transform(this.type, value))
				case 'invert':
				case 'reciprocal':
					return Interval.reciprocal(inputRange)
				case 'negate': return Interval.sub(Interval.ofExact(0), inputRange)
				case 'sqrt': return Interval.pow(inputRange, Interval.ofExact(0.5))
				case 'log': return Interval.log(inputRange)
				case 'sign': return Interval.sign(inputRange)
			}
		}
	}

	const BinaryType = ['add', 'sub', 'mul', 'div', 'min', 'max'] as const

	export class Binary extends DensityFunction {
		private rightRange: Interval = Interval.INFINITE
		constructor(
			public readonly type: typeof BinaryType[number],
			public readonly left: DensityFunction,
			public readonly right: DensityFunction,
		) {
			super()
		}
		public compute(context: Context): number {
			const a = this.left.compute(context)
			switch (this.type) {
				case 'add': return a + this.right.compute(context)
				case 'sub': return a - this.right.compute(context)
				case 'mul': return a === 0 ? 0 : a * this.right.compute(context)
				case 'div': return a === 0 ? 0 : a / this.right.compute(context)
				case 'min': return a < this.rightRange.min ? a : Math.min(a, this.right.compute(context))
				case 'max': return a > this.rightRange.max ? a : Math.max(a, this.right.compute(context))
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Binary(this.type, visitor.apply(this.left), visitor.apply(this.right))
		}
		public range(): Interval {
			const left = this.left.range()
			const right = this.right.range()
			switch (this.type) {
				case 'add': return Interval.add(left, right)
				case 'sub': return Interval.sub(left, right)
				case 'mul': return Interval.mul(left, right)
				case 'div': return Interval.div(left, right)
				case 'min': return Interval.min(left, right)
				case 'max': return Interval.max(left, right)
			}
		}
		public trySimplify(): DensityFunction {
			if (this.type === 'mul' || this.type === 'add') {
				if (this.left instanceof Constant) {
					return new MulOrAdd(this.type, this.right, this.left.value)
				}
				if (this.right instanceof Constant) {
					return new MulOrAdd(this.type, this.left, this.right.value)
				}
			}
			this.rightRange = this.right.range()
			return this
		}
	}

	const MulOrAddType = ['add', 'mul'] as const

	export class MulOrAdd extends Transformer {
		constructor(
			private readonly type: typeof MulOrAddType[number],
			input: DensityFunction,
			private readonly value: number,
		) {
			super(input)
		}
		public transform(context: Context, density: number): number {
			switch (this.type) {
				case 'mul': return density * this.value
				case 'add': return density + this.value
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new MulOrAdd(this.type, visitor.apply(this.input), this.value)
		}
		public range(): Interval {
			switch (this.type) {
				case 'mul': return Interval.mul(this.input.range(), Interval.ofExact(this.value))
				case 'add': return Interval.add(this.input.range(), Interval.ofExact(this.value))
			}
		}
	}

	export class Spline extends DensityFunction {
		constructor(
			public readonly spline: CubicSpline<Context>,
		) {
			super()
		}
		public compute(context: Context): number {
			return this.spline.compute(context)
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Spline(this.spline.mapCoordinates(c => {
				if (c instanceof DensityFunction) {
					return visitor.apply(c)
				}
				return c
			}))
		}
		public range(): Interval {
			return this.spline.range()
		}
	}

	export class YClampedGradient extends DensityFunction {
		constructor(
			public readonly fromY: number,
			public readonly toY: number,
			public readonly fromValue: number,
			public readonly toValue: number,
		) {
			super()
		}
		public compute(context: Context): number {
			return clampedMap(context.y, this.fromY, this.toY, this.fromValue, this.toValue)
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			return Interval.of(Math.min(this.fromValue, this.toValue), Math.max(this.fromValue, this.toValue))
		}
	}

	const AxisType = ['x', 'y', 'z'] as const
	const TilingType = ['clamp_to_edge', 'repeat', 'mirrored_repeat'] as const

	export class Gradient extends DensityFunction {
		constructor(
			public readonly axis: typeof AxisType[number],
			public readonly tiling: typeof TilingType[number],
			public readonly fromCoordinate: number,
			public readonly toCoordinate: number,
			public readonly fromValue: number,
			public readonly toValue: number,
		) {
			super()
		}
		public compute(context: Context): number {
			const range = this.toCoordinate - this.fromCoordinate
			let coordinate = context[this.axis] - this.fromCoordinate 
			switch (this.tiling) {
				case 'clamp_to_edge':
					break
				case 'repeat':
					coordinate = ((coordinate % range) + range) % range
					break
				case 'mirrored_repeat':
					const tileIndex = Math.floor(coordinate / range)
					const localCoordinate = coordinate - tileIndex * range
					coordinate = (tileIndex & 1) == 0 ? localCoordinate : range - localCoordinate
					break
			}
			return clampedLerp(coordinate / range, this.fromValue, this.toValue)
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			return Interval.between(this.fromValue, this.toValue)
		}
	}

	export class Lerp extends DensityFunction {
		constructor(
			public readonly alpha: DensityFunction,
			public readonly first: DensityFunction,
			public readonly second: DensityFunction,
		) {
			super()
		}	
		public compute(context: Context): number {
			const a = this.alpha.compute(context)
			if (a === 0) {
				return this.first.compute(context)
			} else if (a === 1) {
				return this.second.compute(context)
			} else {
				return floatLerp(a, this.first.compute(context), this.second.compute(context))
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Lerp(visitor.apply(this.alpha), visitor.apply(this.first), visitor.apply(this.second))
		}
		public range(): Interval {
			return Interval.lerp(this.alpha.range(), this.first.range(), this.second.range())
		}
	}

	const RoundType = ['floor', 'round', 'ceil', 'truncate'] as const

	export class Round extends DensityFunction {
		constructor(
			public readonly type: typeof RoundType[number],
			public readonly input: DensityFunction,
			public readonly multiple: DensityFunction,
		) {
			super()
		}
		public compute(context: Context): number {
			const a = this.input.compute(context)
			const m = this.multiple.compute(context)
			return m === 0 ? a : this.roundToInteger(a / m) * m
		}
		private roundToInteger(value: number) {
			switch (this.type) {
				case 'floor': return Math.floor(value)
				case 'round': return Math.round(value)
				case 'ceil': return Math.ceil(value)
				case 'truncate': return Math.trunc(value)
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Round(this.type, visitor.apply(this.input), visitor.apply(this.multiple))
		}
		public range(): Interval {
			const multipleRange = this.multiple.range()
			return Interval.mul(Interval.mapMonotonic(Interval.div(this.input.range(), multipleRange), value => this.roundToInteger(value)), multipleRange)
		}
	}

	export class Pow extends DensityFunction {
		constructor(
			public readonly base: DensityFunction,
			public readonly exponent: DensityFunction,
		) {
			super()
		}
		public compute(context: Context): number {
			return Math.pow(this.base.compute(context), this.exponent.compute(context))
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Pow(visitor.apply(this.base), visitor.apply(this.exponent))
		}
		public range(): Interval {
			return Interval.pow(this.base.range(), this.exponent.range())
		}
	}

	const DistanceMetric = ['euclidean', 'euclidean_squared', 'manhattan', 'chebyshev'] as const

	export class DistanceToPoint extends DensityFunction {
		constructor(
			public readonly point: Vector,
			public readonly metric: typeof DistanceMetric[number],
		) {
			super()
		}
		public compute(context: Context): number {
			const delta = this.point.sub(new Vector(context.x, context.y, context.z))
			switch (this.metric) {
				case 'euclidean': return delta.length()
				case 'euclidean_squared': return delta.lengthSquared()
				case 'manhattan': return Math.abs(delta.x) + Math.abs(delta.y) + Math.abs(delta.z)
				case 'chebyshev': return Math.max(Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z))
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			return Interval.of(0, Infinity)
		}
	}

	export class Slice extends DensityFunction {
		constructor(
			public readonly axis: typeof AxisType[number],
			public readonly coordinate: number,
			public readonly input: DensityFunction,
		) {
			super()
		}
		public compute(context: Context): number {
			switch (this.axis) {
				case 'x': return this.input.compute({ x: 0, y: context.y, z: context.z })
				case 'y': return this.input.compute({ x: 0, y: context.y, z: context.z })
				case 'z': return this.input.compute({ x: 0, y: context.y, z: context.z })
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Slice(this.axis, this.coordinate, visitor.apply(this.input))
		}
		public range(): Interval {
			return this.input.range()
		}
	}
}
