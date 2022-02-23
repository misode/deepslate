import { square } from '../../math'
import { Json } from '../../util'
import { DensityFunction } from '../DensityFunction'

export namespace Climate {
	const PARAMETER_SPACE = 7

	export function target(temperature: number, humidity: number, continentalness: number, erosion: number, depth: number, weirdness: number) {
		return new TargetPoint(temperature, humidity, continentalness, erosion, depth, weirdness)
	}

	export function parameters(temperature: number | Param, humidity: number | Param, continentalness: number | Param, erosion: number | Param, depth: number | Param, weirdness: number | Param, offset: number) {
		return new ParamPoint(param(temperature), param(humidity), param(continentalness), param(erosion), param(depth), param(weirdness), offset)
	}

	export function param(value: number | Param, max?: number) {
		if (typeof value === 'number') {
			return new Param(value, max ?? value)
		}
		return value
	}

	export class Param {
		constructor(
			public readonly min: number,
			public readonly max: number,
		) {}

		public distance(param: Param | number) {
			const diffMax = (typeof param === 'number' ? param : param.min) - this.max
			const diffMin = this.min - (typeof param === 'number' ? param : param.max)
			if (diffMax > 0) {
				return diffMax
			}
			return Math.max(diffMin, 0)
		}

		public union(param: Param) {
			return new Param(
				Math.min(this.min, param.min),
				Math.max(this.max, param.max)
			)
		}

		public static fromJson(obj: unknown) {
			if (typeof obj === 'number') return new Param(obj, obj)
			const [min, max] = Json.readArray(obj, e => Json.readNumber(e)) ?? []
			return new Param(min ?? 0, max ?? 0)
		}
	}

	export class ParamPoint {
		constructor(
			public readonly temperature: Param,
			public readonly humidity: Param,
			public readonly continentalness: Param,
			public readonly erosion: Param,
			public readonly depth: Param,
			public readonly weirdness: Param,
			public readonly offset: number,
		) {}

		public fittness(point: ParamPoint | TargetPoint) {
			return square(this.temperature.distance(point.temperature))
				+ square(this.humidity.distance(point.humidity))
				+ square(this.continentalness.distance(point.continentalness))
				+ square(this.erosion.distance(point.erosion))
				+ square(this.depth.distance(point.depth))
				+ square(this.weirdness.distance(point.weirdness))
				+ square(this.offset - point.offset)
		}

		public space() {
			return [this.temperature, this.humidity, this.continentalness, this.erosion, this.depth, this.weirdness, new Param(this.offset, this.offset)]
		}

		public static fromJson(obj: unknown) {
			const root = Json.readObject(obj) ?? {}
			return new ParamPoint(
				Param.fromJson(root.temperature),
				Param.fromJson(root.humidity),
				Param.fromJson(root.continentalness),
				Param.fromJson(root.erosion),
				Param.fromJson(root.depth),
				Param.fromJson(root.weirdness),
				Json.readInt(root.offset) ?? 0,
			)
		}
	}

	export class TargetPoint {
		constructor(
			public readonly temperature: number,
			public readonly humidity: number,
			public readonly continentalness: number,
			public readonly erosion: number,
			public readonly depth: number,
			public readonly weirdness: number,
		) {}

		get offset() {
			return 0
		}

		public toArray() {
			return [this.temperature, this.humidity, this.continentalness, this.erosion, this.depth, this.weirdness, this.offset]
		}
	}

	export class Parameters<T> {
		private readonly index: RTree<T>

		constructor(public readonly things: [ParamPoint, () => T][]) {
			this.index = new RTree(things)
		}

		public find(target: TargetPoint) {
			return this.index.search(target, (node, values) => node.distance(values))
		}
	}

	export class Sampler {
		constructor(
			private readonly temperature: DensityFunction,
			private readonly humidity: DensityFunction,
			private readonly continentalness: DensityFunction,
			private readonly erosion: DensityFunction,
			private readonly depth: DensityFunction,
			private readonly weirdness: DensityFunction,
		) {}

		sample(x: number, y: number, z: number) {
			const context = DensityFunction.context(x << 2, y << 2, z << 2)
			return Climate.target(this.temperature.compute(context), this.humidity.compute(context), this.continentalness.compute(context), this.erosion.compute(context), this.depth.compute(context), this.weirdness.compute(context))
		}
	}

	type DistanceMetric<T> = (node: RNode<T>, values: number[]) => number

