import { expect } from 'chai'
import { Climate } from '../@worldgen'

describe('Climate', () => {
	describe('RTree', () => {
		it('build', () => {
			const points: [Climate.ParamPoint, () => string][] = [
				[Climate.parameters(0, 0, 0, 0, 0, 0, 0), () => 'red'],
				[Climate.parameters(1, 0, 0, 0.8, 0, 0, 0), () => 'green'],
				[Climate.parameters(1, 0, 0.6, -0.8, -0.1, 0, 0), () => 'blue'],
			]
			const tree = new Climate.RTree(points)
			
			expect(tree['root']).instanceof(Climate.RSubTree)
			expect((tree['root'] as Climate.RSubTree<string>).children).lengthOf(3)
			expect(tree['root'].space).deep.equal([
				new Climate.Param(0, 1),
				new Climate.Param(0, 0),
				new Climate.Param(0, 0.6),
				new Climate.Param(-0.8, 0.8),
				new Climate.Param(-0.1, 0),
				new Climate.Param(0, 0),
				new Climate.Param(0, 0),
			])
		})
		it('search', () => {
			const points: [Climate.ParamPoint, () => string][] = [
				[Climate.parameters(0, 0, 0, 0, 0, 0, 0), () => 'red'],
				[Climate.parameters(1, 0, 0, 0.8, 0, 0, 0), () => 'green'],
				[Climate.parameters(1, 0, 0.6, -0.8, -0.1, 0, 0), () => 'blue'],
			]
			const tree = new Climate.RTree(points)
			const distance = (node: Climate.RNode<string>, values: number[]) => node.distance(values)

			expect(tree.search(Climate.target(0, 0, 0, 0, 0, 0), distance)).equal('red')
			expect(tree.search(Climate.target(2, 0, 0, 0, 0, 0), distance)).equal('green')
			expect(tree.search(Climate.target(0.2, 0, 0.7, -0.5, 0, 0), distance)).equal('blue')
		})
		it('search (complex)', () => {
			const points: [Climate.ParamPoint, () => string][] = [
				[Climate.parameters(0, 0, 0, 0, 0, 0, 0), () => 'red'],
				[Climate.parameters(1, 0, 0, 0.8, 0, 0, 0), () => 'green'],
				[Climate.parameters(1, 0, 0.6, -0.8, -0.1, 0, 0), () => 'blue'],
				[Climate.parameters(0, 0, 0, 0, 0, 0, 0), () => 'blue'],
				[Climate.parameters(0, 0.2, 0, 0, 0, 0, 0), () => 'yellow'],
				[Climate.parameters(0, 0, 0, 0, 0, 0.5, 0), () => 'orange'],
				[Climate.parameters(0, 0.2, 0, 0, 0, 0.9, 0), () => 'purple'],
				[Climate.parameters(0, -0.3, 0, 0, 0, 0, 0), () => 'cyan'],
				[Climate.parameters(0, -0.9, 0, 0, 0, 0.5, 0), () => 'brown'],
				[Climate.parameters(0, -0.1, 0.5, 0, 0, 0, 0), () => 'black'],
				[Climate.parameters(0, 0.7, 0, 0, 0, 0, 0), () => 'pink'],
			]

			const tree = new Climate.RTree(points)
			const distance = (node: Climate.RNode<string>, values: number[]) => node.distance(values)

			expect(tree['root']).instanceof(Climate.RSubTree)
			const root = tree['root'] as Climate.RSubTree<string>
			expect(root.children).lengthOf(2)
			expect(root.children[0]).instanceof(Climate.RSubTree)
			expect(root.children[1]).instanceof(Climate.RLeaf)

			expect(tree.search(Climate.target(0, 0, 0, 0, 0, 0), distance)).equal('red')
			expect(tree.search(Climate.target(0.4, 0, 0, 0, 0.7, 0), distance)).equal('red')
			expect(tree.search(Climate.target(0, 0.3, 0, -0.2, 0, 1), distance)).equal('purple')
			expect(tree.search(Climate.target(0, 0, 0.7, -0.2, 0, 0.1), distance)).equal('black')
			expect(tree.search(Climate.target(0, 0.6, 0, 0, 0, 0), distance)).equal('pink')
		})
	})
})
