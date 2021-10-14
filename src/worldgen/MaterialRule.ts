import type { BlockState } from '../core'
import type { NoiseChunk } from './NoiseChunk'

export type MaterialRule = (chunk: NoiseChunk, x: number, y: number, z: number) => BlockState | null

export namespace MaterialRule {
	export function fromList(rules: MaterialRule[]): MaterialRule {
		return (chunk, x, y, z) => {
			for (const rule of rules) {
				const state = rule(chunk, x, y, z)
				if (state) return state
			}
			return null
		}
	}
}
