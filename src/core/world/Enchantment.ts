import { Identifier } from '../Identifier.js'
import type { ItemStack } from '../ItemStack.js'
import { Registry } from '../Registry.js'
import type { Item } from './Item.js'

export type EnchantmentRarity = 'common' | 'uncommon' | 'rare' | 'very_rare'

export type EnchantmentCategory = 'armor' | 'armor_feet' | 'armor_legs' | 'armor_chest' | 'armor_head' | 'weapon' | 'digger' | 'fishing_rod' | 'trident' | 'breakable' | 'bow' | 'wearable' | 'crossbow' | 'vanishable'

export interface Enchantment {
	readonly id: Identifier
	readonly rarity: EnchantmentRarity
	readonly category: EnchantmentCategory
	readonly isDiscoverable: boolean
	readonly isTradeable: boolean
	readonly isTreasure: boolean
	readonly isCurse: boolean
	readonly minLevel: number
	readonly maxLevel: number
	readonly minCost: (lvl: number) => number
	readonly maxCost: (lvl: number) => number
	readonly _isCompatible: (other: Enchantment) => boolean
	readonly _canEnchant: (item: ItemStack, next: () => boolean) => boolean
}

const registry = new Registry<Enchantment>(Identifier.create('enchantment'))
Registry.REGISTRY.register(registry.key, registry)

export namespace Enchantment {
	export const REGISTRY = registry

	export function isCompatible(a: Enchantment, b: Enchantment) {
		return a !== b && a._isCompatible(b) && b._isCompatible(a)
	}

	export function canEnchant(item: ItemStack, ench: Enchantment) {
		return ench._canEnchant(item, () => ENCHANTMENT_CATEGORIES.get(ench.category)?.(item.getItem()) ?? false)
	}
}

function register(id: string, rarity: EnchantmentRarity, category: EnchantmentCategory, props: Partial<Omit<Enchantment, 'id' | 'rarity' | 'category'>>) {
	const enchantment: Enchantment = {
		id: Identifier.create(id),
		rarity,
		category,
		isDiscoverable: true,
		isTradeable: true,
		isTreasure: false,
		isCurse: false,
		minLevel: 1,
		maxLevel: 1,
		minCost(lvl) { return 1 + lvl * 10 },
		maxCost(lvl) { return this.minCost(lvl) + 5 },
		_isCompatible() { return true },
		_canEnchant(_, next) { return next() },
		...props,
	}
	registry.register(enchantment.id, enchantment, true)
	return enchantment
}

