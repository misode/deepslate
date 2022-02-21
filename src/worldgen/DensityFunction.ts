import { TerrainShaper } from '.'
import type { BlockPos } from '../core'
import { Holder } from '../core'
import type { NormalNoise } from '../math'
import { BlendedNoise, clamp, clampedMap, CubicSpline, NoiseParameters, XoroshiroRandom } from '../math'
import { Json } from '../util'
import { NoiseSettings } from './NoiseSettings'
import { WorldgenRegistries } from './WorldgenRegistries'

export abstract class DensityFunction {
	public abstract compute(context: BlockPos): number

	public minValue(): number {
		return -this.maxValue()
	}

	public abstract maxValue(): number

	public fillArray(arr: number[], context: DensityFunction.ContextProvider): void {
		context.fillAllDirectly(arr, this)
	}

	public mapAll(visitor: DensityFunction.Visitor): DensityFunction {
		return visitor(this)
	}
}

export namespace DensityFunction {
	export type Visitor = (density: DensityFunction) => DensityFunction
	export type Context = BlockPos

	export interface ContextProvider {
		forIndex(i: number): Context
		fillAllDirectly(arr: number[], density: DensityFunction): DensityFunction
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

		public fillArray(arr: number[], context: ContextProvider): void {
			this.input.fillArray(arr, context)
			for (let i = 0; i < arr.length; i += 1) {
				arr[i] = this.transform(context.forIndex(i), arr[i])
			}
		}
	}

	const NoiseParser = Holder.parser(WorldgenRegistries.NOISE, NoiseParameters.fromJson)

