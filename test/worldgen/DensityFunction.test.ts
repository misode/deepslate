import { expect } from 'chai'
import { CubicSpline, XoroshiroRandom } from '../../src/math'
import type { NoiseSettings } from '../../src/worldgen'
import { DensityFunction as DF, NoiseRouter, Noises, TerrainShaper } from '../../src/worldgen'

describe('DensityFunction', () => {
	const ContextA = DF.context(1, 2, 3)
	const ContextB = DF.context(2, 3, 4)
	const ContextC = DF.context(12, -30, 1)

	const wrap = (fn: DF) => {
		const random = XoroshiroRandom.create(BigInt(123)).forkPositional()
		const settings: NoiseSettings = {
			minY: -64,
			height: 384,
			xzSize: 1,
			ySize: 2,
			sampling: { xzScale: 1, yScale: 1, xzFactor: 80, yFactor: 80 },
			topSlide: { target: -5, offset: 1, size: 2 },
			bottomSlide: { target: 10, offset: 0, size: 2 },
			terrainShaper: TerrainShaper.fromJson({ offset: 0, factor: 0, jaggedness: 0 }),
		}
		const visitor = NoiseRouter.createVisitor(random, settings)
		return fn.mapAll(visitor)
	}

	it('Constant', () => {
		const fn: DF = new DF.Constant(5)
		expect(fn.compute(ContextA)).equal(5)
		expect(fn.compute(ContextB)).equal(5)
	})

	it('Noise', () => {
		const fn = wrap(new DF.Noise(1, 1, Noises.SHIFT))
		expect(fn.compute(ContextA)).equal(0.3004295819443726)
		expect(fn.compute(ContextB)).equal(0.3085235014681946)
		expect(fn.compute(ContextC)).equal(-0.43773259014323784)
	})

	it('WeirdScaledSampler', () => {
		const input = new DF.Noise(1, 1, Noises.SHIFT)
		const fn = wrap(new DF.WeirdScaledSampler(input, 'type_1', Noises.EROSION))
		expect(fn.compute(ContextA)).equal(0.05986336811047935)
		expect(fn.compute(ContextB)).equal(0.06476443600923233)
		expect(fn.compute(ContextC)).equal(0.022910520878785496)
	})

	it('Clamp', () => {
		const fn = wrap(new DF.Clamp(new DF.YClampedGradient(0, 128, 0, 128), 2, 5))
		expect(fn.compute(DF.context(0, 0, 0))).equal(2)
		expect(fn.compute(DF.context(0, 3, 0))).equal(3)
		expect(fn.compute(DF.context(0, 7, 0))).equal(5)
	})

	it('Abs', () => {
		const fn1 = wrap(new DF.Mapped('abs', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).equal(2)
		const fn2 = wrap(new DF.Mapped('abs', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).equal(3)
	})

	it('Square', () => {
		const fn1 = wrap(new DF.Mapped('square', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).equal(4)
		const fn2 = wrap(new DF.Mapped('square', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).equal(9)
	})

	it('Cube', () => {
		const fn1 = wrap(new DF.Mapped('cube', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).equal(8)
		const fn2 = wrap(new DF.Mapped('cube', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).equal(-27)
	})

	it('Half negative', () => {
		const fn1 = wrap(new DF.Mapped('half_negative', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).equal(2)
		const fn2 = wrap(new DF.Mapped('half_negative', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).equal(-1.5)
	})

	it('Quarter negative', () => {
		const fn1 = wrap(new DF.Mapped('quarter_negative', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).equal(2)
		const fn2 = wrap(new DF.Mapped('quarter_negative', new DF.Constant(-3)))
		expect(fn2.compute(ContextA)).equal(-0.75)
	})

	it('Squeeze', () => {
		const fn1 = wrap(new DF.Mapped('squeeze', new DF.Constant(2)))
		expect(fn1.compute(ContextA)).equal(0.4583333333333333)
		const fn2 = wrap(new DF.Mapped('squeeze', new DF.Constant(0.5)))
		expect(fn2.compute(ContextA)).equal(0.24479166666666666)
		const fn3 = wrap(new DF.Mapped('squeeze', new DF.Constant(-0.7)))
		expect(fn3.compute(ContextA)).equal(-0.33570833333333333)
	})

	it('Add', () => {
		const fn1 = wrap(new DF.Ap2('add', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).equal(5)
		const fn2 = wrap(new DF.Ap2('add', new DF.Noise(16, 1, Noises.SHIFT), new DF.Constant(2)))
		expect(fn2.compute(ContextA)).equal(1.9594976210617139)
		expect(fn2.compute(ContextB)).equal(1.9887069396954864)
		expect(fn2.compute(ContextC)).equal(1.6672203651115742)
	})

	it('Mul', () => {
		const fn1 = wrap(new DF.Ap2('mul', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).equal(6)
		const fn2 = wrap(new DF.Ap2('mul', new DF.Noise(16, 1, Noises.SHIFT), new DF.Constant(20)))
		expect(fn2.compute(ContextA)).equal(-0.8100475787657212)
		expect(fn2.compute(ContextB)).equal(-0.2258612060902705)
		expect(fn2.compute(ContextC)).equal(-6.655592697768515)
		const fn3 = wrap(new DF.Ap2('mul', DF.Constant.ZERO, new DF.Constant(3)))
		expect(fn3.compute(ContextA)).equal(0)
	})

	it('Min', () => {
		const fn1 = wrap(new DF.Ap2('min', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).equal(2)
		const fn2 = wrap(new DF.Ap2('min', new DF.Noise(16, 1, Noises.SHIFT), new DF.Constant(-0.3)))
		expect(fn2.compute(ContextA)).equal(-0.3)
		expect(fn2.compute(ContextB)).equal(-0.3)
		expect(fn2.compute(ContextC)).equal(-0.33277963488842577)
	})

	it('Max', () => {
		const fn1 = wrap(new DF.Ap2('max', new DF.Constant(2), new DF.Constant(3)))
		expect(fn1.compute(ContextA)).equal(3)
		const fn2 = wrap(new DF.Ap2('max', new DF.Noise(16, 1, Noises.SHIFT), new DF.Constant(-0.3)))
		expect(fn2.compute(ContextA)).equal(-0.04050237893828606)
		expect(fn2.compute(ContextB)).equal(-0.011293060304513524)
		expect(fn2.compute(ContextC)).equal(-0.3)
	})

	it('Slide', () => {
		const fn = wrap(new DF.Slide(new DF.Constant(0.5)))
		expect(fn.compute(DF.context(0, 40, 0))).equal(0.5)
		expect(fn.compute(DF.context(0, -64, 0))).equal(10)
		expect(fn.compute(DF.context(0, 319, 0))).equal(-5)
		expect(fn.compute(DF.context(0, -55, 0))).equal(5.25)
		expect(fn.compute(DF.context(0, 305, 0))).equal(-2.25)
		expect(fn.compute(DF.context(0, 290, 0))).equal(0.5)
	})

	it('Spline', () => {
		const fn1 = wrap(new DF.Spline(new CubicSpline.Constant(0.8), -1, 1))
		expect(fn1.compute(ContextA)).equal(0.8)
		const spline = new CubicSpline.MultiPoint(new DF.YClampedGradient(0, 128, 0, 128))
			.addPoint(0, 1)
			.addPoint(5, 0.2)
			.addPoint(20, 0.7)
		const fn2 = wrap(new DF.Spline(spline, 0, 1))
		expect(fn2.compute(DF.context(0, 0, 0))).equal(1)
		expect(fn2.compute(DF.context(0, 3.2, 0))).equal(0.4363904)
		expect(fn2.compute(DF.context(0, 5, 0))).equal(0.2)
		expect(fn2.compute(DF.context(0, 11, 0))).equal(0.376)
		expect(fn2.compute(DF.context(0, 20, 0))).equal(0.7)
		expect(fn2.compute(DF.context(0, 25, 0))).equal(0.7)
	})

	it('YClampedGradient', () => {
		const fn1 = wrap(new DF.YClampedGradient(0, 128, 0, 128))
		expect(fn1.compute(DF.context(0, -5, 0))).equal(0)
		expect(fn1.compute(DF.context(0, 0, 0))).equal(0)
		expect(fn1.compute(DF.context(0, 4, 0))).equal(4)
		expect(fn1.compute(DF.context(0, 127, 0))).equal(127)
		expect(fn1.compute(DF.context(0, 128, 0))).equal(128)
		expect(fn1.compute(DF.context(0, 129, 0))).equal(128)
		const fn2 = wrap(new DF.YClampedGradient(0, 128, -16, 0))
		expect(fn2.compute(DF.context(0, -200, 0))).equal(-16)
		expect(fn2.compute(DF.context(0, 0, 0))).equal(-16)
		expect(fn2.compute(DF.context(0, 5, 0))).equal(-15.375)
		expect(fn2.compute(DF.context(0, 64, 0))).equal(-8)
		expect(fn2.compute(DF.context(0, 128, 0))).equal(0)
		expect(fn2.compute(DF.context(0, 129, 0))).equal(0)
	})
})
