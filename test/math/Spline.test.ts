import { expect } from 'chai'
import { describe, it } from 'vitest'
import { CubicSpline } from '../../src/math/index.js'

describe('Spline', () => {
	const DELTA = 1e-7
	it('simple', () => {
		const spline = new CubicSpline.MultiPoint<number>({ compute: f => f })
			.addPoint(-1.1, 0.044)
			.addPoint(-1.02, -0.2222)
			.addPoint(-0.51, -0.2222)
			.addPoint(-0.44, -0.12)
			.addPoint(-0.18, -0.12)
		
		expect(spline.compute(-1.6)).equal(0.044)
		expect(spline.compute(-0.7)).equal(-0.2222)
		expect(spline.compute(-0.5)).closeTo(-0.21653879, DELTA)
		expect(spline.compute(-0.2)).equal(-0.12)
	})

	it('derivatives', () => {
		const spline = new CubicSpline.MultiPoint<number>({ compute: f => f })
			.addPoint(0.0, 0.0178, 0.2)
			.addPoint(0.3, 0.23, 0.7)
			.addPoint(0.46, 0.89, -0.03)
			.addPoint(0.6, 0.4, 0.0)
		
		expect(spline.compute(-0.1)).closeTo(-0.0022000019, DELTA)
		expect(spline.compute(0)).equal(0.0178)
		expect(spline.compute(0.31)).closeTo(0.24358201, DELTA)
		expect(spline.compute(0.4)).closeTo(0.69171876, DELTA)
	})

	it('nested', () => {
		const spline = new CubicSpline.MultiPoint<number>({ compute: f => f })
			.addPoint(0, 0.23)
			.addPoint(0.2, new CubicSpline.MultiPoint<number>({ compute: f => f * f })
				.addPoint(-0.1, 0)
				.addPoint(1.2, 0.4))
			.addPoint(0.7, 0.7)
		
		expect(spline.compute(0.3)).closeTo(0.09352946, DELTA)
	})
})
