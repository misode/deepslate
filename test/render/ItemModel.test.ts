import { describe, expect, it, vi } from 'vitest'
import { BlockModel, Color, Identifier, ItemRendererResources, ItemStack } from '../../src'
import { ItemModel } from '../../src/render/ItemModel'

describe('ItemModel', () => {
	const item = new ItemStack(Identifier.create('test:item'), 1)

	const blockModels = {
		'test:1': new BlockModel(undefined, undefined, undefined),
		'test:2': new BlockModel(undefined, undefined, undefined)
	}

	const blockModel1 = vi.spyOn(blockModels['test:1'], 'getMesh')
	const blockModel2 = vi.spyOn(blockModels['test:2'], 'getMesh')
	
	const resources: ItemRendererResources = {
		getBlockModel(id) { return blockModels[id.toString()] },
		getItemModel(id) { return null },
		getTextureAtlas() { return new ImageData(0, 0) },
		getTextureUV(texture) { return [0, 0, 0, 0] },
	}

	it('Model', () => {
		const model = ItemModel.fromJson({
			type: 'model',
			model: 'test:1',
			tints: [
				{
					type: "constant",
					value: [0.5, 0.6, 0.7]
				}
			]
		})

		blockModel1.mockClear()
		model.getMesh(item, resources, {})
		expect(blockModel1).toHaveBeenCalledOnce()
		const tint = blockModel1.mock.calls[0][2]
		expect(tint).toBeTypeOf('function')
		expect((tint as (index: number) => Color)(0)).toEqual([0.5, 0.6, 0.7])
		expect((tint as (index: number) => Color)(1)).toEqual([1, 1, 1])
	})

	it('Composite', () => {
		const model = ItemModel.fromJson({
			type: 'composite',
			models: [
				{
					type: 'model',
					model: 'test:1',
				},
				{
					type: 'model',
					model: 'test:1',
				}
			],
		})

		blockModel1.mockClear()
		model.getMesh(item, resources, {})
		expect(blockModel1).toHaveBeenCalledTimes(2)
	})


	it('Condition', () => {
		const model = ItemModel.fromJson({
			type: 'condition',
			property: 'carried',
			on_true: {
				type: 'model',
				model: 'test:1',
			},
			on_false: {
				type: 'model',
				model: 'test:2',
			}
		})

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(item, resources, {carried: true})
		expect(blockModel1).toHaveBeenCalledOnce()
		expect(blockModel2).not.toHaveBeenCalled()

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(item, resources, {carried: false})
		expect(blockModel1).not.toHaveBeenCalled()
		expect(blockModel2).toHaveBeenCalledOnce()
	})

	it('Select', () => {
		const model = ItemModel.fromJson({
			type: 'select',
			property: 'holder_type',
			cases: [
				{
					when: 'minecraft:zombie',
					model: {
						type: 'model',
						model: 'test:1',
					},
				}
			],
			fallback: {
				type: 'model',
				model: 'test:2',
			}
		})

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(item, resources, {holder_type: Identifier.create('zombie')})
		expect(blockModel1).toHaveBeenCalledOnce()
		expect(blockModel2).not.toHaveBeenCalled()

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(item, resources, {holder_type: Identifier.create('skeleton')})
		expect(blockModel1).not.toHaveBeenCalled()
		expect(blockModel2).toHaveBeenCalledOnce()
	})

	it('RangeDisptach', () => {
		const model = ItemModel.fromJson({
			type: 'range_dispatch',
			property: 'time',
			entries: [
				{
					threshold: 0.5,
					model: {
						type: 'model',
						model: 'test:1',
					},
				}
			],
			fallback: {
				type: 'model',
				model: 'test:2',
			}
		})

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(item, resources, {game_time: 12001})
		expect(blockModel1).toHaveBeenCalledOnce()
		expect(blockModel2).not.toHaveBeenCalled()

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(item, resources, {game_time: 11999})
		expect(blockModel1).not.toHaveBeenCalled()
		expect(blockModel2).toHaveBeenCalled()
	})	


})