import type { Color } from '../../util/index.js'
import { intToRgb } from '../../util/index.js'
import { Identifier } from '../Identifier.js'
import { Registry } from '../Registry.js'
import type { Attribute } from './Attribute.js'
import { Attributes } from './Attribute.js'
import type { AttributeModifier } from './AttributeModifier.js'
import { AttributeModifierOperation } from './AttributeModifier.js'

export type MobEffectCategory = 'beneficial' | 'harmful' | 'neutral'

export interface MobEffect {
	readonly index: number
	readonly id: Identifier
	readonly category: MobEffectCategory
	readonly color: Color
	readonly modifiers: Map<Attribute, AttributeModifier>
}

export namespace MobEffect {
	export function fromId(n: number) {
		return idMap.get(n)
	}
}

const registry = new Registry<MobEffect>(Identifier.create('mob_effect'))
Registry.REGISTRY.register(registry.key, registry)
const idMap = new Map<number, MobEffect>()

function register(n: number, id: string, category: MobEffectCategory, color: Color | number, modifiers: Map<Attribute, AttributeModifier> = new Map()) {
	const mobEffect: MobEffect = {
		index: n,
		id: Identifier.create(id),
		category,
		color: typeof color === 'number' ? intToRgb(color) : color,
		modifiers,
	}
	idMap.set(n, mobEffect)
	registry.register(mobEffect.id, mobEffect, true)
	return mobEffect
}

export namespace MobEffects {
	export const SPEED = register(1, 'speed', 'beneficial', 8171462, new Map([
		[Attributes.MOVEMENT_SPEED, { amount: 0.2, operation: AttributeModifierOperation.multiply_total }],
	]))
	export const SLOWNESS = register(2, 'slowness', 'harmful', 5926017, new Map([
		[Attributes.MOVEMENT_SPEED, { amount: -0.15, operation: AttributeModifierOperation.multiply_total }],
	]))
	export const HASTE = register(3, 'haste', 'beneficial', 14270531, new Map([
		[Attributes.ATTACK_SPEED, { amount: 0.1, operation: AttributeModifierOperation.multiply_total }],
	]))
	export const MINING_FATIGUE = register(4, 'mining_fatigue', 'harmful', 4866583, new Map([
		[Attributes.ATTACK_SPEED, { amount: -0.1, operation: AttributeModifierOperation.multiply_total }],
	]))
	export const STRENGTH = register(5, 'strength', 'beneficial', 9643043, new Map([
		[Attributes.ATTACK_DAMAGE, { amount: 3, operation: AttributeModifierOperation.addition }],
	]))
	export const INSTANT_HEALTH = register(6, 'instant_health', 'beneficial', 16262179)
	export const INSTANT_DAMAGE = register(7, 'instant_damage', 'harmful', 4393481)
	export const JUMP_BOOST = register(8, 'jump_boost', 'beneficial', 2293580)
	export const NAUSEA = register(9, 'nausea', 'harmful', 5578058)
	export const REGENERATION = register(10, 'regeneration', 'beneficial', 13458603)
	export const RESISTANCE = register(11, 'resistance', 'beneficial', 10044730)
	export const FIRE_RESISTANCE = register(12, 'fire_resistance', 'beneficial', 14981690)
	export const WATER_BREATHING = register(13, 'water_breathing', 'beneficial', 3035801)
	export const INVISIBILITY = register(14, 'invisibility', 'beneficial', 8356754)
	export const BLINDNESS = register(15, 'blindness', 'harmful', 2039587)
	export const NIGHT_VISION = register(16, 'night_vision', 'beneficial', 2039713)
	export const HUNGER = register(17, 'hunger', 'harmful', 5797459)
	export const WEAKNESS = register(18, 'weakness', 'harmful', 4738376, new Map([
		[Attributes.ATTACK_DAMAGE, { amount: -4, operation: AttributeModifierOperation.addition }],
	]))
	export const POISON = register(19, 'poison', 'harmful', 5149489)
	export const WITHER = register(20, 'wither', 'harmful', 3484199)
	export const HEALTH_BOOST = register(21, 'health_boost', 'beneficial', 16284963, new Map([
		[Attributes.MAX_HEALTH, { amount: 4, operation: AttributeModifierOperation.addition }],
	]))
	export const ABSORPTION = register(22, 'absorption', 'beneficial', 2445989)
	export const SATURATION = register(23, 'saturation', 'beneficial', 16262179)
	export const GLOWING = register(24, 'glowing', 'neutral', 9740385)
	export const LEVITATION = register(25, 'levitation', 'harmful', 13565951)
	export const LUCK = register(26, 'luck', 'beneficial', 3381504,new Map([
		[Attributes.LUCK, { amount: 1, operation: AttributeModifierOperation.addition }],
	]))
	export const UNLUCK = register(27, 'unluck', 'harmful', 12624973,new Map([
		[Attributes.LUCK, { amount: -1, operation: AttributeModifierOperation.addition }],
	]))
	export const SLOW_FALLING = register(28, 'slow_falling', 'beneficial', 16773073)
	export const CONDUIT_POWER = register(29, 'conduit_power', 'beneficial', 1950417)
	export const DOLPHINS_GRACE = register(30, 'dolphins_grace', 'beneficial', 8954814)
	export const BAD_OMEN = register(31, 'bad_omen', 'neutral', 745784)
	export const HERO_OF_THE_VILLAGE = register(32, 'hero_of_the_village', 'beneficial', 4521796)
	export const DARKNESS = register(33, 'darkness', 'harmful', 2696993)
}
