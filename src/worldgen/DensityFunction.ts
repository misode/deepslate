import { Holder, Identifier } from '../core'
import type { NormalNoise } from '../math'
import { BlendedNoise, clamp, clampedMap, CubicSpline, lerp3, NoiseParameters, XoroshiroRandom } from '../math'
import { Json } from '../util'
import { TerrainShaper } from './biome/TerrainShaper'
import { NoiseSettings } from './NoiseSettings'
import { WorldgenRegistries } from './WorldgenRegistries'

export abstract class DensityFunction {
	public abstract compute(context: DensityFunction.Context): number

	public minValue(): number {
		return -this.maxValue()
	}

	public abstract maxValue(): number

	public mapAll(visitor: DensityFunction.Visitor): DensityFunction {
		return visitor(this)
	}
}

export namespace DensityFunction {
	export type Visitor = (density: DensityFunction) => DensityFunction

	export interface Context {
		x(): number
		y(): number
		z(): number
		cellWidth: number
		cellHeight: number
	}

	export namespace Context {
		export function create(x: number, y: number, z: number, cellWidth: number, cellHeight: number) {
			return {
				x() { return x },
				y() { return y },
				z() { return z },
				cellWidth,
				cellHeight,
			}
		}

		export function at(context: Context, x: number, y: number, z: number) {
			return create(x, y, z, context.cellWidth, context.cellWidth)
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

	export function fromJson(obj: unknown): DensityFunction {
		if (typeof obj === 'string') {
			return new HolderHolder(Holder.reference(WorldgenRegistries.DENSITY_FUNCTION, Identifier.parse(obj)))
		}
		if (typeof obj === 'number') {
			return new Constant(obj)
		}
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'blend_alpha': return Constant.ONE
			case 'blend_offset': return Constant.ZERO
			case 'beardifier': return Constant.ZERO
			case 'old_blended_noise': return new OldBlendedNoise()
			case 'flat_cache': return new FlatCache(fromJson(root.argument))
			case 'interpolated': return new Interpolated(fromJson(root.argument))
			case 'cache_2d': return new Cache2D(fromJson(root.argument))
			case 'cache_once': return new CacheOnce(fromJson(root.argument))
			case 'cache_all_in_cell': return new CacheAllInCell(fromJson(root.argument))
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
			case 'blend_density': return new BlendDensity(fromJson(root.argument))
			case 'clamp': return new Clamp(
				fromJson(root.input),
				Json.readNumber(root.min) ?? 0,
				Json.readNumber(root.max) ?? 1,
			)
			case 'abs':
			case 'square':
			case 'cube':
			case 'half_negative':
			case 'quarter_negative':
			case 'squeeze':
				return new Mapped(type, fromJson(root.argument))
			case 'slide': return new Slide(fromJson(root.argument))
			case 'add':
			case 'mul':
			case 'min':
			case 'max': return new Ap2(
				Json.readEnum(type, Ap2Type),
				fromJson(root.argument1),
				fromJson(root.argument2),
			)
			case 'spline': return new Spline(
				CubicSpline.fromJson(root.spline, (obj) => DensityFunction.fromJson(obj)),
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
		public mapAll(visitor: Visitor): DensityFunction {
			return visitor(new HolderHolder(Holder.direct(this.holder.value().mapAll(visitor))))
		}
		public minValue(): number {
			return this.holder.value().minValue()
		}
		public maxValue(): number {
			return this.holder.value().maxValue()
		}
	}

	export class OldBlendedNoise extends DensityFunction {
		private readonly blendedNoise: BlendedNoise
		constructor(blendedNoise?: BlendedNoise) {
			super()
			this.blendedNoise = blendedNoise ?? new BlendedNoise(XoroshiroRandom.create(BigInt(0)), { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 160 }, 4, 8)
		}
		public compute(context: Context) {
			return this.blendedNoise.sample(context.x(), context.y(), context.z())
		}
		public maxValue() {
			return this.blendedNoise.maxValue
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
			const quartX = context.x() >> 2
			const quartZ = context.z() >> 2
			if (this.lastQuartX !== quartX || this.lastQuartZ !== quartZ) {
				this.lastValue = this.wrapped.compute(Context.at(context, quartX << 2, 0, quartZ << 2))
				this.lastQuartX = quartX
				this.lastQuartZ = quartZ
			}
			return this.lastValue
		}
		public mapAll(visitor: Visitor) {
			return new FlatCache(this.wrapped.mapAll(visitor))
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
			return new CacheAllInCell(this.wrapped.mapAll(visitor))
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
			const blockX = context.x()
			const blockZ = context.z()
			if (this.lastBlockX !== blockX || this.lastBlockZ !== blockZ) {
				this.lastValue = this.wrapped.compute(context)
				this.lastBlockX = blockX
				this.lastBlockZ = blockZ
			}
			return this.lastValue
		}
		public mapAll(visitor: Visitor) {
			return new Cache2D(this.wrapped.mapAll(visitor))
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
			const blockX = context.x()
			const blockY = context.y()
			const blockZ = context.z()
			if (this.lastBlockX !== blockX || this.lastBlockY !== blockY || this.lastBlockZ !== blockZ) {
				this.lastValue = this.wrapped.compute(context)
				this.lastBlockX = blockX
				this.lastBlockY = blockY
				this.lastBlockZ = blockZ
			}
			return this.lastValue
		}
		public mapAll(visitor: Visitor) {
			return new CacheOnce(this.wrapped.mapAll(visitor))
		}
	}

	export class Interpolated extends Wrapper {
		constructor(wrapped: DensityFunction) {
			super(wrapped)
		}
		public compute(context: DensityFunction.Context) {
			// TODO: optimize by caching
			const blockX = context.x()
			const blockY = context.y()
			const blockZ = context.z()
			const w = context.cellWidth
			const h = context.cellHeight
			const x = (blockX % w) / w
			const y = (blockY % h) / h
			const z = (blockZ % w) / w
			const firstX = Math.floor(blockX / w) * w
			const firstY = Math.floor(blockY / h) * h
			const firstZ = Math.floor(blockZ / w) * w
			const noise000 = this.wrapped.compute(Context.at(context, firstX, firstY, firstZ))
			const noise001 = this.wrapped.compute(Context.at(context, firstX, firstY, firstZ + w))
			const noise010 = this.wrapped.compute(Context.at(context, firstX, firstY + h, firstZ))
			const noise011 = this.wrapped.compute(Context.at(context, firstX, firstY + h, firstZ + w))
			const noise100 = this.wrapped.compute(Context.at(context, firstX + w, firstY, firstZ))
			const noise101 = this.wrapped.compute(Context.at(context, firstX + w, firstY, firstZ + w))
			const noise110 = this.wrapped.compute(Context.at(context, firstX + w, firstY + h, firstZ))
			const noise111 = this.wrapped.compute(Context.at(context, firstX + w, firstY + h, firstZ + w))
			return lerp3(x, y, z, noise000, noise100, noise010, noise110, noise001, noise101, noise011, noise111)
		}
		public mapAll(visitor: Visitor) {
			return new Interpolated(this.wrapped.mapAll(visitor))
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
			return this.noise?.sample(context.x() * this.xzScale, context.y() * this.yScale, context.z() * this.xzScale) ?? 0
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
			return rarity * Math.abs(this.noise.sample(context.x() / rarity, context.y() / rarity, context.z() / rarity))
		}
		public mapAll(visitor: Visitor) {
			return visitor(new WeirdScaledSampler(this.input.mapAll(visitor), this.rarityValueMapper, this.noiseData, this.noise))
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
			const xx = context.x() * this.xzScale + this.shiftX.compute(context)
			const yy = context.y() * this.yScale + this.shiftY.compute(context)
			const zz = context.z() * this.xzScale + this.shiftZ.compute(context)
			return this.noise?.sample(xx, yy, zz) ?? 0
		}
		public mapAll(visitor: Visitor) {
			return visitor(new ShiftedNoise(this.shiftX.mapAll(visitor), this.shiftY.mapAll(visitor), this.shiftZ.mapAll(visitor), this.xzScale, this.yScale, this.noiseData, this.noise))
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
			return visitor(new RangeChoice(this.input.mapAll(visitor), this.minInclusive, this.maxExclusive, this.whenInRange.mapAll(visitor), this.whenOutOfRange.mapAll(visitor)))
		}
		public minValue() {
			return Math.min(this.whenInRange.minValue(), this.whenOutOfRange.maxValue())
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
			return this.offsetNoise?.sample(context.x() * 0.25, context.y() * 0.25, context.z() * 0.25) ?? 0
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
			return super.compute(DensityFunction.Context.at(context, context.x(), 0, context.z()))
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
			return super.compute(DensityFunction.Context.at(context, context.z(), context.x(), 0))
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
			return new ShiftB(this.noiseData, newNoise)
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
			return visitor(new BlendDensity(this.input.mapAll(visitor)))
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
		public minValue() {
			return this.min
		}
		public maxValue() {
			return this.max
		}
	}

	const MappedType = ['abs', 'square', 'cube', 'half_negative', 'quarter_negative', 'squeeze'] as const

	export class Mapped extends Transformer {
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
		constructor(
			private readonly type: typeof MappedType[number],
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
			return visitor(new Mapped(this.type, this.input.mapAll(visitor)))
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
			if (this.type === 'abs' || this.type === 'square') {
				max = Math.max(min, max)
				min = Math.max(0, minInput)
			}
			return new Mapped(this.type, this.input, min, max)
		}
	}

	export class Slide extends Transformer {
		constructor(
			input: DensityFunction,
			public readonly settings?: NoiseSettings,
		) {
			super(input)
		}
		public transform(context: Context, density: number) {
			if (!this.settings) {
				return density
			}
			return NoiseSettings.applySlides(this.settings, density, context.y())
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
			return visitor(new Ap2(this.type, this.argument1.mapAll(visitor), this.argument2.mapAll(visitor)))
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
					min = min1 > 0 && min2 > 0 ? min1 * min2
						: max1 < 0 && max2 < 0 ? max1 * max2
							: Math.min(min1 * max2, min2 * max1)
					max = min1 > 0 && min2 > 0 ? max1 * max2
						: max1 < 0 && max2 < 0 ? min1 * min2
							: Math.max(min1 * min2, max1 * max2)
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
			public readonly min: number,
			public readonly max: number, 
		) {
			super()
		}
		public compute(context: Context) {
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

	export class TerrainShaperSpline extends DensityFunction {
		constructor(
			public readonly continentalness: DensityFunction,
			public readonly erosion: DensityFunction,
			public readonly weirdness: DensityFunction,
			public readonly spline: typeof SplineType[number],
			public readonly min: number,
			public readonly max: number, 
			public readonly shaper?: TerrainShaper,
		) {
			super()
		}
		public compute(context: Context) {
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
			return clampedMap(context.y(), this.fromY, this.toY, this.fromValue, this.toValue)
		}
		public minValue() {
			return Math.min(this.fromValue, this.toValue)
		}
		public maxValue() {
			return Math.max(this.fromValue, this.toValue)
		}
	}
}
