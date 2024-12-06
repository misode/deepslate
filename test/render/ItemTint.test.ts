import { describe, expect, it } from 'vitest'
import type { ItemComponentsProvider } from '../../src'
import { Color, ItemStack } from '../../src'
import { ItemTint } from '../../src/render/ItemTint'

describe('ItemTint', () => {
	const TEST_COLOR = [0.1, 0.2, 0.3] as Color

	const resources: ItemComponentsProvider = {
		getItemComponents(id) { return new Map() },
	}

	it('fromJson', () => {
		const constant = ItemTint.fromJson({type: 'constant', value: TEST_COLOR})
		expect(constant).toBeInstanceOf(ItemTint.Constant)
		expect((constant as ItemTint.Constant).value).toEqual(TEST_COLOR)

		const dye = ItemTint.fromJson({type: 'dye', default: TEST_COLOR})
		expect(dye).toBeInstanceOf(ItemTint.Dye)
		expect((dye as ItemTint.Dye).default_color).toEqual(TEST_COLOR)

		const grass = ItemTint.fromJson({type: 'grass', temperature: 0.7, downfall: 0.4})
		expect(grass).toBeInstanceOf(ItemTint.Grass)
		expect((grass as ItemTint.Grass).temperature).toEqual(0.7)
		expect((grass as ItemTint.Grass).downfall).toEqual(0.4)

		const firework = ItemTint.fromJson({type: 'firework', default: TEST_COLOR})
		expect(firework).toBeInstanceOf(ItemTint.Firework)
		expect((firework as ItemTint.Firework).default_color).toEqual(TEST_COLOR)

		const potion = ItemTint.fromJson({type: 'potion', default: TEST_COLOR})
		expect(potion).toBeInstanceOf(ItemTint.Potion)
		expect((potion as ItemTint.Potion).default_color).toEqual(TEST_COLOR)

		const map_color = ItemTint.fromJson({type: 'map_color', default: TEST_COLOR})
		expect(map_color).toBeInstanceOf(ItemTint.MapColor)
		expect((map_color as ItemTint.MapColor).default_color).toEqual(TEST_COLOR)

		const custom_model_data = ItemTint.fromJson({type: 'custom_model_data', index: 2, default: TEST_COLOR})
		expect(custom_model_data).toBeInstanceOf(ItemTint.CustomModelData)
		expect((custom_model_data as ItemTint.CustomModelData).index).toEqual(2)
		expect((custom_model_data as ItemTint.CustomModelData).default_color).toEqual(TEST_COLOR)
	})

	it('Constant', () => {
		expect(new ItemTint.Constant(TEST_COLOR).getTint(ItemStack.fromString('dummy:dummy'))).toEqual(TEST_COLOR)
	})

	it('Dye', () => {
		const dyeTint = new ItemTint.Dye(TEST_COLOR)
		expect(dyeTint.getTint(ItemStack.fromString('dummy:dummy'), resources)).toEqual(TEST_COLOR)
		expect(dyeTint.getTint(ItemStack.fromString('dummy:dummy[dyed_color=255]'), resources)).toEqual([0, 0, 1])
	})

	it('Firework', () => {
		const fireworkTint = new ItemTint.Firework(TEST_COLOR)
		expect(fireworkTint.getTint(ItemStack.fromString('dummy:dummy'), resources)).toEqual(TEST_COLOR)
		expect(fireworkTint.getTint(ItemStack.fromString('dummy:dummy[firework_explosion={colors:[255]}]'), resources)).toEqual([0, 0, 1])
		expect(fireworkTint.getTint(ItemStack.fromString('dummy:dummy[firework_explosion={colors:[255, 0]}]'), resources)).toEqual([0, 0, 0.5])
	})

	it('Potion', () => {
		const potionTint = new ItemTint.Potion(TEST_COLOR)
		expect(potionTint.getTint(ItemStack.fromString('dummy:dummy'), resources)).toEqual(TEST_COLOR)
		expect(potionTint.getTint(ItemStack.fromString('dummy:dummy[potion_contents={custom_color:255}]'), resources)).toEqual([0, 0, 1])
		expect(potionTint.getTint(ItemStack.fromString('dummy:dummy[potion_contents={potion:"water"}]'), resources)).toEqual(Color.intToRgb(-13083194))
		expect(potionTint.getTint(ItemStack.fromString('dummy:dummy[potion_contents={potion:"leaping"}]'), resources)).toEqual(Color.intToRgb(16646020))
		expect(potionTint.getTint(ItemStack.fromString('dummy:dummy[potion_contents={custom_effects:[{id:"jump_boost"}]}]'), resources)).toEqual(Color.intToRgb(16646020))
	})

	it('MapColor', () => {
		const mapColorTint = new ItemTint.MapColor(TEST_COLOR)
		expect(mapColorTint.getTint(ItemStack.fromString('dummy:dummy'), resources)).toEqual(TEST_COLOR)
		expect(mapColorTint.getTint(ItemStack.fromString('dummy:dummy[map_color=255]'), resources)).toEqual([0, 0, 1])
	})

	it('CustomModelData', () => {
		const customModelDataTint = new ItemTint.CustomModelData(1, TEST_COLOR)
		expect(customModelDataTint.getTint(ItemStack.fromString('dummy:dummy'), resources)).toEqual(TEST_COLOR)
		expect(customModelDataTint.getTint(ItemStack.fromString('dummy:dummy[custom_model_data={colors:[[0,0,1]]}]'), resources)).toEqual(TEST_COLOR)
		expect(customModelDataTint.getTint(ItemStack.fromString('dummy:dummy[custom_model_data={colors:[[0.0,0.0,0.5],[0.0,0.0,1.0]]}]'), resources)).toEqual([0, 0, 1])
	})

	// not testing grass as its not properly implemented
})
