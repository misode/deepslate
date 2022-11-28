import { Identifier } from '../Identifier.js'
import { Registry } from '../Registry.js'
import { MobEffects } from './MobEffect.js'
import { MobEffectInstance } from './MobEffectInstance.js'

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface SpawnEggProperties {
	entityType: string
	background: number
	highlight: number
}

export interface FoodProperties {
	nutrition: number
	saturationModifier: number
	isMeat: boolean
	canAlwaysEat: boolean
	fastFood: boolean
	effects: [MobEffectInstance, number][]
}

export type EquipmentSlot = 'mainhand' | 'offhand' | 'feet' | 'legs' | 'chest' | 'head'
const slotIndices: Record<EquipmentSlot, number> = {
	mainhand: 0,
	offhand: 1,
	feet: 0,
	legs: 1,
	chest: 2,
	head: 3,
}

export type ArmorMaterial = 'leather' | 'chainmail' | 'iron' | 'gold' | 'diamond' | 'turtle' | 'netherite'

export interface ArmorProperties {
	slot: EquipmentSlot
	material: ArmorMaterial
	defense: number
	toughness: number
	knockbackResistance: number
}

export type ItemTier = 'wood' | 'stone' | 'iron' | 'diamond' | 'gold' | 'netherite'

export interface TieredProperties {
	tier: ItemTier
	level: number
	speed: number
	damage: number
	isWeapon: boolean
	isDigger: boolean
	isAxe: boolean
}

export interface Item {
	readonly id: Identifier,
	readonly rarity: ItemRarity,
	readonly stack: number
	readonly durability?: number
	readonly enchantmentValue?: number
	readonly fireResistant?: boolean
	readonly wearable?: boolean
	readonly vanishable?: boolean
	readonly craftRemainder?: Item
	readonly spawnEgg?: SpawnEggProperties
	readonly food?: FoodProperties
	readonly armor?: ArmorProperties
	readonly tiered?: TieredProperties
}

const registry = new Registry<Item>(Identifier.create('item'))
Registry.REGISTRY.register(registry.key, registry)

export namespace Item {
	export const REGISTRY = registry

	export function get(arg: string | Identifier): Item {
		const id = typeof arg === 'string' ? Identifier.parse(arg) : arg
		const item = registry.get(id)
		return item ?? { id, rarity: 'common', stack: 64 }
	}
}

function register(id: string, props?: Partial<Omit<Item, 'id'>>) {
	const item: Item = {
		id: Identifier.create(id),
		rarity: 'common',
		stack: 64,
		...props,
		...(props?.vanishable || props?.wearable) ? { vanishable: true } : {},
	}
	registry.register(item.id, item, true)
	return item
}

function spawnEgg(entityType: string, background: number, highlight: number): Partial<Item> {
	return {
		spawnEgg: {
			entityType,
			background,
			highlight,
		},
	}
}

function food(nutrition: number, saturationModifier: number, props?: Partial<FoodProperties>): Partial<Item> {
	return {
		food: {
			nutrition,
			saturationModifier,
			isMeat: false,
			canAlwaysEat: false,
			fastFood: false,
			effects: [],
			...props,
		},
	}
}

const armorMaterials: Record<ArmorMaterial, any> = {
	leather: [5, [1, 2, 3, 1], 15, 0, 0],
	chainmail: [15, [1, 4, 5, 2], 12, 0, 0],
	iron: [15, [2, 5, 6, 2], 12, 0, 0],
	gold: [7, [1, 3, 5, 2], 25, 0, 0],
	diamond: [33, [3, 6, 8, 3], 9, 2, 0],
	turtle: [25, [2, 5, 6, 2], 9, 0, 0],
	netherite: [37, [3, 6, 8, 3], 15, 3, 0.1],
}

function armor(slot: EquipmentSlot, material: ArmorMaterial): Partial<Item> {
	const [durabilityMul, slotDefense, enchantmentValue, toughness, knockbackResistance] = armorMaterials[material]
	const slotIndex = slotIndices[slot]
	return {
		stack: 1,
		durability: [13, 15, 16, 11][slotIndex] * durabilityMul,
		enchantmentValue,
		...material === 'netherite' ? { fireResistant: true } : {},
		wearable: true,
		armor: {
			slot,
			material,
			defense: slotDefense[slotIndex],
			toughness,
			knockbackResistance,
		},
	}
}

const itemTiers: Record<ItemTier, any> = {
	wood: [0, 59, 2, 0, 15],
	stone: [1, 131, 4, 1, 5],
	iron: [2, 250, 6, 2, 14],
	diamond: [3, 1561, 8, 3, 10],
	gold: [0, 32, 12, 0, 22],
	netherite: [4, 2031, 9, 4, 15],
}

function tiered(tier: ItemTier, type: 'weapon' | 'digger' | 'axe'): Partial<Item> {
	const [level, uses, speed, damage, enchantmentValue] = itemTiers[tier]
	return {
		durability: uses,
		enchantmentValue,
		...tier === 'netherite' ? { fireResistant: true } : {},
		tiered: {
			tier,
			level,
			speed,
			damage,
			isWeapon: type === 'weapon',
			isDigger: type === 'digger' || type === 'axe',
			isAxe: type === 'axe',
		},
	}
}

