import { describe, expect, it } from 'vitest'
import { Holder } from '../../src/core/Holder.js'
import { Identifier } from '../../src/core/Identifier.js'
import { CubicSpline, NoiseParameters, XoroshiroRandom } from '../../src/math/index.js'
import type { NoiseSettings } from '../../src/worldgen/index.js'
import { DensityFunction as DF, NoiseRouter } from '../../src/worldgen/index.js'

describe('DensityFunction', () => {
	const ContextA = DF.context(1, 2, 3)
	const ContextB = DF.context(2, 3, 4)
	const ContextC = DF.context(12, -30, 1)

	const SHIFT = Holder.direct(NoiseParameters.create(-3, [1, 1, 1, 0]), Identifier.create('offset'))
	const EROSION = Holder.direct(NoiseParameters.create(-9, [1, 1, 0, 1, 1]), Identifier.create('erosion'))

	const wrap = (fn: DF) => {
		const random = XoroshiroRandom.create(BigInt(123)).forkPositional()
		const settings: NoiseSettings = {
			minY: -64,
			height: 384,
			xzSize: 1,
			ySize: 2,
		}
		const visitor = new NoiseRouter.Visitor(random, settings)
		return fn.mapAll(visitor)
	}

	it('Constant', () => {
		const fn: DF = new DF.Constant(5)
		expect(fn.compute(ContextA)).toEqual(5)
		expect(fn.compute(ContextB)).toEqual(5)
	})

	it('Noise', () => {
		const fn = wrap(new DF.Noise(1, 1, SHIFT))
		expect(fn.compute(ContextA)).toEqual(0.3004295819443726)
		expect(fn.compute(ContextB)).toEqual(0.3085235014681946)
		expect(fn.compute(ContextC)).toEqual(-0.43773259014323784)
	})

	it('WeirdScaledSampler', () => {
		const input = new DF.Noise(1, 1, SHIFT)
		const fn = wrap(new DF.WeirdScaledSampler(input, 'type_1', EROSION))
		expect(fn.compute(ContextA)).toEqual(0.05986336811047935)
		expect(fn.compute(ContextB)).toEqual(0.06476443600923233)
		expect(fn.compute(ContextC)).toEqual(0.022910520878785496)
	})

	it('Clamp', () => {
		const fn = wrap(new DF.Clamp(new DF.YClampedGradient(0, 128, 0, 128), 2, 5))
		expect(fn.compute(DF.context(0, 0, 0))).toEqual(2)
		expect(fn.compute(DF.context(0, 3, 0))).toEqual(3)
		expect(fn.compute(DF.context(0, 7, 0))).toEqual(5)
	})

	it('Abs', () => {
		const fn1 = wrap(new DF.Mapped('abs', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).toEqual(2)
		const fn2 = wrap(new DF.Mapped('abs', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).toEqual(3)
	})

	it('Square', () => {
		const fn1 = wrap(new DF.Mapped('square', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).toEqual(4)
		const fn2 = wrap(new DF.Mapped('square', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).toEqual(9)
	})

	it('Cube', () => {
		const fn1 = wrap(new DF.Mapped('cube', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).toEqual(8)
		const fn2 = wrap(new DF.Mapped('cube', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).toEqual(-27)
	})

	it('Half negative', () => {
		const fn1 = wrap(new DF.Mapped('half_negative', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).toEqual(2)
		const fn2 = wrap(new DF.Mapped('half_negative', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).toEqual(-1.5)
	})

	it('Quarter negative', () => {
		const fn1 = wrap(new DF.Mapped('quarter_negative', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).toEqual(2)
		const fn2 = wrap(new DF.Mapped('quarter_negative', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).toEqual(-0.75)
	})

	it('Squeeze', () => {
		const fn1 = wrap(new DF.Mapped('squeeze', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).toEqual(0.4583333333333333)
		const fn2 = wrap(new DF.Mapped('squeeze', new DF.Constant(0.5)))
		expect(fn2.compute(ContextA)).toEqual(0.24479166666666666)
		const fn3 = wrap(new DF.Mapped('squeeze', new DF.Constant(-0.7)))
		expect(fn3.compute(ContextA)).toEqual(-0.33570833333333333)
	})

	it('Add', () => {
		const fn1 = wrap(new DF.Ap2('add', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).toEqual(5)
		const fn2 = wrap(new DF.Ap2('add', new DF.Noise(16, 1, SHIFT), new DF.Constant(2)))
		expect(fn2.compute(ContextA)).toEqual(1.9594976210617139)
		expect(fn2.compute(ContextB)).toEqual(1.9887069396954864)
		expect(fn2.compute(ContextC)).toEqual(1.6672203651115742)
	})

	it('Mul', () => {
		const fn1 = wrap(new DF.Ap2('mul', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).toEqual(6)
		const fn2 = wrap(new DF.Ap2('mul', new DF.Noise(16, 1, SHIFT), new DF.Constant(20)))
		expect(fn2.compute(ContextA)).toEqual(-0.8100475787657212)
		expect(fn2.compute(ContextB)).toEqual(-0.2258612060902705)
		expect(fn2.compute(ContextC)).toEqual(-6.655592697768515)
		const fn3 = wrap(new DF.Ap2('mul', DF.Constant.ZERO, new DF.Constant(3)))
		expect(fn3.compute(ContextA)).toEqual(0)
	})

	it('Min', () => {
		const fn1 = wrap(new DF.Ap2('min', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).toEqual(2)
		const fn2 = wrap(new DF.Ap2('min', new DF.Noise(16, 1, SHIFT), new DF.Constant(-0.3)))
		expect(fn2.compute(ContextA)).toEqual(-0.3)
		expect(fn2.compute(ContextB)).toEqual(-0.3)
		expect(fn2.compute(ContextC)).toEqual(-0.33277963488842577)
	})

	it('Max', () => {
		const fn1 = wrap(new DF.Ap2('max', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).toEqual(3)
		const fn2 = wrap(new DF.Ap2('max', new DF.Noise(16, 1, SHIFT), new DF.Constant(-0.3)))
		expect(fn2.compute(ContextA)).toEqual(-0.04050237893828606)
		expect(fn2.compute(ContextB)).toEqual(-0.011293060304513524)
		expect(fn2.compute(ContextC)).toEqual(-0.3)
	})

	it('Spline', () => {
		const fn1 = wrap(new DF.Spline(new CubicSpline.Constant(0.8)))
		expect(fn1.compute(ContextA)).toEqual(0.8)
		const spline = new CubicSpline.MultiPoint(new DF.YClampedGradient(0, 128, 0, 128))
			.addPoint(0, 1)
			.addPoint(5, 0.2)
			.addPoint(20, 0.7)
		const fn2 = wrap(new DF.Spline(spline))
		expect(fn2.compute(DF.context(0, 0, 0))).toEqual(1)
		expect(fn2.compute(DF.context(0, 3.2, 0))).toEqual(0.4363904)
		expect(fn2.compute(DF.context(0, 5, 0))).toEqual(0.2)
		expect(fn2.compute(DF.context(0, 11, 0))).toEqual(0.376)
		expect(fn2.compute(DF.context(0, 20, 0))).toEqual(0.7)
		expect(fn2.compute(DF.context(0, 25, 0))).toEqual(0.7)
	})

	it('YClampedGradient', () => {
		const fn1 = wrap(new DF.YClampedGradient(0, 128, 0, 128))
		expect(fn1.compute(DF.context(0, -5, 0))).toEqual(0)
		expect(fn1.compute(DF.context(0, 0, 0))).toEqual(0)
		expect(fn1.compute(DF.context(0, 4, 0))).toEqual(4)
		expect(fn1.compute(DF.context(0, 127, 0))).toEqual(127)
		expect(fn1.compute(DF.context(0, 128, 0))).toEqual(128)
		expect(fn1.compute(DF.context(0, 129, 0))).toEqual(128)
		const fn2 = wrap(new DF.YClampedGradient(0, 128, -16, 0))
		expect(fn2.compute(DF.context(0, -200, 0))).toEqual(-16)
		expect(fn2.compute(DF.context(0, 0, 0))).toEqual(-16)
		expect(fn2.compute(DF.context(0, 5, 0))).toEqual(-15.375)
		expect(fn2.compute(DF.context(0, 64, 0))).toEqual(-8)
		expect(fn2.compute(DF.context(0, 128, 0))).toEqual(0)
		expect(fn2.compute(DF.context(0, 129, 0))).toEqual(0)
	})
})
