import { describe, expect, it, vi } from 'vitest'
import type { Color, ItemRendererResources } from '../../src'
import { BlockModel, Identifier, ItemStack } from '../../src'
import { ItemModel } from '../../src/render/ItemModel'

describe('ItemModel', () => {
	const dummyItem = new ItemStack(Identifier.parse('dummy:dummy'), 1)

	const blockModels = {
		'test:1': new BlockModel(undefined, undefined, undefined),
		'test:2': new BlockModel(undefined, undefined, undefined),
	}

	const blockModel1 = vi.spyOn(blockModels['test:1'], 'getMesh')
	const blockModel2 = vi.spyOn(blockModels['test:2'], 'getMesh')
	
	const resources: ItemRendererResources = {
		getBlockModel(id) { return blockModels[id.toString()] },
		getItemModel(id) { return null },
		getTextureAtlas() { return new ImageData(0, 0) },
		getTextureUV(texture) { return [0, 0, 0, 0] },
		getItemComponents(id) { return new Map() },
	}

	it('Model', () => {
		const model = ItemModel.fromJson({
			type: 'model',
			model: 'test:1',
			tints: [
				{
					type: 'constant',
					value: [0.5, 0.6, 0.7],
				},
			],
		})

		blockModel1.mockClear()
		model.getMesh(dummyItem, resources, {})
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
				},
			],
		})

		blockModel1.mockClear()
		model.getMesh(dummyItem, resources, {})
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
			},
		})

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(dummyItem, resources, {carried: true})
		expect(blockModel1).toHaveBeenCalledOnce()
		expect(blockModel2).not.toHaveBeenCalled()

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(dummyItem, resources, {carried: false})
		expect(blockModel1).not.toHaveBeenCalled()
		expect(blockModel2).toHaveBeenCalledOnce()
	})

	it('Condition properties', () => {
		const fishing_rod_cast = ItemModel.Condition.propertyFromJson({property: 'fishing_rod/cast'})
		expect(fishing_rod_cast(dummyItem, resources, {'fishing_rod/cast': true})).toBeTruthy()
		expect(fishing_rod_cast(dummyItem, resources, {'fishing_rod/cast': false})).toBeFalsy()

		const selected = ItemModel.Condition.propertyFromJson({property: 'selected'})
		expect(selected(dummyItem, resources, {selected: true})).toBeTruthy()
		expect(selected(dummyItem, resources, {selected: false})).toBeFalsy()

		const carried = ItemModel.Condition.propertyFromJson({property: 'carried'})
		expect(carried(dummyItem, resources, {carried: true})).toBeTruthy()
		expect(carried(dummyItem, resources, {carried: false})).toBeFalsy()

		const extended_view = ItemModel.Condition.propertyFromJson({property: 'extended_view'})
		expect(extended_view(dummyItem, resources, {extended_view: true})).toBeTruthy()
		expect(extended_view(dummyItem, resources, {extended_view: false})).toBeFalsy()

		const view_entity = ItemModel.Condition.propertyFromJson({property: 'view_entity'})
		expect(view_entity(dummyItem, resources, {context_entity_is_view_entity: true})).toBeTruthy()
		expect(view_entity(dummyItem, resources, {context_entity_is_view_entity: false})).toBeFalsy()

		const using_item = ItemModel.Condition.propertyFromJson({property: 'using_item'})
		expect(using_item(dummyItem, resources, {use_duration: 0})).toBeTruthy()
		expect(using_item(dummyItem, resources, {use_duration: -1})).toBeFalsy()

		const bundle_has_selected_item = ItemModel.Condition.propertyFromJson({property: 'bundle/has_selected_item'})
		expect(bundle_has_selected_item(dummyItem, resources, {'bundle/selected_item': 0})).toBeTruthy()
		expect(bundle_has_selected_item(dummyItem, resources, {'bundle/selected_item': -1})).toBeFalsy()

		const keybind_down = ItemModel.Condition.propertyFromJson({property: 'keybind_down', keybind: 'testkey'})
		expect(keybind_down(dummyItem, resources, {keybind_down: ['testkey', 'a', 'b']})).toBeTruthy()
		expect(keybind_down(dummyItem, resources, {keybind_down: ['a', 'b']})).toBeFalsy()

		const broken = ItemModel.Condition.propertyFromJson({property: 'broken'})
		expect(broken(ItemStack.fromString('dummy:dummy[damage=99,max_damage=100]'), resources, {})).toBeTruthy()
		expect(broken(ItemStack.fromString('dummy:dummy[damage=98,max_damage=100]'), resources, {})).toBeFalsy()
		expect(broken(dummyItem, resources, {})).toBeFalsy()

		const damaged = ItemModel.Condition.propertyFromJson({property: 'damaged'})
		expect(damaged(ItemStack.fromString('dummy:dummy[damage=1,max_damage=100]'), resources, {})).toBeTruthy()
		expect(damaged(ItemStack.fromString('dummy:dummy[damage=0,max_damage=100]'), resources, {})).toBeFalsy()
		expect(damaged(dummyItem, resources, {})).toBeFalsy()

		const has_component = ItemModel.Condition.propertyFromJson({property: 'has_component', component: 'glider'})
		expect(has_component(ItemStack.fromString('dummy:dummy[minecraft:glider={}]'), resources, {})).toBeTruthy()
		expect(has_component(dummyItem, resources, {})).toBeFalsy()

		const custom_model_data = ItemModel.Condition.propertyFromJson({property: 'custom_model_data', index: 1})
		expect(custom_model_data(ItemStack.fromString('dummy:dummy[custom_model_data={flags:[false, true, false]}]'), resources, {})).toBeTruthy()
		expect(custom_model_data(ItemStack.fromString('dummy:dummy[custom_model_data={flags:[true, false, true]}]'), resources, {})).toBeFalsy()
		expect(custom_model_data(ItemStack.fromString('dummy:dummy[custom_model_data={flags:[true]}]'), resources, {})).toBeFalsy()
		expect(custom_model_data(dummyItem, resources, {})).toBeFalsy()
	})

	it('Select', () => {
		const model = ItemModel.fromJson({
			type: 'select',
			property: 'context_entity_type',
			cases: [
				{
					when: 'minecraft:zombie',
					model: {
						type: 'model',
						model: 'test:1',
					},
				},
			],
			fallback: {
				type: 'model',
				model: 'test:2',
			},
		})

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(dummyItem, resources, {context_entity_type: Identifier.create('zombie')})
		expect(blockModel1).toHaveBeenCalledOnce()
		expect(blockModel2).not.toHaveBeenCalled()

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(dummyItem, resources, {context_entity_type: Identifier.create('skeleton')})
		expect(blockModel1).not.toHaveBeenCalled()
		expect(blockModel2).toHaveBeenCalledOnce()
	})

	it('Select properties', () => {
		const main_hand = ItemModel.Select.propertyFromJson({property: 'main_hand'})
		expect(main_hand(dummyItem, resources, {main_hand: 'left'})).toEqual('left')
		expect(main_hand(dummyItem, resources, {main_hand: 'right'})).toEqual('right')

		const display_context = ItemModel.Select.propertyFromJson({property: 'display_context'})
		expect(display_context(dummyItem, resources, {display_context: 'gui'})).toEqual('gui')
		expect(display_context(dummyItem, resources, {display_context: 'fixed'})).toEqual('fixed')

		const context_entity_type = ItemModel.Select.propertyFromJson({property: 'context_entity_type'})
		expect(context_entity_type(dummyItem, resources, {context_entity_type: Identifier.create('zombie')})).toEqual('minecraft:zombie')
		expect(context_entity_type(dummyItem, resources, {})).toBeNull()

		const context_dimension = ItemModel.Select.propertyFromJson({property: 'context_dimension'})
		expect(context_dimension(dummyItem, resources, {context_dimension: Identifier.parse('test:test')})).toEqual('test:test')
		expect(context_dimension(dummyItem, resources, {})).toBeNull()

		const charge_type = ItemModel.Select.propertyFromJson({property: 'charge_type'})
		expect(charge_type(ItemStack.fromString('dummy:dummy[charged_projectiles=[{id:"minecraft:arrow"}, {id:"minecraft:firework_rocket"}]]'), resources, {})).toEqual('rocket')
		expect(charge_type(ItemStack.fromString('dummy:dummy[charged_projectiles=[{id:"minecraft:arrow"}, {id:"minecraft:arrow"}]]'), resources, {})).toEqual('arrow')
		expect(charge_type(ItemStack.fromString('dummy:dummy[charged_projectiles=[]]'), resources, {})).toEqual('none')
		expect(charge_type(dummyItem, resources, {})).toEqual('none')

		const trim_material = ItemModel.Select.propertyFromJson({property: 'trim_material'})
		expect(trim_material(ItemStack.fromString('dummy:dummy[trim={material:"gold"}]'), resources, {})).toEqual('minecraft:gold')
		expect(trim_material(dummyItem, resources, {})).toBeNull()

		const block_state = ItemModel.Select.propertyFromJson({property: 'block_state', block_state_property: 'facing'})
		expect(block_state(ItemStack.fromString('dummy:dummy[block_state={facing: "east"}]'), resources, {})).toEqual('east')
		expect(block_state(dummyItem, resources, {})).toBeNull()

		const custom_model_data = ItemModel.Select.propertyFromJson({property: 'custom_model_data', index: 1})
		expect(custom_model_data(ItemStack.fromString('dummy:dummy[custom_model_data={strings:["a", "b"]}]'), resources, {})).toEqual('b')
		expect(custom_model_data(ItemStack.fromString('dummy:dummy[custom_model_data={strings:["a"]}]'), resources, {})).toBeNull()
		expect(custom_model_data(dummyItem, resources, {})).toBeNull()

		// not testing local_time as it is not implemented
	})

	it('RangeDisptach', () => {
		const model = ItemModel.fromJson({
			type: 'range_dispatch',
			property: 'use_duration',
			remaining: false,
			entries: [
				{
					threshold: 2,
					model: {
						type: 'model',
						model: 'test:1',
					},
				},
			],
			fallback: {
				type: 'model',
				model: 'test:2',
			},
		})

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(dummyItem, resources, {use_duration: 3, max_use_duration:10})
		expect(blockModel1).toHaveBeenCalledOnce()
		expect(blockModel2).not.toHaveBeenCalled()

		blockModel1.mockClear()
		blockModel2.mockClear()
		model.getMesh(dummyItem, resources, {use_duration: 1, max_use_duration:10})
		expect(blockModel1).not.toHaveBeenCalled()
		expect(blockModel2).toHaveBeenCalled()
	})	

	it('RangeDisptach properties', () => {
		const time_daytime = ItemModel.RangeDispatch.propertyFromJson({property: 'time', source: 'daytime'})
		expect(time_daytime(dummyItem, resources, {game_time: 6000})).toEqual(0)
		expect(time_daytime(dummyItem, resources, {game_time: 18000})).toEqual(0.5)

		const time_moon_phase = ItemModel.RangeDispatch.propertyFromJson({property: 'time', source: 'moon_phase'})
		expect(time_moon_phase(dummyItem, resources, {game_time: 0})).toEqual(0)
		expect(time_moon_phase(dummyItem, resources, {game_time: 24000})).toEqual(1/8)
		expect(time_moon_phase(dummyItem, resources, {game_time: 7.5*24000})).toEqual(7.5/8)
		expect(time_moon_phase(dummyItem, resources, {game_time: 8*24000})).toEqual(0)

		const use_duration_remaining = ItemModel.RangeDispatch.propertyFromJson({property: 'use_duration', remaining: true})
		expect(use_duration_remaining(dummyItem, resources, {use_duration: 70, max_use_duration: 100})).toEqual(30)

		const use_duration = ItemModel.RangeDispatch.propertyFromJson({property: 'use_duration', remaining: false})
		expect(use_duration(dummyItem, resources, {use_duration: 70, max_use_duration: 100})).toEqual(70)

		const use_cycle = ItemModel.RangeDispatch.propertyFromJson({property: 'use_cycle', period: 20})
		expect(use_cycle(dummyItem, resources, {use_duration: 70, max_use_duration: 100})).toEqual(10)

		const damage = ItemModel.RangeDispatch.propertyFromJson({property: 'damage', normalize: false})
		expect(damage(ItemStack.fromString('dummy:dummy[damage=70,max_damage=100]'), resources, {})).toEqual(70)
		expect(damage(ItemStack.fromString('dummy:dummy[damage=120,max_damage=100]'), resources, {})).toEqual(100)

		const damage_normalized = ItemModel.RangeDispatch.propertyFromJson({property: 'damage', normalize: true})
		expect(damage_normalized(ItemStack.fromString('dummy:dummy[damage=70,max_damage=100]'), resources, {})).toEqual(0.7)
		expect(damage_normalized(ItemStack.fromString('dummy:dummy[damage=120,max_damage=100]'), resources, {})).toEqual(1)

		const count = ItemModel.RangeDispatch.propertyFromJson({property: 'count', normalize: false})
		const count_normalized = ItemModel.RangeDispatch.propertyFromJson({property: 'count', normalize: true})
		const itemStack = ItemStack.fromString('dummy:dummy[max_stack_size=64]')
		expect(count(itemStack, resources, {})).toEqual(1)
		expect(count_normalized(itemStack, resources, {})).toEqual(1/64)
		itemStack.count = 10
		expect(count(itemStack, resources, {})).toEqual(10)
		expect(count_normalized(itemStack, resources, {})).toEqual(10/64)
		itemStack.count = 100
		expect(count(itemStack, resources, {})).toEqual(64)
		expect(count_normalized(itemStack, resources, {})).toEqual(1)

		const cooldown = ItemModel.RangeDispatch.propertyFromJson({property: 'cooldown'})
		expect(cooldown(dummyItem, resources, {cooldown_percentage: {'dummy:dummy': 0.7}})).toEqual(0.7)
		expect(cooldown(ItemStack.fromString('dummy:dummy[use_cooldown={cooldown_group:"test"}]'), resources, {cooldown_percentage: {'minecraft:test': 0.6}})).toEqual(0.6)

		const custom_model_data = ItemModel.RangeDispatch.propertyFromJson({property: 'custom_model_data', index: 1})
		expect(custom_model_data(ItemStack.fromString('dummy:dummy[custom_model_data={floats:[0.7, 0.4]}]'), resources, {})).toEqual(0.4)
		expect(custom_model_data(ItemStack.fromString('dummy:dummy[custom_model_data={floats:[0.7]}]'), resources, {})).toEqual(0)
		expect(custom_model_data(dummyItem, resources, {})).toEqual(0)

		// not testing compass and crossbow/pull as they are not properly implemented
	})
})