export namespace Items {
	export const AIR = register('air')
	export const CARVED_PUMPKIN = register('carved_pumpkin', { wearable: true })
	export const SADDLE = register('saddle', { stack: 1 })
	export const MINECART = register('minecart', { stack: 1 })
	export const CHEST_MINECART = register('chest_minecart', { stack: 1 })
	export const FURNACE_MINECART = register('furnace_minecart', { stack: 1 })
	export const TNT_MINECART = register('tnt_minecart', { stack: 1 })
	export const HOPPER_MINECART = register('hopper_minecart', { stack: 1 })
	export const CARROT_ON_A_STICK = register('carrot_on_a_stick', { stack: 1, durability: 25 })
	export const WARPED_FUNGUS_ON_A_STICK = register('warped_fungus_on_a_stick', { stack: 1, durability: 100 })
	export const ELYTRA = register('elytra', { rarity: 'uncommon', stack: 1, durability: 432, wearable: true })
	export const OAK_BOAT = register('oak_boat', { stack: 1 })
	export const OAK_CHEST_BOAT = register('oak_chest_boat', { stack: 1 })
	export const SPRUCE_BOAT = register('spruce_boat', { stack: 1 })
	export const SPRUCE_CHEST_BOAT = register('spruce_chest_boat', { stack: 1 })
	export const BIRCH_BOAT = register('birch_boat', { stack: 1 })
	export const BIRCH_CHEST_BOAT = register('birch_chest_boat', { stack: 1 })
	export const JUNGLE_BOAT = register('jungle_boat', { stack: 1 })
	export const JUNGLE_CHEST_BOAT = register('jungle_chest_boat', { stack: 1 })
	export const ACACIA_BOAT = register('acacia_boat', { stack: 1 })
	export const ACACIA_CHEST_BOAT = register('acacia_chest_boat', { stack: 1 })
	export const DARK_OAK_BOAT = register('dark_oak_boat', { stack: 1 })
	export const DARK_OAK_CHEST_BOAT = register('dark_oak_chest_boat', { stack: 1 })
	export const MANGROVE_BOAT = register('mangrove_boat', { stack: 1 })
	export const MANGROVE_CHEST_BOAT = register('mangrove_chest_boat', { stack: 1 })
	export const BAMBOO_RAFT = register('bamboo_raft', { stack: 1 })
	export const BAMBOO_CHEST_RAFT = register('bamboo_chest_raft', { stack: 1 })
	export const STRUCTURE_BLOCK = register('structure_block', { rarity: 'epic' })
	export const JIGSAW = register('jigsaw', { rarity: 'epic' })
	export const TURTLE_HELMET = register('turtle_helmet', armor('head', 'turtle'))
	export const FLINT_AND_STEEL = register('flint_and_steel', { stack: 1, durability: 64 })
	export const APPLE = register('apple', food(4, 0.3))
	export const BOW = register('bow', { stack: 1, durability: 384, enchantmentValue: 1 })
	export const NETHERITE_INGOT = register('netherite_ingot', { fireResistant: true })
	export const NETHERITE_SCRAP = register('netherite_scrap', { fireResistant: true })
	export const WOODEN_SWORD = register('wooden_sword', tiered('wood', 'weapon'))
	export const WOODEN_SHOVEL = register('wooden_shovel', tiered('wood', 'digger'))
	export const WOODEN_PICKAXE = register('wooden_pickaxe', tiered('wood', 'digger'))
	export const WOODEN_AXE = register('wooden_axe', tiered('wood', 'axe'))
	export const WOODEN_HOE = register('wooden_hoe', tiered('wood', 'digger'))
	export const STONE_SWORD = register('stone_sword', tiered('stone', 'weapon'))
	export const STONE_SHOVEL = register('stone_shovel', tiered('stone', 'digger'))
	export const STONE_PICKAXE = register('stone_pickaxe', tiered('stone', 'digger'))
	export const STONE_AXE = register('stone_axe', tiered('stone', 'axe'))
	export const STONE_HOE = register('stone_hoe', tiered('stone', 'digger'))
	export const GOLDEN_SWORD = register('golden_sword', tiered('gold', 'weapon'))
	export const GOLDEN_SHOVEL = register('golden_shovel', tiered('gold', 'digger'))
	export const GOLDEN_PICKAXE = register('golden_pickaxe', tiered('gold', 'digger'))
	export const GOLDEN_AXE = register('golden_axe', tiered('gold', 'axe'))
	export const GOLDEN_HOE = register('golden_hoe', tiered('gold', 'digger'))
	export const IRON_SWORD = register('iron_sword', tiered('iron', 'weapon'))
	export const IRON_SHOVEL = register('iron_shovel', tiered('iron', 'digger'))
	export const IRON_PICKAXE = register('iron_pickaxe', tiered('iron', 'digger'))
	export const IRON_AXE = register('iron_axe', tiered('iron', 'axe'))
	export const IRON_HOE = register('iron_hoe', tiered('iron', 'digger'))
	export const DIAMOND_SWORD = register('diamond_sword', tiered('diamond', 'weapon'))
	export const DIAMOND_SHOVEL = register('diamond_shovel', tiered('diamond', 'digger'))
	export const DIAMOND_PICKAXE = register('diamond_pickaxe', tiered('diamond', 'digger'))
	export const DIAMOND_AXE = register('diamond_axe', tiered('diamond', 'axe'))
	export const DIAMOND_HOE = register('diamond_hoe', tiered('diamond', 'digger'))
	export const NETHERITE_SWORD = register('netherite_sword', tiered('netherite', 'weapon'))
	export const NETHERITE_SHOVEL = register('netherite_shovel', tiered('netherite', 'digger'))
	export const NETHERITE_PICKAXE = register('netherite_pickaxe', tiered('netherite', 'digger'))
	export const NETHERITE_AXE = register('netherite_axe', tiered('netherite', 'axe'))
	export const NETHERITE_HOE = register('netherite_hoe', tiered('netherite', 'digger'))
	export const MUSHROOM_STEW = register('mushroom_stew', { stack: 1, ...food(6, 0.6) })
	export const BREAD = register('bread', food(5, 0.6))
	export const LEATHER_HELMET = register('leather_helmet', armor('head', 'leather'))
	export const LEATHER_CHESTPLATE = register('leather_chestplate', armor('chest', 'leather'))
	export const LEATHER_LEGGINGS = register('leather_leggings', armor('legs', 'leather'))
	export const LEATHER_BOOTS = register('leather_boots', armor('feet', 'leather'))
	export const CHAINMAIL_HELMET = register('chainmail_helmet', armor('head', 'chainmail'))
	export const CHAINMAIL_CHESTPLATE = register('chainmail_chestplate', armor('chest', 'chainmail'))
	export const CHAINMAIL_LEGGINGS = register('chainmail_leggings', armor('legs', 'chainmail'))
	export const CHAINMAIL_BOOTS = register('chainmail_boots', armor('feet', 'chainmail'))
	export const IRON_HELMET = register('iron_helmet', armor('head', 'iron'))
	export const IRON_CHESTPLATE = register('iron_chestplate', armor('chest', 'iron'))
	export const IRON_LEGGINGS = register('iron_leggings', armor('legs', 'iron'))
	export const IRON_BOOTS = register('iron_boots', armor('feet', 'iron'))
	export const DIAMOND_HELMET = register('diamond_helmet', armor('head', 'diamond'))
	export const DIAMOND_CHESTPLATE = register('diamond_chestplate', armor('chest', 'diamond'))
	export const DIAMOND_LEGGINGS = register('diamond_leggings', armor('legs', 'diamond'))
	export const DIAMOND_BOOTS = register('diamond_boots', armor('feet', 'diamond'))
	export const GOLDEN_HELMET = register('golden_helmet', armor('head', 'gold'))
	export const GOLDEN_CHESTPLATE = register('golden_chestplate', armor('chest', 'gold'))
	export const GOLDEN_LEGGINGS = register('golden_leggings', armor('legs', 'gold'))
	export const GOLDEN_BOOTS = register('golden_boots', armor('feet', 'gold'))
	export const NETHERITE_HELMET = register('netherite_helmet', armor('head', 'netherite'))
	export const NETHERITE_CHESTPLATE = register('netherite_chestplate', armor('chest', 'netherite'))
	export const NETHERITE_LEGGINGS = register('netherite_leggings', armor('legs', 'netherite'))
	export const NETHERITE_BOOTS = register('netherite_boots', armor('feet', 'netherite'))
	export const PORKCHOP = register('porkchop', food(3, 0.3, { isMeat: true }))
	export const COOKED_PORKCHOP = register('cooked_porkchop', food(8, 0.8, { isMeat: true }))
	export const GOLDEN_APPLE = register('golden_apple', { rarity: 'rare', ...food(4, 1.2, { canAlwaysEat: true, effects: [
		[MobEffectInstance.create(MobEffects.REGENERATION, 100, 1), 1],
		[MobEffectInstance.create(MobEffects.ABSORPTION, 2400, 0), 1],
	] }) })
	export const ENCHANTED_GOLDEN_APPLE = register('enchanted_golden_apple', { rarity: 'epic', ...food(4, 1.2, { canAlwaysEat: true, effects: [
		[MobEffectInstance.create(MobEffects.REGENERATION, 400, 1), 1],
		[MobEffectInstance.create(MobEffects.RESISTANCE, 6000, 0), 1],
		[MobEffectInstance.create(MobEffects.FIRE_RESISTANCE, 6000, 0), 1],
		[MobEffectInstance.create(MobEffects.ABSORPTION, 2400, 3), 1],
	]}) })
	export const OAK_SIGN = register('oak_sign', { stack: 16 })
	export const SPRUCE_SIGN = register('spruce_sign', { stack: 16 })
	export const BIRCH_SIGN = register('birch_sign', { stack: 16 })
	export const JUNGLE_SIGN = register('jungle_sign', { stack: 16 })
	export const ACACIA_SIGN = register('acacia_sign', { stack: 16 })
	export const DARK_OAK_SIGN = register('dark_oak_sign', { stack: 16 })
	export const MANGROVE_SIGN = register('mangrove_sign', { stack: 16 })
	export const BAMBOO_SIGN = register('bamboo_sign', { stack: 16 })
	export const CRIMSON_SIGN = register('crimson_sign', { stack: 16 })
	export const WARPED_SIGN = register('warped_sign', { stack: 16 })
	export const OAK_HANGING_SIGN = register('oak_hanging_sign', { stack: 16 })
	export const SPRUCE_HANGING_SIGN = register('spruce_hanging_sign', { stack: 16 })
	export const BIRCH_HANGING_SIGN = register('birch_hanging_sign', { stack: 16 })
	export const JUNGLE_HANGING_SIGN = register('jungle_hanging_sign', { stack: 16 })
	export const ACACIA_HANGING_SIGN = register('acacia_hanging_sign', { stack: 16 })
	export const DARK_OAK_HANGING_SIGN = register('dark_oak_hanging_sign', { stack: 16 })
	export const MANGROVE_HANGING_SIGN = register('mangrove_hanging_sign', { stack: 16 })
	export const BAMBOO_HANGING_SIGN = register('bamboo_hanging_sign', { stack: 16 })
	export const CRIMSON_HANGING_SIGN = register('crimson_hanging_sign', { stack: 16 })
	export const WARPED_HANGING_SIGN = register('warped_hanging_sign', { stack: 16 })
	export const BUCKET = register('bucket', { stack: 16 })
	export const WATER_BUCKET = register('water_bucket', { stack: 1, craftRemainder: BUCKET })
	export const LAVA_BUCKET = register('lava_bucket', { stack: 1, craftRemainder: BUCKET })
	export const POWDER_SNOW_BUCKET = register('powder_snow_bucket', { stack: 1 })
	export const SNOWBALL = register('snowball', { stack: 16 })
	export const MILK_BUCKET = register('milk_bucket', { stack: 1, craftRemainder: BUCKET })
	export const PUFFERFISH_BUCKET = register('pufferfish_bucket', { stack: 1 })
	export const SALMON_BUCKET = register('salmon_bucket', { stack: 1 })
	export const COD_BUCKET = register('cod_bucket', { stack: 1 })
	export const TROPICAL_FISH_BUCKET = register('tropical_fish_bucket', { stack: 1 })
	export const AXOLOTL_BUCKET = register('axolotl_bucket', { stack: 1 })
	export const TADPOLE_BUCKET = register('tadpole_bucket', { stack: 1 })
	export const BOOK = register('book', { enchantmentValue: 1 })
	export const EGG = register('egg', { stack: 16 })
	export const COMPASS = register('compass', { vanishable: true })
	export const BUNDLE = register('bundle', { stack: 1 })
	export const FISHING_ROD = register('fishing_rod', { stack: 1, durability: 64, enchantmentValue: 1 })
	export const SPYGLASS = register('spyglass', { stack: 1 })
	export const COD = register('cod', food(2, 0.1))
	export const SALMON = register('salmon', food(2, 0.1))
	export const TROPICAL_FISH = register('tropical_fish', food(1, 0.1))
	export const PUFFERFISH = register('pufferfish', food(1, 0.1, { effects: [
		[MobEffectInstance.create(MobEffects.POISON, 1200, 1), 1],
		[MobEffectInstance.create(MobEffects.HUNGER, 300, 2), 1],
		[MobEffectInstance.create(MobEffects.NAUSEA, 300, 0), 1],
	]}))
	export const COOKED_COD = register('cooked_cod', food(5, 0.6))
	export const COOKED_SALMON = register('cooked_salmon', food(6, 0.8))
	export const CAKE = register('cake', { stack: 1 })
	export const WHITE_BED = register('white_bed', { stack: 1 })
	export const ORANGE_BED = register('orange_bed', { stack: 1 })
	export const MAGENTA_BED = register('magenta_bed', { stack: 1 })
	export const LIGHT_BLUE_BED = register('light_blue_bed', { stack: 1 })
	export const YELLOW_BED = register('yellow_bed', { stack: 1 })
	export const LIME_BED = register('lime_bed', { stack: 1 })
	export const PINK_BED = register('pink_bed', { stack: 1 })
	export const GRAY_BED = register('gray_bed', { stack: 1 })
	export const LIGHT_GRAY_BED = register('light_gray_bed', { stack: 1 })
	export const CYAN_BED = register('cyan_bed', { stack: 1 })
	export const PURPLE_BED = register('purple_bed', { stack: 1 })
	export const BLUE_BED = register('blue_bed', { stack: 1 })
	export const BROWN_BED = register('brown_bed', { stack: 1 })
	export const GREEN_BED = register('green_bed', { stack: 1 })
	export const RED_BED = register('red_bed', { stack: 1 })
	export const BLACK_BED = register('black_bed', { stack: 1 })
	export const COOKIE = register('cookie', food(2, 0.1))
	export const SHEARS = register('shears', { stack: 1, durability: 238 })
	export const MELON_SLICE = register('melon_slice', food(2, 0.3))
	export const DRIED_KELP = register('dried_kelp', food(1, 0.3, { fastFood: true }))
	export const BEEF = register('beef', food(3, 0.3, { isMeat: true }))
	export const COOKED_BEEF = register('cooked_beef', food(8, 0.8, { isMeat: true }))
	export const CHICKEN = register('chicken', food(2, 0.3, { isMeat: true, effects: [
		[MobEffectInstance.create(MobEffects.HUNGER, 600, 0), 0.3],
	]}))
	export const COOKED_CHICKEN = register('cooked_chicken', food(6, 0.6, { isMeat: true }))
	export const ROTTEN_FLESH = register('rotten_flesh', food(4, 0.1, { isMeat: true, effects: [
		[MobEffectInstance.create(MobEffects.HUNGER, 600, 0), 0.8],
	]}))
	export const ENDER_PEARL = register('ender_pearl', { stack: 16 })
	export const POTION = register('potion', { stack: 1 })
	export const GLASS_BOTTLE = register('glass_bottle')
	export const SPIDER_EYE = register('spider_eye', food(2, 0.8, { effects: [
		[MobEffectInstance.create(MobEffects.POISON, 100, 0), 1],
	]}))
	export const ALLAY_SPAWN_EGG = register('allay_spawn_egg', spawnEgg('allay', 56063, 44543))
	export const AXOLOTL_SPAWN_EGG = register('axolotl_spawn_egg', spawnEgg('axolotl', 16499171, 10890612))
	export const BAT_SPAWN_EGG = register('bat_spawn_egg', spawnEgg('bat', 4996656, 986895))
	export const BEE_SPAWN_EGG = register('bee_spawn_egg', spawnEgg('bee', 15582019, 4400155))
	export const BLAZE_SPAWN_EGG = register('blaze_spawn_egg', spawnEgg('blaze', 16167425, 16775294))
	export const CAT_SPAWN_EGG = register('cat_spawn_egg', spawnEgg('cat', 15714446, 9794134))
	export const CAMEL_SPAWN_EGG = register('camel_spawn_egg', spawnEgg('camel', 16565097, 13341495))
	export const CAVE_SPIDER_SPAWN_EGG = register('cave_spider_spawn_egg', spawnEgg('cave_spider', 803406, 11013646))
	export const CHICKEN_SPAWN_EGG = register('chicken_spawn_egg', spawnEgg('chicken', 10592673, 16711680))
	export const COD_SPAWN_EGG = register('cod_spawn_egg', spawnEgg('cod', 12691306, 15058059))
	export const COW_SPAWN_EGG = register('cow_spawn_egg', spawnEgg('cow', 4470310, 10592673))
	export const CREEPER_SPAWN_EGG = register('creeper_spawn_egg', spawnEgg('creeper', 894731, 0))
	export const DOLPHIN_SPAWN_EGG = register('dolphin_spawn_egg', spawnEgg('dolphin', 2243405, 16382457))
	export const DONKEY_SPAWN_EGG = register('donkey_spawn_egg', spawnEgg('donkey', 5457209, 8811878))
	export const DROWNED_SPAWN_EGG = register('drowned_spawn_egg', spawnEgg('drowned', 9433559, 7969893))
	export const ELDER_GUARDIAN_SPAWN_EGG = register('elder_guardian_spawn_egg', spawnEgg('elder_guardian', 13552826, 7632531))
	export const ENDER_DRAGON_SPAWN_EGG = register('ender_dragon_spawn_egg', spawnEgg('ender_dragon', 1842204, 14711290))
	export const ENDERMAN_SPAWN_EGG = register('enderman_spawn_egg', spawnEgg('enderman', 1447446, 0))
	export const ENDERMITE_SPAWN_EGG = register('endermite_spawn_egg', spawnEgg('endermite', 1447446, 7237230))
	export const EVOKER_SPAWN_EGG = register('evoker_spawn_egg', spawnEgg('evoker', 9804699, 1973274))
	export const FOX_SPAWN_EGG = register('fox_spawn_egg', spawnEgg('fox', 14005919, 13396256))
	export const FROG_SPAWN_EGG = register('frog_spawn_egg', spawnEgg('frog', 13661252, 16762748))
	export const GHAST_SPAWN_EGG = register('ghast_spawn_egg', spawnEgg('ghast', 16382457, 12369084))
	export const GLOW_SQUID_SPAWN_EGG = register('glow_squid_spawn_egg', spawnEgg('glow_squid', 611926, 8778172))
	export const GOAT_SPAWN_EGG = register('goat_spawn_egg', spawnEgg('goat', 10851452, 5589310))
	export const GUARDIAN_SPAWN_EGG = register('guardian_spawn_egg', spawnEgg('guardian', 5931634, 15826224))
	export const HOGLIN_SPAWN_EGG = register('hoglin_spawn_egg', spawnEgg('hoglin', 13004373, 6251620))
	export const HORSE_SPAWN_EGG = register('horse_spawn_egg', spawnEgg('horse', 12623485, 15656192))
	export const HUSK_SPAWN_EGG = register('husk_spawn_egg', spawnEgg('husk', 7958625, 15125652))
	export const IRON_GOLEM_SPAWN_EGG = register('iron_golem_spawn_egg', spawnEgg('iron_golem', 14405058, 7643954))
	export const LLAMA_SPAWN_EGG = register('llama_spawn_egg', spawnEgg('llama', 12623485, 10051392))
	export const MAGMA_CUBE_SPAWN_EGG = register('magma_cube_spawn_egg', spawnEgg('magma_cube', 3407872, 16579584))
	export const MOOSHROOM_SPAWN_EGG = register('mooshroom_spawn_egg', spawnEgg('mooshroom', 10489616, 12040119))
	export const MULE_SPAWN_EGG = register('mule_spawn_egg', spawnEgg('mule', 1769984, 5321501))
	export const OCELOT_SPAWN_EGG = register('ocelot_spawn_egg', spawnEgg('ocelot', 15720061, 5653556))
	export const PANDA_SPAWN_EGG = register('panda_spawn_egg', spawnEgg('panda', 15198183, 1776418))
	export const PARROT_SPAWN_EGG = register('parrot_spawn_egg', spawnEgg('parrot', 894731, 16711680))
	export const PHANTOM_SPAWN_EGG = register('phantom_spawn_egg', spawnEgg('phantom', 4411786, 8978176))
	export const PIG_SPAWN_EGG = register('pig_spawn_egg', spawnEgg('pig', 15771042, 14377823))
	export const PIGLIN_SPAWN_EGG = register('piglin_spawn_egg', spawnEgg('piglin', 10051392, 16380836))
	export const PIGLIN_BRUTE_SPAWN_EGG = register('piglin_brute_spawn_egg', spawnEgg('piglin_brute', 5843472, 16380836))
	export const PILLAGER_SPAWN_EGG = register('pillager_spawn_egg', spawnEgg('pillager', 5451574, 9804699))
	export const POLAR_BEAR_SPAWN_EGG = register('polar_bear_spawn_egg', spawnEgg('polar_bear', 15658718, 14014157))
	export const PUFFERFISH_SPAWN_EGG = register('pufferfish_spawn_egg', spawnEgg('pufferfish', 16167425, 3654642))
	export const RABBIT_SPAWN_EGG = register('rabbit_spawn_egg', spawnEgg('rabbit', 10051392, 7555121))
	export const RAVAGER_SPAWN_EGG = register('ravager_spawn_egg', spawnEgg('ravager', 7697520, 5984329))
	export const SALMON_SPAWN_EGG = register('salmon_spawn_egg', spawnEgg('salmon', 10489616, 951412))
	export const SHEEP_SPAWN_EGG = register('sheep_spawn_egg', spawnEgg('sheep', 15198183, 16758197))
	export const SHULKER_SPAWN_EGG = register('shulker_spawn_egg', spawnEgg('shulker', 9725844, 5060690))
	export const SILVERFISH_SPAWN_EGG = register('silverfish_spawn_egg', spawnEgg('silverfish', 7237230, 3158064))
	export const SKELETON_SPAWN_EGG = register('skeleton_spawn_egg', spawnEgg('skeleton', 12698049, 4802889))
	export const SKELETON_HORSE_SPAWN_EGG = register('skeleton_horse_spawn_egg', spawnEgg('skeleton_horse', 6842447, 15066584))
	export const SLIME_SPAWN_EGG = register('slime_spawn_egg', spawnEgg('slime', 5349438, 8306542))
	export const SNOW_GOLEM_SPAWN_EGG = register('snow_golem_spawn_egg', spawnEgg('snow_golem', 14283506, 8496292))
	export const SPIDER_SPAWN_EGG = register('spider_spawn_egg', spawnEgg('spider', 3419431, 11013646))
	export const SQUID_SPAWN_EGG = register('squid_spawn_egg', spawnEgg('squid', 2243405, 7375001))
	export const STRAY_SPAWN_EGG = register('stray_spawn_egg', spawnEgg('stray', 6387319, 14543594))
	export const STRIDER_SPAWN_EGG = register('strider_spawn_egg', spawnEgg('strider', 10236982, 5065037))
	export const TADPOLE_SPAWN_EGG = register('tadpole_spawn_egg', spawnEgg('tadpole', 7164733, 1444352))
	export const TRADER_LLAMA_SPAWN_EGG = register('trader_llama_spawn_egg', spawnEgg('trader_llama', 15377456, 4547222))
	export const TROPICAL_FISH_SPAWN_EGG = register('tropical_fish_spawn_egg', spawnEgg('tropical_fish', 15690005, 16775663))
	export const TURTLE_SPAWN_EGG = register('turtle_spawn_egg', spawnEgg('turtle', 15198183, 44975))
	export const VEX_SPAWN_EGG = register('vex_spawn_egg', spawnEgg('vex', 8032420, 15265265))
	export const VILLAGER_SPAWN_EGG = register('villager_spawn_egg', spawnEgg('villager', 5651507, 12422002))
	export const VINDICATOR_SPAWN_EGG = register('vindicator_spawn_egg', spawnEgg('vindicator', 9804699, 2580065))
	export const WANDERING_TRADER_SPAWN_EGG = register('wandering_trader_spawn_egg', spawnEgg('wandering_trader', 4547222, 15377456))
	export const WARDEN_SPAWN_EGG = register('warden_spawn_egg', spawnEgg('warden', 1001033, 3790560))
	export const WITCH_SPAWN_EGG = register('witch_spawn_egg', spawnEgg('witch', 3407872, 5349438))
	export const WITHER_SPAWN_EGG = register('wither_spawn_egg', spawnEgg('wither', 1315860, 5075616))
	export const WITHER_SKELETON_SPAWN_EGG = register('wither_skeleton_spawn_egg', spawnEgg('wither_skeleton', 1315860, 4672845))
	export const WOLF_SPAWN_EGG = register('wolf_spawn_egg', spawnEgg('wolf', 14144467, 13545366))
	export const ZOGLIN_SPAWN_EGG = register('zoglin_spawn_egg', spawnEgg('zoglin', 13004373, 15132390))
	export const ZOMBIE_SPAWN_EGG = register('zombie_spawn_egg', spawnEgg('zombie', 44975, 7969893))
	export const ZOMBIE_HORSE_SPAWN_EGG = register('zombie_horse_spawn_egg', spawnEgg('zombie_horse', 3232308, 9945732))
	export const ZOMBIE_VILLAGER_SPAWN_EGG = register('zombie_villager_spawn_egg', spawnEgg('zombie_villager', 5651507, 7969893))
	export const ZOMBIFIED_PIGLIN_SPAWN_EGG = register('zombified_piglin_spawn_egg', spawnEgg('zombified_piglin', 15373203, 5009705))
	export const EXPERIENCE_BOTTLE = register('experience_bottle', { rarity: 'uncommon' })
	export const WRITABLE_BOOK = register('writable_book', { stack: 1 })
	export const WRITTEN_BOOK = register('written_book', { stack: 16 })
	export const CARROT = register('carrot', food(3, 0.6))
	export const POTATO = register('potato', food(1, 0.3))
	export const BAKED_POTATO = register('baked_potato', food(5, 0.6))
	export const POISONOUS_POTATO = register('poisonous_potato', food(2, 0.3, { effects: [
		[MobEffectInstance.create(MobEffects.POISON, 100, 0), 0.6],
	]}))
	export const GOLDEN_CARROT = register('golden_carrot', food(6, 1.2))
	export const SKELETON_SKULL = register('skeleton_skull', { rarity: 'uncommon', wearable: true })
	export const WITHER_SKELETON_SKULL = register('wither_skeleton_skull', { rarity: 'uncommon', wearable: true })
	export const PLAYER_HEAD = register('player_head', { rarity: 'uncommon', wearable: true })
	export const ZOMBIE_HEAD = register('zombie_head', { rarity: 'uncommon', wearable: true })
	export const CREEPER_HEAD = register('creeper_head', { rarity: 'uncommon', wearable: true })
	export const DRAGON_HEAD = register('dragon_head', { rarity: 'uncommon', wearable: true })
	export const PIGLIN_HEAD = register('piglin_head', { rarity: 'uncommon', wearable: true })
	export const NETHER_STAR = register('nether_star', { rarity: 'uncommon' })
	export const PUMPKIN_PIE = register('pumpkin_pie', food(8, 0.3))
	export const ENCHANTED_BOOK = register('enchanted_book', { rarity: 'uncommon', stack: 1 })
	export const RABBIT = register('rabbit', food(3, 0.3, { isMeat: true }))
	export const COOKED_RABBIT = register('cooked_rabbit', food(5, 0.6, { isMeat: true }))
	export const RABBIT_STEW = register('rabbit_stew', { stack: 1, ...food(10, 0.6) })
	export const ARMOR_STAND = register('armor_stand', { stack: 16 })
	export const IRON_HORSE_ARMOR = register('iron_horse_armor', { stack: 1 })
	export const GOLDEN_HORSE_ARMOR = register('golden_horse_armor', { stack: 1 })
	export const DIAMOND_HORSE_ARMOR = register('diamond_horse_armor', { stack: 1 })
	export const LEATHER_HORSE_ARMOR = register('leather_horse_armor', { stack: 1 })
	export const COMMAND_BLOCK_MINECART = register('command_block_minecart', { rarity: 'epic', stack: 1 })
	export const MUTTON = register('mutton', food(2, 0.3, { isMeat: true }))
	export const COOKED_MUTTON = register('cooked_mutton', food(6, 0.8, { isMeat: true }))
	export const WHITE_BANNER = register('white_banner', { stack: 16 })
	export const ORANGE_BANNER = register('orange_banner', { stack: 16 })
	export const MAGENTA_BANNER = register('magenta_banner', { stack: 16 })
	export const LIGHT_BLUE_BANNER = register('light_blue_banner', { stack: 16 })
	export const YELLOW_BANNER = register('yellow_banner', { stack: 16 })
	export const LIME_BANNER = register('lime_banner', { stack: 16 })
	export const PINK_BANNER = register('pink_banner', { stack: 16 })
	export const GRAY_BANNER = register('gray_banner', { stack: 16 })
	export const LIGHT_GRAY_BANNER = register('light_gray_banner', { stack: 16 })
	export const CYAN_BANNER = register('cyan_banner', { stack: 16 })
	export const PURPLE_BANNER = register('purple_banner', { stack: 16 })
	export const BLUE_BANNER = register('blue_banner', { stack: 16 })
	export const BROWN_BANNER = register('brown_banner', { stack: 16 })
	export const GREEN_BANNER = register('green_banner', { stack: 16 })
	export const RED_BANNER = register('red_banner', { stack: 16 })
	export const BLACK_BANNER = register('black_banner', { stack: 16 })
	export const END_CRYSTAL = register('end_crystal', { rarity: 'rare' })
	export const CHORUS_FRUIT = register('chorus_fruit', food(4, 0.3, { canAlwaysEat: true }))
	export const BEETROOT = register('beetroot', food(1, 0.6))
	export const BEETROOT_SOUP = register('beetroot_soup', { stack: 1, ...food(6, 0.6) })
	export const DRAGON_BREATH = register('dragon_breath', { rarity: 'uncommon', craftRemainder: GLASS_BOTTLE })
	export const SPLASH_POTION = register('splash_potion', { stack: 1 })
	export const LINGERING_POTION = register('lingering_potion', { stack: 1 })
	export const SHIELD = register('shield', { stack: 1, durability: 336 })
	export const TOTEM_OF_UNDYING = register('totem_of_undying', { rarity: 'uncommon', stack: 1 })
	export const KNOWLEDGE_BOOK = register('knowledge_book', { rarity: 'epic', stack: 1 })
	export const DEBUG_STICK = register('debug_stick', { rarity: 'epic', stack: 1 })
	export const MUSIC_DISC_13 = register('music_disc_13', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_CAT = register('music_disc_cat', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_BLOCKS = register('music_disc_blocks', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_CHIRP = register('music_disc_chirp', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_FAR = register('music_disc_far', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_MALL = register('music_disc_mall', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_MELLOHI = register('music_disc_mellohi', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_STAL = register('music_disc_stal', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_STRAD = register('music_disc_strad', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_WARD = register('music_disc_ward', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_11 = register('music_disc_11', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_WAIT = register('music_disc_wait', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_OTHERSIDE = register('music_disc_otherside', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_5 = register('music_disc_5', { rarity: 'rare', stack: 1 })
	export const MUSIC_DISC_PIGSTEP = register('music_disc_pigstep', { rarity: 'rare', stack: 1 })
	export const TRIDENT = register('trident', { stack: 1, durability: 250, enchantmentValue: 1 })
	export const HEART_OF_THE_SEA = register('heart_of_the_sea', { rarity: 'uncommon' })
	export const CROSSBOW = register('crossbow', { stack: 1, durability: 465, enchantmentValue: 1 })
	export const SUSPICIOUS_STEW = register('suspicious_stew', { stack: 1, ...food(6, 0.6, { canAlwaysEat: true }) })
	export const FLOWER_BANNER_PATTERN = register('flower_banner_pattern', { stack: 1 })
	export const CREEPER_BANNER_PATTERN = register('creeper_banner_pattern', { rarity: 'uncommon', stack: 1 })
	export const SKULL_BANNER_PATTERN = register('skull_banner_pattern', { rarity: 'uncommon', stack: 1 })
	export const MOJANG_BANNER_PATTERN = register('mojang_banner_pattern', { rarity: 'epic', stack: 1 })
	export const GLOBE_BANNER_PATTERN = register('globe_banner_pattern', { stack: 1 })
	export const PIGLIN_BANNER_PATTERN = register('piglin_banner_pattern', { stack: 1 })
	export const GOAT_HORN = register('goat_horn', { stack: 1 })
	export const SWEET_BERRIES = register('sweet_berries', food(2, 0.1))
	export const GLOW_BERRIES = register('glow_berries', food(2, 0.1))
	export const HONEY_BOTTLE = register('honey_bottle', { stack: 16, craftRemainder: GLASS_BOTTLE, ...food(6, 0.1) })
}
