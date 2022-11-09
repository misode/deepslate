import { SplinePlot } from '@site/src/components/Plot'
import { CubicSpline } from 'deepslate'
import React from 'react'

export const WIDTH = 300
export const HEIGHT = 200

export  function SimpleExample() {
	return <SplinePlot name="Simple [0, 0] -> [1, 1]" width={WIDTH} height={HEIGHT} range={[0, 1]}
		spline={new CubicSpline.MultiPoint<number>({ compute: x => x }).addPoint(0, 0).addPoint(1, 1)}	
	/>
}

export function NestedExample() {
	return <SplinePlot name="Nested with different mapper" width={300} height={200} range={[0, 1]}
		spline={new CubicSpline.MultiPoint<number>({ compute: x => x })
			.addPoint(0, 0)
			.addPoint(0.4, new CubicSpline.MultiPoint<number>({ compute: x => 2 * x - x * x })
				.addPoint(0.2, -1)
				.addPoint(1, 1))}
	/>
}