	export class RTree<T> {
		public static readonly CHILDREN_PER_NODE = 10
		private readonly root: RNode<T>

		constructor(points: [ParamPoint, () => T][]) {
			this.root = RTree.build(points.map(([point, thing]) => new RLeaf(point, thing)))
		}

		private static build<T>(nodes: RNode<T>[]): RNode<T> {
			if (nodes.length === 1) {
				return nodes[0]
			}
			if (nodes.length <= RTree.CHILDREN_PER_NODE) {
				const sortedNodes = nodes
					.map(node => {
						let key = 0.0
						for (let i = 0; i < PARAMETER_SPACE; i += 1) {
							const param = node.space[i]
							key += Math.abs((param.min + param.max) / 2.0)
						}
						return { key, node }
					})
					.sort((a, b) => a.key - b.key)
					.map(({ node }) => node)
				return new RSubTree(sortedNodes)
			}
			let f = Infinity
			let n3 = -1
			let result: RSubTree<T>[] = []
			for (let n2 = 0; n2 < PARAMETER_SPACE; ++n2) {
				nodes = RTree.sort(nodes, n2, false)
				result = RTree.bucketize(nodes)
				let f2 = 0.0
				for (const subTree2 of result) {
					f2 += RTree.area(subTree2.space)
				}
				if (!(f > f2)) continue
				f = f2
				n3 = n2
			}
			nodes = RTree.sort(nodes, n3, false)
			result = RTree.bucketize(nodes)
			result = RTree.sort(result, n3, true)
			return new RSubTree(result.map(subTree => RTree.build(subTree.children)))
		}
		
		private static sort<N extends RNode<unknown>>(nodes: N[], i: number, abs: boolean) {
			return nodes
				.map(node => {
					const param = node.space[i]
					const f = (param.min + param.max) / 2
					const key = abs ? Math.abs(f) : f
					return { key, node }
				})
				.sort((a, b) => a.key - b.key)
				.map(({ node }) => node)
		}

		private static bucketize<T>(nodes: RNode<T>[]) {
			const arrayList: RSubTree<T>[] = []
			let arrayList2: RNode<T>[] = []
			const n = Math.pow(10.0, Math.floor(Math.log(nodes.length - 0.01) / Math.log(10.0)))
			for (const node of nodes) {
				arrayList2.push(node)
				if (arrayList2.length < n) continue
				arrayList.push(new RSubTree(arrayList2))
				arrayList2 = []
			}
			if (arrayList2.length !== 0) {
				arrayList.push(new RSubTree(arrayList2))
			}
			return arrayList
		}

		private static area(params: Param[]) {
			let f = 0.0
			for (const param of params) {
				f += Math.abs(param.max - param.min)
			}
			return f
		}

		public search(target: TargetPoint, distance: DistanceMetric<T>) {
			const leaf = this.root.search(target.toArray(), distance)
			return leaf.thing()
		}
	}

	export abstract class RNode<T> {
		constructor(public readonly space: Param[]) {}

		public abstract search(values: number[], distance: DistanceMetric<T>): RLeaf<T>

		public distance(values: number[]) {
			let result = 0
			for (let i = 0; i < PARAMETER_SPACE; i += 1) {
				result += square(this.space[i].distance(values[i]))
			}
			return result
		}
	}

	export class RSubTree<T> extends RNode<T> {
		constructor(public readonly children: RNode<T>[]) {
			super(RSubTree.buildSpace(children))
		}

		private static buildSpace<T>(nodes: RNode<T>[]): Param[] {
			let space = [...Array(PARAMETER_SPACE)].map(() => new Param(Infinity, -Infinity))
			for (const node of nodes) {
				space = [...Array(PARAMETER_SPACE)].map((_, i) => space[i].union(node.space[i]))
			}
			return space
		}

		search(values: number[], distance: DistanceMetric<T>): RLeaf<T> {
			let dist = Infinity
			let leaf: RLeaf<T> | null = null
			for (const node of this.children) {
				const d1 = distance(node, values)
				if (dist <= d1) continue
				const leaf2 = node.search(values, distance)
				const d2 = node == leaf2 ? d1 : distance(leaf2, values)
				if (dist <= d2) continue
				dist = d2
				leaf = leaf2
			}
			return leaf!
		}
	}

	export class RLeaf<T> extends RNode<T> {
		constructor(point: ParamPoint, public readonly thing: () => T) {
			super(point.space())
		}

		search() {
			return this
		}
	}
}
