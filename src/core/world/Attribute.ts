import { Identifier } from '../Identifier.js'
import { Registry } from '../Registry.js'

export interface Attribute {
	readonly id: Identifier
	readonly defaultValue: number
	readonly minValue: number
	readonly maxValue: number
}

const registry = new Registry<Attribute>(Identifier.create('attribute'))
Registry.REGISTRY.register(registry.key, registry)

export namespace Attribute {
	export const REGISTRY = registry
}

function register(id: string, defaultValue: number, minValue: number, maxValue: number) {
	const attribute: Attribute = {
		id: Identifier.create(id),
		defaultValue,
		minValue,
		maxValue,
	}
	registry.register(attribute.id, attribute, true)
	return attribute
}

export namespace Attributes {
	export const MAX_HEALTH = register('generic.max_health', 20, 1, 1024)
	export const FOLLOW_RANGE = register('generic.follow_range', 32, 0, 2048)
	export const KNOCKBACK_RESISTANCE = register('generic.knockback_resistance', 0, 0, 1)
	export const MOVEMENT_SPEED = register('generic.movement_speed', 0.7, 0, 1024)
	export const FLYING_SPEED = register('generic.flying_speed', 0.4, 0, 1024)
	export const ATTACK_DAMAGE = register('generic.attack_damage', 2, 0, 2048)
	export const ATTACK_KNOCKBACK = register('generic.attack_knockback', 0, 0, 5)
	export const ATTACK_SPEED = register('generic.attack_speed', 4, 0, 1024)
	export const ARMOR = register('generic.armor', 0, 0, 30)
	export const ARMOR_TOUGHNESS = register('generic.armor_toughness', 0, 0, 20)
	export const LUCK = register('generic.luck', 0, -1024, 1024)
	export const SPAWN_REINFORCEMENTS = register('zombie.spawn_reinforcements', 0, 0, 1)
	export const JUMP_STRENGTH = register('generic.jump_strength', 0.7, 0, 2)
}
