import { Holder, Identifier } from '../core/index.js'
import type { BlendedNoise, MinMaxNumberFunction, NormalNoise } from '../math/index.js'
import { clamp, clampedMap, CubicSpline, lazyLerp3, LegacyRandom, NoiseParameters, SimplexNoise } from '../math/index.js'
import { computeIfAbsent, Json } from '../util/index.js'
import { WorldgenRegistries } from './WorldgenRegistries.js'

export abstract class DensityFunction implements MinMaxNumberFunction<DensityFunction.Context> {
	public abstract compute(context: DensityFunction.Context): number

	public minValue(): number {
		return -this.maxValue()
	}

	public abstract maxValue(): number

	public mapAll(visitor: DensityFunction.Visitor): DensityFunction {
		return visitor.map(this)
	}
}

export namespace DensityFunction {
	export interface Visitor {
		map: (density: DensityFunction) => DensityFunction
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
			case 'abs':
			case 'square':
			case 'cube':
			case 'half_negative':
			case 'invert':
			case 'quarter_negative':
			case 'squeeze':
				return new Mapped(type, inputParser(root.argument))
			case 'add':
			case 'mul':
			case 'min':
			case 'max': return new Ap2(
				Json.readEnum(type, Ap2Type),
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
		constructor(private readonly value: number) {
			super()
		}
		public compute() {
			return this.value
		}
		public minValue() {
			return this.value
		}
		public maxValue() {
			return this.value
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
		public minValue(): number {
			return this.holder.value().minValue()
		}
		public maxValue(): number {
			return this.holder.value().maxValue()
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

		public minValue() {
			return this.min
		}

		public maxValue() {
			return this.max
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
		public maxValue() {
			return this.blendedNoise?.maxValue ?? 0
		}
	}

	abstract class Wrapper extends DensityFunction {
		constructor(
			protected readonly wrapped: DensityFunction,
		) {
			super()
		}
		public minValue() {
			return this.wrapped.minValue()
		}
		public maxValue() {
			return this.wrapped.maxValue()
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new FlatCache(this.wrapped.mapAll(visitor)))
		}
	}

	export class CacheAllInCell extends Wrapper {
		constructor(wrapped: DensityFunction) {
			super(wrapped)
		}
		public compute(context: Context) {
			return this.wrapped.compute(context)
		}
		public mapAll(visitor: Visitor) {
			return visitor.map(new CacheAllInCell(this.wrapped.mapAll(visitor)))
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new Cache2D(this.wrapped.mapAll(visitor)))
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new CacheOnce(this.wrapped.mapAll(visitor)))
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new Interpolated(this.wrapped.mapAll(visitor)))
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
		public maxValue() {
			return this.noise?.maxValue ?? 2
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
		public minValue() {
			return -0.84375
		}
		public maxValue() {
			return 0.5625
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new FindTopSurface(this.density.mapAll(visitor), this.upperBound.mapAll(visitor), this.lowerBound, this.cellHeight))
		}
		public minValue() {
			return this.lowerBound
		}
		public maxValue() {
			return Math.max(this.lowerBound, this.upperBound.maxValue())
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new WeirdScaledSampler(this.input.mapAll(visitor), this.rarityValueMapper, this.noiseData, this.noise))
		}
		public minValue(): number {
			return 0
		}
		public maxValue(): number {
			return this.rarityValueMapper === 'type_1' ? 2 : 3
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new ShiftedNoise(this.shiftX.mapAll(visitor), this.shiftY.mapAll(visitor), this.shiftZ.mapAll(visitor), this.xzScale, this.yScale, this.noiseData, this.noise))
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
		public mapAll(visitor: Visitor) {
			return visitor.map(new RangeChoice(this.input.mapAll(visitor), this.minInclusive, this.maxExclusive, this.whenInRange.mapAll(visitor), this.whenOutOfRange.mapAll(visitor)))
		}
		public minValue() {
			return Math.min(this.whenInRange.minValue(), this.whenOutOfRange.minValue())
		}
		public maxValue() {
			return Math.max(this.whenInRange.maxValue(), this.whenOutOfRange.maxValue())
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
		public maxValue() {
			return (this.offsetNoise?.maxValue ?? 2) * 4 
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
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor.map(new BlendDensity(this.input.mapAll(visitor)))
		}
		public minValue() {
			return -Infinity
		}
		public maxValue() {
			return Infinity
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
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor.map(new Clamp(this.input.mapAll(visitor), this.min, this.max))
		}
		public minValue() {
			return this.min
		}
		public maxValue() {
			return this.max
		}
	}

	const MappedType = ['abs', 'square', 'cube', 'half_negative', 'invert', 'quarter_negative', 'squeeze'] as const

