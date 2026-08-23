import { Holder, Identifier } from '../core/index.js'
import type { BlendedNoise, NormalNoise } from '../math/index.js'
import { clamp, clampedMap, CubicSpline, Interval, lazyLerp3, LegacyRandom, NoiseParameters, SimplexNoise } from '../math/index.js'
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

	const NoiseParser = Holder.parser(WorldgenRegistries.NOISE, NoiseParameters.fromJson)

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
			case 'flat_cache': return new FlatCache(inputParser(root.argument))
			case 'interpolated': return new Interpolated(inputParser(root.argument))
			case 'cache_2d': return new Cache2D(inputParser(root.argument))
			case 'cache_once': return new CacheOnce(inputParser(root.argument))
			case 'cache_all_in_cell': return new CacheAllInCell(inputParser(root.argument))
			case 'noise': return new Noise(
				Json.readNumber(root.xz_scale) ?? 1,
				Json.readNumber(root.y_scale) ?? 1,
				NoiseParser(root.noise),
			)
			case 'end_islands': return new EndIslands()
			case 'find_top_surface': return new FindTopSurface(
				inputParser(root.density),
				inputParser(root.upper_bound),
				Json.readInt(root.lower_bound) ?? 0,
				Json.readInt(root.cell_height) ?? 1,
			)
			case 'weird_scaled_sampler': return new WeirdScaledSampler(
				inputParser(root.input),
				Json.readEnum(root.rarity_value_mapper, RarityValueMapper),
				NoiseParser(root.noise),
			)
			case 'shifted_noise': return new ShiftedNoise(
				inputParser(root.shift_x),
				inputParser(root.shift_y),
				inputParser(root.shift_z),
				Json.readNumber(root.xz_scale) ?? 1,
				Json.readNumber(root.y_scale) ?? 1,
				NoiseParser(root.noise),
			)
			case 'range_choice': return new RangeChoice(
				inputParser(root.input),
				Json.readNumber(root.min_inclusive) ?? 0,
				Json.readNumber(root.max_exclusive) ?? 1,
				inputParser(root.when_in_range),
				inputParser(root.when_out_of_range),
			)
			case 'shift_a': return new ShiftA(NoiseParser(root.argument))
			case 'shift_b': return new ShiftB(NoiseParser(root.argument))
			case 'shift': return new Shift(NoiseParser(root.argument))
			case 'blend_density': return new BlendDensity(inputParser(root.argument))
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
			case 'half_negative':
			case 'invert':
			case 'quarter_negative':
			case 'squeeze':
				return new Unary(type, inputParser(root.argument))
			case 'add':
			case 'mul':
			case 'min':
			case 'max': return new Binary(
				Json.readEnum(type, BinaryType),
				inputParser(root.argument1),
				inputParser(root.argument2),
			)
			case 'spline': return new Spline(
				CubicSpline.fromJson(root.spline, inputParser)
			)
			case 'constant': return new Constant(Json.readNumber(root.argument) ?? 0)
			case 'y_clamped_gradient': return new YClampedGradient(
				Json.readInt(root.from_y) ?? -4064,
				Json.readInt(root.to_y) ?? 4062,
				Json.readNumber(root.from_value) ?? -4064,
				Json.readNumber(root.to_value) ?? 4062,
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
			return Interval.ofSymmetric(this.blendedNoise.maxValue)
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
			private readonly cellWidth: number = 4,
			private readonly cellHeight: number = 4,
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
			return new Interpolated(visitor.apply(this.wrapped))
		}
		public withCellSize(cellWidth: number, cellHeight: number) {
			return new Interpolated(this.wrapped, cellWidth, cellHeight)
		}
	}

	export class Noise extends DensityFunction {
		constructor(
			public readonly xzScale: number,
			public readonly yScale: number,
			public readonly noiseData: Holder<NoiseParameters>,
			public readonly noise?: NormalNoise,
		) {
			super()
		}
		public compute(context: Context) {
			return this.noise?.sample(context.x * this.xzScale, context.y * this.yScale, context.z * this.xzScale) ?? 0
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			if (!this.noise) {
				return Interval.INFINITE
			}
			return Interval.ofSymmetric(this.noise.maxValue)
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
					if (x2 * x2 + z2 * z2 <= 4096 || this.islandNoise.sample2D(x2, z2) >= -0.9) {
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
			public readonly noiseData: Holder<NoiseParameters>,
			public readonly noise?: NormalNoise,
		) {
			super(input)
			this.mapper = WeirdScaledSampler.ValueMapper[this.rarityValueMapper]
		}
		public transform(context: Context, density: number) {
			if (!this.noise) {
				return 0
			}
			const rarity = this.mapper(density)
			return rarity * Math.abs(this.noise.sample(context.x / rarity, context.y / rarity, context.z / rarity))
		}
		public mapChildren(visitor: Visitor) {
			return new WeirdScaledSampler(visitor.apply(this.input), this.rarityValueMapper, this.noiseData, this.noise)
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

	export class ShiftedNoise extends Noise {
		constructor(
			public readonly shiftX: DensityFunction,
			public readonly shiftY: DensityFunction,
			public readonly shiftZ: DensityFunction,
			xzScale: number,
			yScale: number,
			noiseData: Holder<NoiseParameters>,
			noise?: NormalNoise
		) {
			super(xzScale, yScale, noiseData, noise)
		}
		public compute(context: Context) {
			const xx = context.x * this.xzScale + this.shiftX.compute(context)
			const yy = context.y * this.yScale + this.shiftY.compute(context)
			const zz = context.z * this.xzScale + this.shiftZ.compute(context)
			return this.noise?.sample(xx, yy, zz) ?? 0
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new ShiftedNoise(visitor.apply(this.shiftX), visitor.apply(this.shiftY), visitor.apply(this.shiftZ), this.xzScale, this.yScale, this.noiseData, this.noise)
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
			public readonly noiseData: Holder<NoiseParameters>,
			public readonly offsetNoise?: NormalNoise,
		) {
			super()
		}
		public compute(context: Context) {
			return (this.offsetNoise?.sample(context.x * 0.25, context.y * 0.25, context.z * 0.25) ?? 0) * 4
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range(): Interval {
			if (!this.offsetNoise) {
				return Interval.INFINITE
			}
			return Interval.mul(Interval.ofSymmetric(this.offsetNoise.maxValue), Interval.ofExact(4))
		}
		public abstract withNewNoise(noise: NormalNoise): ShiftNoise
	}

	export class ShiftA extends ShiftNoise {
		constructor(
			noiseData: Holder<NoiseParameters>,
			offsetNoise?: NormalNoise,
		) {
			super(noiseData, offsetNoise)
		}
		public compute(context: Context) {
			return super.compute(DensityFunction.context(context.x, 0, context.z))
		}
		public withNewNoise(newNoise: NormalNoise) {
			return new ShiftA(this.noiseData, newNoise)
		}
	}

	export class ShiftB extends ShiftNoise {
		constructor(
			noiseData: Holder<NoiseParameters>,
			offsetNoise?: NormalNoise,
		) {
			super(noiseData, offsetNoise)
		}
		public compute(context: Context) {
			return super.compute(DensityFunction.context(context.z, context.x, 0))
		}
		public withNewNoise(newNoise: NormalNoise) {
			return new ShiftB(this.noiseData, newNoise)
		}
	}

	export class Shift extends ShiftNoise {
		constructor(
			noiseData: Holder<NoiseParameters>,
			offsetNoise?: NormalNoise,
		) {
			super(noiseData, offsetNoise)
		}
		public withNewNoise(newNoise: NormalNoise) {
			return new Shift(this.noiseData, newNoise)
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

	const UnaryType = ['abs', 'square', 'cube', 'half_negative', 'quarter_negative', 'invert', 'squeeze'] as const

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
		private static transform(type: typeof UnaryType[number], d: number) {
			switch (type) {
				case 'abs':
					return Math.abs(d)
				case 'square':
					return d * d
				case 'cube':
					return d * d * d
				case 'half_negative':
					return d > 0 ? d : d * 0.5
				case 'quarter_negative':
					return d > 0 ? d : d * 0.25
				case 'invert':
					return 1/d
				case 'squeeze':
					const c = clamp(d, -1, 1)
					return c / 2 - c * c * c / 24
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new Unary(this.type, visitor.apply(this.input))
		}
		public range() {
			const inputRange = this.input.range()
			switch (this.type) {
				case 'abs':
					return Interval.abs(inputRange)
				case 'square':
					return Interval.square(inputRange)
				case 'cube':
				case 'half_negative':
				case 'quarter_negative':
				case 'squeeze':
					return Interval.mapMonotonic(inputRange, value => Unary.transform(this.type, value))
				case 'invert':
					return Interval.reciprocal(inputRange)
			}
		}
	}

	const BinaryType = ['add', 'mul', 'min', 'max'] as const

	export class Binary extends DensityFunction {
		private readonly rightRange: Interval
		constructor(
			public readonly type: typeof BinaryType[number],
			public readonly argument1: DensityFunction,
			public readonly argument2: DensityFunction,
		) {
			super()
			this.rightRange = argument2.range()
		}
		public compute(context: Context) {
			const a = this.argument1.compute(context)
			switch (this.type) {
				case 'add': return a + this.argument2.compute(context)
				case 'mul': return a === 0 ? 0 : a * this.argument2.compute(context)
				case 'min': return a < this.rightRange.min ? a : Math.min(a, this.argument2.compute(context))
				case 'max': return a > this.rightRange.max ? a : Math.max(a, this.argument2.compute(context))
			}
		}
		public mapChildren(visitor: Visitor) {
			return new Binary(this.type, visitor.apply(this.argument1), visitor.apply(this.argument2))
		}
		public range(): Interval {
			const left = this.argument1.range()
			const right = this.argument2.range()
			switch (this.type) {
				case 'add':
					return Interval.add(left, right)
				case 'mul':
					return Interval.mul(left, right)
				case 'min':
					return Interval.min(left, right)
				case 'max':
					return Interval.max(left, right)
			}
		}
		public trySimplify(): DensityFunction {
			if (this.type === 'mul' || this.type === 'add') {
				if (this.argument1 instanceof Constant) {
					return new MulOrAdd(this.type, this.argument2, this.argument1.value)
				}
				if (this.argument2 instanceof Constant) {
					return new MulOrAdd(this.type, this.argument1, this.argument2.value)
				}
			}
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
		public transform(context: Context, density: number) {
			switch (this.type) {
				case 'mul':
					return density * this.value
				case 'add':
					return density + this.value
			}
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return new MulOrAdd(this.type, visitor.apply(this.input), this.value)
		}
		public range(): Interval {
			switch (this.type) {
				case 'mul':
					return Interval.mul(this.input.range(), Interval.ofExact(this.value))
				case 'add':
					return Interval.add(this.input.range(), Interval.ofExact(this.value))
			}
		}
	}

	export class Spline extends DensityFunction {
		constructor(
			public readonly spline: CubicSpline<Context>,
		) {
			super()
		}
		public compute(context: Context) {
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
		public compute(context: Context) {
			return clampedMap(context.y, this.fromY, this.toY, this.fromValue, this.toValue)
		}
		public mapChildren(visitor: Visitor): DensityFunction {
			return this
		}
		public range() {
			return Interval.of(Math.min(this.fromValue, this.toValue), Math.max(this.fromValue, this.toValue))
		}
	}
}
