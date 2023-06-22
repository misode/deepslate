import type { Random } from '../index.js'


export enum Rotation{
	NONE = 'none',
	CLOCKWISE_90 = 'clockwise_90',
	CLOCKWISE_180 = '180',
	COUNTERCLOCKWISE_90 = 'counterclockwise_90',
}

export namespace Rotation{
	export function getRandom(random: Random){
		return [Rotation.NONE, Rotation.CLOCKWISE_90, Rotation.CLOCKWISE_180, Rotation.COUNTERCLOCKWISE_90][random.nextInt(4)]
	}
}