export namespace Enchantments {
	export const PROTECTION = register('protection', 'common', 'armor', {
		maxLevel: 4,
		minCost: lvl => 1 + (lvl - 1) * 11,
		maxCost: lvl => 1 + (lvl - 1) * 11 + 11,
		_isCompatible: other => !PROTECTION_ENCHANTS.has(other),
	})
	export const FIRE_PROTECTION = register('fire_protection', 'uncommon', 'armor', {
		maxLevel: 4,
		minCost: lvl => 10 + (lvl - 1) * 8,
		maxCost: lvl => 10 + (lvl - 1) * 8 + 8,
		_isCompatible: other => !PROTECTION_ENCHANTS.has(other),
	})
	export const FEATHER_FALLING = register('feather_falling', 'uncommon', 'armor_feet', {
		maxLevel: 4,
		minCost: lvl => 5 + (lvl - 1) * 6,
		maxCost: lvl => 5 + (lvl - 1) * 6 + 6,
	})
	export const BLAST_PROTECTION = register('blast_protection', 'rare', 'armor', {
		maxLevel: 4,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 5 + (lvl - 1) * 8 + 8,
		_isCompatible: other => !PROTECTION_ENCHANTS.has(other),
	})
	export const PROJECTILE_PROTECTION = register('projectile_protection', 'uncommon', 'armor', {
		maxLevel: 4,
		minCost: lvl => 3 + (lvl - 1) * 6,
		maxCost: lvl => 3 + (lvl - 1) * 6 + 6,
		_isCompatible: other => !PROTECTION_ENCHANTS.has(other),
	})
	export const RESPIRATION = register('respiration', 'rare', 'armor_head', {
		maxLevel: 3,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 30,
	})
	export const AQUA_AFFINITY = register('aqua_affinity', 'rare', 'armor_head', {
		minCost: () => 1,
		maxCost: () => 40,
	})
	export const THORNS = register('thorns', 'very_rare', 'armor_chest', {
		maxLevel: 3,
		minCost: lvl => 10 + 20 * (lvl - 1),
		maxCost: lvl => 10 + 20 * (lvl - 1) + 50,
	})
	export const DEPTH_STRIDER = register('depth_strider', 'rare', 'armor_feet', {
		maxLevel: 3,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 15,
		_isCompatible: other => other !== FROST_WALKER,
	})
	export const FROST_WALKER = register('frost_walker', 'rare', 'armor_feet', {
		isTreasure: true,
		maxLevel: 2,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 15,
		_isCompatible: other => other !== DEPTH_STRIDER,
	})
	export const BINDING_CURSE = register('binding_curse', 'very_rare', 'wearable', {
		isTreasure: true,
		isCurse: true,
		minCost: () => 25,
		maxCost: () => 50,
	})
	export const SOUL_SPEED = register('soul_speed', 'very_rare', 'armor_feet', {
		isDiscoverable: false,
		isTradeable: false,
		isTreasure: true,
		maxLevel: 3,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 15,
	})
	export const SWIFT_SNEAK = register('swift_sneak', 'very_rare', 'armor_legs', {
		isDiscoverable: false,
		isTradeable: false,
		isTreasure: true,
		maxLevel: 3,
		minCost: lvl => 25 * lvl,
		maxCost: lvl => 25 * lvl + 50,
	})
	export const SHARPNESS = register('sharpness', 'common', 'weapon', {
		maxLevel: 5,
		minCost: lvl => 1 + (lvl - 1) * 11,
		maxCost: lvl => 1 + (lvl - 1) * 11 + 20,
		_isCompatible: other => !DAMAGE_ENCHANTS.has(other),
		_canEnchant: (item, next) => item.getItem().tiered?.isAxe || next(),
	})
	export const SMITE = register('smite', 'common', 'weapon', {
		maxLevel: 5,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 5 + (lvl - 1) * 8 + 20,
		_isCompatible: other => !DAMAGE_ENCHANTS.has(other),
		_canEnchant: (item, next) => item.getItem().tiered?.isAxe || next(),
	})
	export const BANE_OF_ARTHROPODS = register('bane_of_arthropods', 'common', 'weapon', {
		maxLevel: 5,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 5 + (lvl - 1) * 8 + 20,
		_isCompatible: other => !DAMAGE_ENCHANTS.has(other),
		_canEnchant: (item, next) => item.getItem().tiered?.isAxe || next(),
	})
	export const KNOCKBACK = register('knockback', 'uncommon', 'weapon', {
		maxLevel: 2,
		minCost: lvl => 5 + 20 * (lvl - 1),
		maxCost: lvl => 1 + lvl * 10 + 50,
	})
	export const FIRE_ASPECT = register('fire_aspect', 'rare', 'weapon', {
		maxLevel: 2,
		minCost: lvl => 5 + 20 * (lvl - 1),
		maxCost: lvl => 1 + lvl * 10 + 50,
	})
	export const LOOTING = register('looting', 'rare', 'weapon', {
		maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50,
		_isCompatible: other => other !== SILK_TOUCH,
	})
	export const SWEEPING = register('sweeping', 'rare', 'weapon', {
		maxLevel: 3,
		minCost: lvl => 5 + (lvl - 1) * 9,
		maxCost: lvl => 5 + (lvl - 1) * 9 + 15,
	})
	export const EFFICIENCY = register('efficiency', 'common', 'digger', {
		maxLevel: 5,
		minCost: lvl => 1 + 10 * (lvl - 1),
		maxCost: lvl => 1 + lvl * 10 + 50,
		_canEnchant: (item, next) => item.is('shears') || next(),
	})
	export const SILK_TOUCH = register('silk_touch', 'very_rare', 'digger', {
		minCost: () => 15,
		maxCost: lvl => 1 + lvl * 10 + 50,
		_isCompatible: other => other !== FORTUNE,
	})
	export const UNBREAKING = register('unbreaking', 'uncommon', 'breakable', {
		maxLevel: 3,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 1 + lvl * 10 + 50,
		_canEnchant: (item, next) => next() && !item.tag.getBoolean('Unbreakable'),
	})
	export const FORTUNE = register('fortune', 'rare', 'digger', {
		maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50,
		_isCompatible: other => other !== SILK_TOUCH,
	})
	export const POWER = register('power', 'common', 'bow', {
		maxLevel: 5,
		minCost: lvl => 1 + (lvl - 1) * 10,
		maxCost: lvl => 1 + (lvl - 1) * 10 + 15,
	})
	export const PUNCH = register('punch', 'rare', 'bow', {
		maxLevel: 2,
		minCost: lvl => 12 + (lvl - 1) * 20,
		maxCost: lvl => 12 + (lvl - 1) * 20 + 25,
	})
	export const FLAME = register('flame', 'rare', 'bow', {
		minCost: () => 20,
		maxCost: () => 50,
	})
	export const INFINITY = register('infinity', 'very_rare', 'bow', {
		minCost: () => 20,
		maxCost: () => 50,
		_isCompatible: other => other !== MENDING,
	})
	export const LUCK_OF_THE_SEA = register('luck_of_the_sea', 'rare', 'fishing_rod', {
		maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50,
		_isCompatible: other => other !== SILK_TOUCH,
	})
	export const LURE = register('lure', 'rare', 'fishing_rod', {
		maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50,
	})
	export const LOYALTY = register('loyalty', 'uncommon', 'trident', {
		maxLevel: 3,
		minCost: lvl => 5 + lvl * 7,
		maxCost: () => 50,
	})
	export const IMPALING = register('impaling', 'rare', 'trident', {
		maxLevel: 5,
		minCost: lvl => 1 + (lvl - 1) * 8,
		maxCost: lvl => 1 + (lvl - 1) * 8 + 20,
	})
	export const RIPTIDE = register('riptide', 'rare', 'trident', {
		maxLevel: 3,
		minCost: lvl => 5 + lvl * 7,
		maxCost: () => 50,
		_isCompatible: other => other !== RIPTIDE && other !== CHANNELING,
	})
	export const CHANNELING = register('channeling', 'very_rare', 'trident', {
		minCost: () => 25,
		maxCost: () => 50,
	})
	export const MULTISHOT = register('multishot', 'rare', 'crossbow', {
		minCost: () => 20,
		maxCost: () => 50,
		_isCompatible: other => other !== PIERCING,
	})
	export const QUICK_CHARGE = register('quick_charge', 'uncommon', 'crossbow', {
		maxLevel: 3,
		minCost: lvl => 12 + (lvl - 1) * 20,
		maxCost: () => 50,
	})
	export const PIERCING = register('piercing', 'common', 'crossbow', {
		maxLevel: 4,
		minCost: lvl => 1 + (lvl - 1) * 10,
		maxCost: () => 50,
		_isCompatible: other => other !== MULTISHOT,
	})
	export const MENDING = register('mending', 'rare', 'breakable', {
		isTreasure: true,
		minCost: lvl => lvl * 25,
		maxCost: lvl => lvl * 25 + 50,
	})
	export const VANISHING_CURSE = register('vanishing_curse', 'very_rare', 'vanishable', {
		isTreasure: true,
		isCurse: true,
		minCost: () => 25,
		maxCost: () => 50,
	})

	const PROTECTION_ENCHANTS = new Set([PROTECTION, FIRE_PROTECTION, BLAST_PROTECTION, PROJECTILE_PROTECTION])
	const DAMAGE_ENCHANTS = new Set([SHARPNESS, SMITE, BANE_OF_ARTHROPODS])
}

const ENCHANTMENT_CATEGORIES = new Map(Object.entries<(item: Item) => boolean>({
	armor: item => item.armor !== undefined,
	armor_feet: item => item.armor?.slot === 'feet',
	armor_legs: item => item.armor?.slot === 'legs',
	armor_chest: item => item.armor?.slot === 'chest',
	armor_head: item => item.armor?.slot === 'head',
	weapon: item => item.tiered?.isWeapon === true,
	digger: item => item.tiered?.isDigger === true,
	fishing_rod: item => item.id.path === 'fishing_rod',
	trident: item => item.id.path === 'trident',
	breakable: item => item.durability !== undefined,
	bow: item => item.id.path === 'bow',
	wearable: item => item.wearable === true,
	crossbow: item => item.id.path === 'crossbow',
	vanishable: item => item.vanishable === true,
}))
