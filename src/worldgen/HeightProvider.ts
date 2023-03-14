import type { Random } from '../math/index.js'
import { nextInt, randomBetweenInclusive } from '../math/index.js'
import { Json } from '../util/index.js'
import type { NoiseSettings } from './NoiseSettings.js'
import { VerticalAnchor } from './VerticalAnchor.js'

export type HeightProvider = (random: Random, context: NoiseSettings) => number

export namespace HeightProvider {

	export function fromJson(obj: unknown): HeightProvider {
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')

		switch (type) {
			case undefined: return constant(VerticalAnchor.fromJson(obj))
			case 'constant': return constant(VerticalAnchor.fromJson(root.value))
			case 'uniform': return uniform(VerticalAnchor.fromJson(root.min_inclusive), VerticalAnchor.fromJson(root.max_inclusive))
			case 'biased_to_bottom': return biased_to_bottom(VerticalAnchor.fromJson(root.min_inclusive), VerticalAnchor.fromJson(root.max_inclusive), Json.readInt(root.inner))
			case 'very_biased_to_bottom': return very_biased_to_bottom(VerticalAnchor.fromJson(root.min_inclusive), VerticalAnchor.fromJson(root.max_inclusive), Json.readInt(root.inner))
			case 'trapezoid': return trapezoid(VerticalAnchor.fromJson(root.min_inclusive), VerticalAnchor.fromJson(root.max_inclusive), Json.readInt(root.plateau))
			case 'weighted_list':
				return weighted_list(Json.readArray(root.distribution, (obj) => {
					const entry = Json.readObject(obj) ?? {}
					return { weight: Json.readInt(entry.weight) ?? 1, data: fromJson(entry.data) }
				}) ?? [])
		}
		return () => 0
	}

	export function constant(anchor: VerticalAnchor): HeightProvider {
		return (_, context) => anchor(context)
	}

	export function uniform(minInclusive: VerticalAnchor, maxInclusive: VerticalAnchor): HeightProvider {
		return (random, context) => {
			const minY = minInclusive(context)
			const maxY = maxInclusive(context)
			if (minY > maxY) {
				return minY
			} else {
				return random.nextInt(maxY - minY + 1) + minY
			}
		}
	}


	export function biased_to_bottom(minInclusive: VerticalAnchor, maxInclusive: VerticalAnchor, inner: number = 1): HeightProvider {
		return (random, context) => {
			const minY = minInclusive(context)
			const maxY = maxInclusive(context)
			if (maxY - minY - inner + 1 <= 0) {
				return minY
			} else {
				const r = random.nextInt(maxY - minY - inner + 1)
				return random.nextInt(r + inner) + minY
			}
		}
	}

	export function very_biased_to_bottom(minInclusive: VerticalAnchor, maxInclusive: VerticalAnchor, inner: number = 1): HeightProvider {
		return (random, context) => {
			const minY = minInclusive(context)
			const maxY = maxInclusive(context)
			if (maxY - minY - inner + 1 <= 0) {
				return minY
			} else {
				const r1 = nextInt(random, minY + inner, maxY)
				const r2 = nextInt(random, minY, r1 - 1)
				return nextInt(random, minY, r2 - 1 + inner)
			}
		}
	}

	export function trapezoid(minInclusive: VerticalAnchor, maxInclusive: VerticalAnchor, plateau: number = 0): HeightProvider {
		return (random, context) => {
			const minY = minInclusive(context)
			const maxY = maxInclusive(context)
			if (minY > maxY) {
				return minY
			} else {
				const range = maxY - minY
				if (plateau >= range) {
					return randomBetweenInclusive(random, minY, maxY)
				} else {
					const slope = (range - plateau) / 2
					const r = range - slope
					return minY + randomBetweenInclusive(random, 0, r) + randomBetweenInclusive(random, 0, slope)
				}
			}
		}
	}

	export function weighted_list(distribution: { weight: number, data: HeightProvider }[]): HeightProvider {
		const totalWeight = distribution.reduce((sum, e, i) => sum + e.weight, 0)

		return (random, context) => {
			let r = random.nextInt(totalWeight)

			for (const e of distribution) {
				r -= e.weight
				if (r <= 0) {
					return e.data(random, context)
				}
			}

			return 0
		}
	}

}