	export function fromJson(obj: unknown): DensityFunction {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'blend_alpha': return Constant.ONE
			case 'blend_offset': return Constant.ZERO
			case 'beardifier': return Constant.ZERO
			case 'old_blended_noise': return new OldBlendedNoise()
			case 'interpolated':
			case 'flat_cache':
			case 'cache_2d':
			case 'cache_once':
			case 'cache_all_in_cell':
				return new Marker(Json.readEnum(type, MarkerType), fromJson(root.argument))
			case 'noise': return new Noise(
				Json.readNumber(root.xz_scale) ?? 1,
				Json.readNumber(root.y_scale) ?? 1,
				NoiseParser(root.noise),
			)
			case 'end_islands': return new EndIslands()
			case 'weird_scaled_sampler': return new WeirdScaledSampler(
				fromJson(root.input),
				Json.readEnum(root.rarity_value_mapper, RarityValueMapper),
				NoiseParser(root.noise),
			)
			case 'shifted_noise': return new ShiftedNoise(
				fromJson(root.shift_x),
				fromJson(root.shift_y),
				fromJson(root.shift_z),
				Json.readNumber(root.xz_scale) ?? 1,
				Json.readNumber(root.y_scale) ?? 1,
				NoiseParser(root.noise),
			)
			case 'range_choice': return new RangeChoice(
				fromJson(root.input),
				Json.readNumber(root.min_inclusive) ?? 0,
				Json.readNumber(root.max_exclusive) ?? 1,
				fromJson(root.when_in_range),
				fromJson(root.when_out_of_range),
			)
			case 'shift_a': return new ShiftA(NoiseParser(root.argument))
			case 'shift_b': return new ShiftB(NoiseParser(root.argument))
			case 'shift': return new Shift(NoiseParser(root.argument))
			case 'blend_density': return new BlendDensity(fromJson(root.input))
			case 'abs':
			case 'square':
			case 'cube':
			case 'half_negative':
			case 'quarter_negative':
			case 'squeeze':
				return new Mapped(type, fromJson(root.input))
			case 'slide': return new Slide(fromJson(root.input))
			case 'add':
			case 'mul':
			case 'min':
			case 'max': return new Ap2(
				Json.readEnum(type, Ap2Type),
				fromJson(root.argument1),
				fromJson(root.argument2),
			)
			case 'spline': return new Spline(
				CubicSpline.fromJson<Context>(root.spline, (obj) => DensityFunction.fromJson(obj)),
				Json.readNumber(root.min_value) ?? 0,
				Json.readNumber(root.max_value) ?? 1,
			)
			case 'terrain_shaper_spline': return new TerrainShaperSpline(
				fromJson(root.continentalness),
				fromJson(root.erosion),
				fromJson(root.weirdness),
				Json.readEnum(root.spline, SplineType),
				Json.readNumber(root.min_value) ?? 0,
				Json.readNumber(root.max_value) ?? 1,
			)
			case 'constant': return new Constant(Json.readNumber(root.argument) ?? 0)
			case 'y_clamped_gradient': return new YClampedGradient(
				Json.readInt(root.from_y) ?? -4064,
				Json.readInt(root.to_y) ?? 4062,
				Json.readNumber(root.from_y) ?? -4064,
				Json.readNumber(root.to_y) ?? 4062,
			)
		}
		return Constant.ZERO
	}

	class Constant extends DensityFunction {
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
		public fillArray(arr: number[]) {
			return arr.fill(this.value)
		}
	}

	class OldBlendedNoise extends DensityFunction {
		private readonly blendedNoise: BlendedNoise
		constructor() {
			super()
			this.blendedNoise = new BlendedNoise(XoroshiroRandom.create(BigInt(0)), { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 160 }, 4, 8)
		}
		public compute([x, y, z]: BlockPos) {
			return this.blendedNoise.sample(x, y, z)
		}
		public maxValue() {
			return this.blendedNoise.maxValue
		}
	}

	const MarkerType = ['interpolated', 'flat_cache', 'cache_2d', 'cache_once', 'cache_all_in_cell'] as const

	class Marker implements DensityFunction {
		constructor(
			public readonly type: typeof MarkerType[number],
			public readonly wrapped: DensityFunction,
		) {}
		public compute(context: Context) {
			return this.wrapped.compute(context)
		}
		public fillArray(arr: number[], context: ContextProvider) {
			this.wrapped.fillArray(arr, context)
		}
		public mapAll(visitor: Visitor) {
			return visitor(new Marker(this.type, this.wrapped.mapAll(visitor)))
		}
		public minValue() {
			return this.wrapped.minValue()
		}
		public maxValue() {
			return this.wrapped.maxValue()
		}
	}

	class Noise extends DensityFunction {
		constructor(
			protected readonly xzScale: number,
			protected readonly yScale: number,
			public readonly noiseData: Holder<NoiseParameters>,
			protected readonly noise?: NormalNoise,
		) {
			super()
		}
		public compute([x, y, z]: BlockPos) {
			return this.noise?.sample(x * this.xzScale, y * this.yScale, z * this.xzScale) ?? 0
		}
		public maxValue() {
			return this.noise?.maxValue ?? 2
		}
	}

	class EndIslands extends DensityFunction {
		public compute() {
			return 0 // TODO
		}
		public minValue() {
			return -0.84375
		}
		public maxValue() {
			return 0.5625
		}
	}

	const RarityValueMapper = ['type_1', 'type_2'] as const

	class WeirdScaledSampler extends Transformer {
		private static readonly ValueMapper: Record<typeof RarityValueMapper[number], [(value: number) => number, number]> = {
			type_1: [WeirdScaledSampler.rarityValueMapper1, 2],
			type_2: [WeirdScaledSampler.rarityValueMapper2, 3],
		}
		constructor(
			input: DensityFunction,
			private readonly rarityValueMapper: typeof RarityValueMapper[number],
			public readonly noiseData: Holder<NoiseParameters>,
			private readonly noise?: NormalNoise,
		) {
			super(input)
		}
		public transform([x, y, z]: Context, density: number) {
			if (!this.noise) {
				return 0
			}
			const rarity = WeirdScaledSampler.ValueMapper[this.rarityValueMapper][0](density)
			return rarity * Math.abs(this.noise.sample(x / rarity, y / rarity, z / rarity))
		}
		public mapAll(visitor: Visitor) {
			return visitor(new WeirdScaledSampler(this.input.mapAll(visitor), this.rarityValueMapper, this.noiseData, this.noise))
		}
		public minValue(): number {
			return 0
		}
		public maxValue(): number {
			return (this.noise ? this.noise.maxValue : 2) * WeirdScaledSampler.ValueMapper[this.rarityValueMapper][1]
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

	class ShiftedNoise extends Noise {
		constructor(
			private readonly shiftX: DensityFunction,
			private readonly shiftY: DensityFunction,
			private readonly shiftZ: DensityFunction,
			xzScale: number,
			yScale: number,
			noiseData: Holder<NoiseParameters>,
			noise?: NormalNoise
		) {
			super(xzScale, yScale, noiseData, noise)
		}
		public compute(context: BlockPos) {
			const xx = context[0] * this.xzScale + this.shiftX.compute(context)
			const yy = context[1] * this.yScale + this.shiftY.compute(context)
			const zz = context[2] * this.xzScale + this.shiftZ.compute(context)
			return this.noise?.sample(xx, yy, zz) ?? 0
		}
		public mapAll(visitor: Visitor) {
			return visitor(new ShiftedNoise(this.shiftX.mapAll(visitor), this.shiftY.mapAll(visitor), this.shiftZ.mapAll(visitor), this.xzScale, this.yScale, this.noiseData, this.noise))
		}
	}

	class RangeChoice extends DensityFunction {
		constructor(
			private readonly input: DensityFunction,
			private readonly minInclusive: number,
			private readonly maxExclusive: number,
			private readonly whenInRange: DensityFunction,
			private readonly whenOutOfRange: DensityFunction,
		) {
			super()
		}
		public compute(context: BlockPos) {
			const x = this.input.compute(context)
			return (this.minInclusive <= x && x < this.maxExclusive)
				? this.whenInRange.compute(context)
				: this.whenOutOfRange.compute(context)
		}
		public fillArray(arr: number[], context: ContextProvider) {
			this.input.fillArray(arr, context)
			for (let i = 0; i < arr.length; i += 1) {
				const x = arr[i]
				arr[i] = (this.minInclusive <= x && x < this.maxExclusive)
					? this.whenInRange.compute(context.forIndex(i))
					: this.whenOutOfRange.compute(context.forIndex(i))
			}
		}
		public mapAll(visitor: Visitor) {
			return visitor(new RangeChoice(this.input.mapAll(visitor), this.minInclusive, this.maxExclusive, this.whenInRange.mapAll(visitor), this.whenOutOfRange.mapAll(visitor)))
		}
		public minValue() {
			return Math.min(this.whenInRange.minValue(), this.whenOutOfRange.maxValue())
		}
		public maxValue() {
			return Math.max(this.whenInRange.maxValue(), this.whenOutOfRange.maxValue())
		}
	}

	abstract class ShiftNoise extends DensityFunction {
		constructor(
			public readonly noiseData: Holder<NoiseParameters>,
			protected readonly offsetNoise?: NormalNoise,
		) {
			super()
		}
		public compute([x, y, z]: BlockPos) {
			return this.offsetNoise?.sample(x * 0.25, y * 0.25, z * 0.25) ?? 0
		}
		public maxValue() {
			return (this.offsetNoise?.maxValue ?? 2) * 4 
		}
		public abstract withNewNoise(noise: NormalNoise): ShiftNoise
	}

	class ShiftA extends ShiftNoise {
		constructor(
			noiseData: Holder<NoiseParameters>,
			offsetNoise?: NormalNoise,
		) {
			super(noiseData, offsetNoise)
		}
		public compute([x, y, z]: BlockPos) {
			return super.compute([x, 0, z])
		}
		public withNewNoise(newNoise: NormalNoise) {
			return new ShiftA(this.noiseData, newNoise)
		}
	}

	class ShiftB extends ShiftNoise {
		constructor(
			noiseData: Holder<NoiseParameters>,
			offsetNoise?: NormalNoise,
		) {
			super(noiseData, offsetNoise)
		}
		public compute([x, y, z]: BlockPos) {
			return super.compute([z, x, 0])
		}
		public withNewNoise(newNoise: NormalNoise) {
			return new ShiftB(this.noiseData, newNoise)
		}
	}

	class Shift extends ShiftNoise {
		constructor(
			noiseData: Holder<NoiseParameters>,
			offsetNoise?: NormalNoise,
		) {
			super(noiseData, offsetNoise)
		}
		public withNewNoise(newNoise: NormalNoise) {
			return new ShiftB(this.noiseData, newNoise)
		}
	}

	class BlendDensity extends Transformer {
		constructor(
			input: DensityFunction,
		) {
			super(input)
		}
		public transform(context: BlockPos, density: number) {
			return density // blender not supported
		}
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor(new BlendDensity(this.input.mapAll(visitor)))
		}
		public minValue() {
			return -Infinity
		}
		public maxValue() {
			return Infinity
		}
	}

	class Clamp extends Transformer {
		constructor(
			input: DensityFunction,
			private readonly min: number,
			private readonly max: number,
		) {
			super(input)
		}
		public transform(context: BlockPos, density: number) {
			return clamp(density, this.min, this.max)
		}
		public minValue() {
			return this.min
		}
		public maxValue() {
			return this.max
		}
	}

	const MappedType = ['abs', 'square', 'cube', 'half_negative', 'quarter_negative', 'squeeze'] as const

	class Mapped extends Transformer {
		private static readonly MappedTypes: Record<typeof MappedType[number], (density: number) => number> = {
			abs: d => Math.abs(d),
			square: d => d * d,
			cube: d => d * d * d,
			half_negative: d => d > 0 ? d : d * 0.5,
			quarter_negative: d => d > 0 ? d : d * 0.25,
			squeeze: d => {
				const c = clamp(d, -1, 1)
				return c / 2 - c * c * c / 24
			},
		}
		private readonly transformer: (density: number) => number
		private readonly min: number
		private readonly max: number
		constructor(
			private readonly type: typeof MappedType[number],
			input: DensityFunction,
		) {
			super(input)
			this.transformer = Mapped.MappedTypes[this.type]
			const minInput = input.minValue()
			this.min = this.transformer(minInput)
			this.max = this.transformer(input.maxValue())
			if (type === 'abs' || type === 'square') {
				this.max = Math.max(this.min, this.max)
				this.min = Math.max(0, minInput)
			}
		}
		public transform(context: BlockPos, density: number) {
			return this.transformer(density)
		}
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor(new Mapped(this.type, this.input.mapAll(visitor)))
		}
		public minValue() {
			return this.min
		}
		public maxValue() {
			return this.max
		}
	}

	class Slide extends Transformer {
		constructor(
			input: DensityFunction,
			private readonly settings?: NoiseSettings,
		) {
			super(input)
		}
		public transform(context: BlockPos, density: number) {
			if (!this.settings) {
				return density
			}
			return NoiseSettings.applySlides(this.settings, density, context[1])
		}
		public mapAll(visitor: Visitor) {
			return visitor(new Slide(this.input.mapAll(visitor), this.settings))
		}
		public minValue(): number {
			if (!this.settings) {
				return this.input.minValue()
			}
			return Math.min(this.input.minValue(), this.settings.bottomSlide.target, this.settings.topSlide.target)
		}
		public maxValue(): number {
			if (!this.settings) {
				return this.input.maxValue()
			}
			return Math.max(this.input.maxValue(), this.settings.bottomSlide.target, this.settings.topSlide.target)
		}
	}

	const Ap2Type = ['add', 'mul', 'min', 'max'] as const

	class Ap2 extends DensityFunction {
		private readonly min: number
		private readonly max: number
		constructor(
			private readonly type: typeof Ap2Type[number],
			private readonly argument1: DensityFunction,
			private readonly argument2: DensityFunction,
		) {
			super()
			const min1 = argument1.minValue()
			const min2 = argument2.minValue()
			const max1 = argument1.maxValue()
			const max2 = argument2.maxValue()
			if ((type === 'min' || type === 'max') && (min1 >= max2 || min2 >= max1)) {
				console.warn(`Creating a ${type} function betweem two non-overlapping inputs`)
			}
			switch (this.type) {
				case 'add':
					this.min = min1 + min2
					this.max = max1 + max2
					break
				case 'mul':
					this.min = min1 > 0 && min2 > 0 ? min1 * min2
						: max1 < 0 && max2 < 0 ? max1 * max2
							: Math.min(min1 * max2, min2 * max1)
					this.max = min1 > 0 && min2 > 0 ? max1 * max2
						: max1 < 0 && max2 < 0 ? min1 * min2
							: Math.max(min1 * min2, max1 * max2)
					break
				case 'min':
					this.min = Math.min(min1, min2)
					this.max = Math.min(max1, max2)
					break
				case 'max':
					this.min = Math.max(min1, min2)
					this.max = Math.max(max1, max2)
					break
			}
		}
		public compute(context: BlockPos) {
			const a = this.argument1.compute(context)
			switch (this.type) {
				case 'add': return a + this.argument2.compute(context)
				case 'mul': return a === 0 ? 0 : a * this.argument2.compute(context)
				case 'min': return a < this.argument2.minValue() ? a : Math.min(a, this.argument2.compute(context))
				case 'max': return a > this.argument2.maxValue() ? a : Math.max(a, this.argument2.compute(context))
			}
		}
		public fillArray(arr: number[], context: ContextProvider) {
			this.argument1.fillArray(arr, context)
			switch (this.type) {
				case 'add':
					const arr2 = Array<number>(arr.length)
					this.argument2.fillArray(arr2, context)
					for (let i = 0; i < arr2.length; i += 1) {
						arr[i] += arr2[i]
					}
					break
				case 'mul':
					for (let i = 0; i < arr.length; i += 1) {
						const a = arr[i]
						arr[i] = a === 0 ? 0 : a * this.argument2.compute(context.forIndex(i))
					}
					break
				case 'min':
					const min = this.argument2.minValue()
					for (let i = 0; i < arr.length; i += 1) {
						const a = arr[i]
						arr[i] = a < min ? a : Math.min(a, this.argument2.compute(context.forIndex(i)))
					}
					break
				case 'max':
					const max = this.argument2.maxValue()
					for (let i = 0; i < arr.length; i += 1) {
						const a = arr[i]
						arr[i] = a > max ? a : Math.max(a, this.argument2.compute(context.forIndex(i)))
					}
					break
			}
		}
		public mapAll(visitor: Visitor) {
			return visitor(new Ap2(this.type, this.argument1.mapAll(visitor), this.argument2.mapAll(visitor)))
		}
		public minValue() {
			return this.min
		}
		public maxValue() {
			return this.max
		}
	}

	class Spline extends DensityFunction {
		constructor(
			private readonly spline: CubicSpline<Context>,
			private readonly min: number,
			private readonly max: number, 
		) {
			super()
		}
		public compute(context: BlockPos) {
			return clamp(this.spline.compute(context), this.min, this.max)
		}
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor(new Spline(this.spline.mapAll((fn) => {
				if (fn instanceof DensityFunction) {
					return fn.mapAll(visitor)
				}
				return fn
			}), this.min, this.max))
		}
		public minValue() {
			return this.min
		}
		public maxValue() {
			return this.max
		}
	}

	const SplineType = ['offset', 'factor', 'jaggedness'] as const

	class TerrainShaperSpline extends DensityFunction {
		constructor(
			private readonly continentalness: DensityFunction,
			private readonly erosion: DensityFunction,
			private readonly weirdness: DensityFunction,
			private readonly spline: typeof SplineType[number],
			private readonly min: number,
			private readonly max: number, 
			private readonly shaper?: TerrainShaper,
		) {
			super()
		}
		public compute(context: BlockPos) {
			if (!this.shaper) {
				return 0
			}
			const point = TerrainShaper.point(this.continentalness.compute(context), this.erosion.compute(context), this.weirdness.compute(context))
			return clamp(this.shaper[this.spline](point), this.min, this.max)
		}
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor(new TerrainShaperSpline(this.continentalness.mapAll(visitor), this.erosion.mapAll(visitor), this.weirdness.mapAll(visitor), this.spline, this.min, this.max, this.shaper))
		}
		public minValue() {
			return this.min
		}
		public maxValue() {
			return this.max
		}
	}

	class YClampedGradient extends DensityFunction {
		constructor(
			private readonly fromY: number,
			private readonly toY: number,
			private readonly fromValue: number,
			private readonly toValue: number,
		) {
			super()
		}
		public compute([x, y, z]: BlockPos) {
			return clampedMap(y, this.fromY, this.toY, this.fromValue, this.toValue)
		}
		public minValue() {
			return Math.min(this.fromValue, this.toValue)
		}
		public maxValue() {
			return Math.max(this.fromValue, this.toValue)
		}
	}
}