	export class Mapped extends Transformer {
		private static readonly MappedTypes: Record<typeof MappedType[number], (density: number) => number> = {
			abs: d => Math.abs(d),
			square: d => d * d,
			cube: d => d * d * d,
			half_negative: d => d > 0 ? d : d * 0.5,
			invert: d => 1/d,
			quarter_negative: d => d > 0 ? d : d * 0.25,
			squeeze: d => {
				const c = clamp(d, -1, 1)
				return c / 2 - c * c * c / 24
			},
		}
		private readonly transformer: (density: number) => number
		constructor(
			public readonly type: typeof MappedType[number],
			input: DensityFunction,
			private readonly min?: number,
			private readonly max?: number,
		) {
			super(input)
			this.transformer = Mapped.MappedTypes[this.type]
		}
		public transform(context: Context, density: number) {
			return this.transformer(density)
		}
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor.map(new Mapped(this.type, this.input.mapAll(visitor)))
		}
		public minValue() {
			return this.min ?? -Infinity
		}
		public maxValue() {
			return this.max ?? Infinity
		}
		public withMinMax() {
			const minInput = this.input.minValue()
			let min = this.transformer(minInput)
			let max = this.transformer(this.input.maxValue())
			if (this.type === 'invert') {
				if (min < 0 && max > 0) {
					[min, max] = [-Infinity, Infinity]
				} else {
					[min, max] = [max, min]
				}
			} else if (this.type === 'abs' || this.type === 'square') {
				max = Math.max(min, max)
				min = Math.max(0, minInput)
			}
			return new Mapped(this.type, this.input, min, max)
		}
	}

	const Ap2Type = ['add', 'mul', 'min', 'max'] as const

	export class Ap2 extends DensityFunction {
		constructor(
			public readonly type: typeof Ap2Type[number],
			public readonly argument1: DensityFunction,
			public readonly argument2: DensityFunction,
			private readonly min?: number,
			private readonly max?: number,
		) {
			super()
		}
		public compute(context: Context) {
			const a = this.argument1.compute(context)
			switch (this.type) {
				case 'add': return a + this.argument2.compute(context)
				case 'mul': return a === 0 ? 0 : a * this.argument2.compute(context)
				case 'min': return a < this.argument2.minValue() ? a : Math.min(a, this.argument2.compute(context))
				case 'max': return a > this.argument2.maxValue() ? a : Math.max(a, this.argument2.compute(context))
			}
		}
		public mapAll(visitor: Visitor) {
			return visitor.map(new Ap2(this.type, this.argument1.mapAll(visitor), this.argument2.mapAll(visitor)))
		}
		public minValue() {
			return this.min ?? -Infinity
		}
		public maxValue() {
			return this.max ?? Infinity
		}
		public withMinMax() {
			const min1 = this.argument1.minValue()
			const min2 = this.argument2.minValue()
			const max1 = this.argument1.maxValue()
			const max2 = this.argument2.maxValue()
			if ((this.type === 'min' || this.type === 'max') && (min1 >= max2 || min2 >= max1)) {
				console.warn(`Creating a ${this.type} function between two non-overlapping inputs`)
			}
			let min, max
			switch (this.type) {
				case 'add':
					min = min1 + min2
					max = max1 + max2
					break
				case 'mul':
					min = min1 > 0 && min2 > 0 ? (min1 * min2) || 0
						: max1 < 0 && max2 < 0 ? (max1 * max2) || 0
							: Math.min((min1 * max2) || 0, (min2 * max1) || 0)
					max = min1 > 0 && min2 > 0 ? (max1 * max2) || 0
						: max1 < 0 && max2 < 0 ? (min1 * min2) || 0
							: Math.max((min1 * min2) || 0, (max1 * max2) || 0)
					break
				case 'min':
					min = Math.min(min1, min2)
					max = Math.min(max1, max2)
					break
				case 'max':
					min = Math.max(min1, min2)
					max = Math.max(max1, max2)
					break
			}
			return new Ap2(this.type, this.argument1, this.argument2, min, max)
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
		public mapAll(visitor: Visitor): DensityFunction {
			const newCubicSpline = this.spline.mapAll((fn) => {
				if (fn instanceof DensityFunction) {
					return fn.mapAll(visitor)
				}
				return fn
			})
			newCubicSpline.calculateMinMax()
			return visitor.map(new Spline(newCubicSpline))
		}
		public minValue() {
			return this.spline.min()
		}
		public maxValue() {
			return this.spline.max()
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
		public minValue() {
			return Math.min(this.fromValue, this.toValue)
		}
		public maxValue() {
			return Math.max(this.fromValue, this.toValue)
		}
	}
}
