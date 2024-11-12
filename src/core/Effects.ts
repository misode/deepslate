import type { NbtCompound, NbtTag } from '../nbt/index.js'
import { NbtType } from '../nbt/index.js'
import { Color } from '../util/index.js'
import { Identifier } from './Identifier.js'

export const EFFECT_COLORS = new Map<string, number>([
	['minecraft:speed', 3402751],
	['minecraft:slowness', 9154528],
	['minecraft:haste', 14270531],
	['minecraft:mining_fatigue', 4866583],
	['minecraft:strength', 16762624],
	['minecraft:instant_health', 16262179],
	['minecraft:instant_damage', 11101546],
	['minecraft:jump_boost', 16646020],
	['minecraft:nausea', 5578058],
	['minecraft:regeneration', 13458603],
	['minecraft:resistance', 9520880],
	['minecraft:fire_resistance', 16750848],
	['minecraft:water_breathing', 10017472],
	['minecraft:invisibility', 16185078],
	['minecraft:blindness', 2039587],
	['minecraft:night_vision', 12779366],
	['minecraft:hunger', 5797459],
	['minecraft:weakness', 4738376],
	['minecraft:poison', 8889187],
	['minecraft:wither', 7561558],
	['minecraft:health_boost', 16284963],
	['minecraft:absorption', 2445989],
	['minecraft:saturation', 16262179],
	['minecraft:glowing', 9740385],
	['minecraft:levitation', 13565951],
	['minecraft:luck', 5882118],
	['minecraft:unluck', 12624973],
	['minecraft:slow_falling', 15978425],
	['minecraft:conduit_power', 1950417],
	['minecraft:dolphins_grace', 8954814],
	['minecraft:bad_omen', 745784],
	['minecraft:hero_of_the_village', 4521796],
	['minecraft:darkness', 2696993],
	['minecraft:trial_omen', 1484454],
	['minecraft:raid_omen', 14565464],
	['minecraft:wind_charged', 12438015],
	['minecraft:weaving', 7891290],
	['minecraft:oozing', 10092451],
	['minecraft:infested', 9214860],
])

export type MobEffectInstance = {
	effect: Identifier,
	duration: number,
	amplifier: number,
}

export namespace MobEffectInstance {
	export function fromNbt(tag: NbtCompound): MobEffectInstance {
		return {
			effect: Identifier.parse(tag.getString('id')),
			duration: tag.getNumber('duration'),
			amplifier: tag.getNumber('amplifier'),
		}
	}
}

export const POTION_EFFECTS = new Map<string, MobEffectInstance[]>([
	['minecraft:empty', []],
	['minecraft:water', []],
	['minecraft:mundane', []],
	['minecraft:thick', []],
	['minecraft:awkward', []],
	['minecraft:night_vision', [{ effect: Identifier.create('night_vision'), duration: 3600, amplifier: 0 }]],
	['minecraft:long_night_vision', [{ effect: Identifier.create('night_vision'), duration: 9600, amplifier: 0 }]],
	['minecraft:invisibility', [{ effect: Identifier.create('invisibility'), duration: 3600, amplifier: 0 }]],
	['minecraft:long_invisibility', [{ effect: Identifier.create('invisibility'), duration: 9600, amplifier: 0 }]],
	['minecraft:leaping', [{ effect: Identifier.create('jump_boost'), duration: 3600, amplifier: 0 }]],
	['minecraft:long_leaping', [{ effect: Identifier.create('jump_boost'), duration: 9600, amplifier: 0 }]],
	['minecraft:strong_leaping', [{ effect: Identifier.create('jump_boost'), duration: 1800, amplifier: 1 }]],
	['minecraft:fire_resistance', [{ effect: Identifier.create('fire_resistance'), duration: 3600, amplifier: 0 }]],
	['minecraft:long_fire_resistance', [{ effect: Identifier.create('fire_resistance'), duration: 9600, amplifier: 0 }]],
	['minecraft:swiftness', [{ effect: Identifier.create('speed'), duration: 3600, amplifier: 0 }]],
	['minecraft:long_swiftness', [{ effect: Identifier.create('speed'), duration: 9600, amplifier: 0 }]],
	['minecraft:strong_swiftness', [{ effect: Identifier.create('speed'), duration: 1800, amplifier: 1 }]],
	['minecraft:slowness', [{ effect: Identifier.create('slowness'), duration: 1800, amplifier: 0 }]],
	['minecraft:long_slowness', [{ effect: Identifier.create('slowness'), duration: 4800, amplifier: 0 }]],
	['minecraft:strong_slowness', [{ effect: Identifier.create('slowness'), duration: 400, amplifier: 3 }]],
	['minecraft:turtle_master', [{ effect: Identifier.create('slowness'), duration: 400, amplifier: 3 }, { effect: Identifier.create('resistance'), duration: 400, amplifier: 2}]],
	['minecraft:long_turtle_master', [{ effect: Identifier.create('slowness'), duration: 800, amplifier: 3 }, { effect: Identifier.create('resistance'), duration: 800, amplifier: 2}]],
	['minecraft:strong_turtle_master', [{ effect: Identifier.create('slowness'), duration: 400, amplifier: 5 }, { effect: Identifier.create('resistance'), duration: 400, amplifier: 3}]],
	['minecraft:water_breathing', [{ effect: Identifier.create('water_breathing'), duration: 3600, amplifier: 0 }]],
	['minecraft:long_water_breathing', [{ effect: Identifier.create('water_breathing'), duration: 9600, amplifier: 0 }]],
	['minecraft:healing', [{ effect: Identifier.create('instant_health'), duration: 1, amplifier: 0 }]],
	['minecraft:strong_healing', [{ effect: Identifier.create('instant_health'), duration: 1, amplifier: 1 }]],
	['minecraft:harming', [{ effect: Identifier.create('instant_damage'), duration: 1, amplifier: 0 }]],
	['minecraft:strong_harming', [{ effect: Identifier.create('instant_damage'), duration: 1, amplifier: 1 }]],
	['minecraft:poison', [{ effect: Identifier.create('poison'), duration: 900, amplifier: 0 }]],
	['minecraft:long_poison', [{ effect: Identifier.create('poison'), duration: 1800, amplifier: 0 }]],
	['minecraft:strong_poison', [{ effect: Identifier.create('poison'), duration: 432, amplifier: 1 }]],
	['minecraft:regeneration', [{ effect: Identifier.create('regeneration'), duration: 900, amplifier: 0 }]],
	['minecraft:long_regeneration', [{ effect: Identifier.create('regeneration'), duration: 1800, amplifier: 0 }]],
	['minecraft:strong_regeneration', [{ effect: Identifier.create('regeneration'), duration: 450, amplifier: 1 }]],
	['minecraft:strength', [{ effect: Identifier.create('strength'), duration: 3600, amplifier: 0 }]],
	['minecraft:long_strength', [{ effect: Identifier.create('strength'), duration: 9600, amplifier: 0 }]],
	['minecraft:strong_strength', [{ effect: Identifier.create('strength'), duration: 1800, amplifier: 1 }]],
	['minecraft:weakness', [{ effect: Identifier.create('weakness'), duration: 1800, amplifier: 0 }]],
	['minecraft:long_weakness', [{ effect: Identifier.create('weakness'), duration: 4800, amplifier: 0 }]],
	['minecraft:luck', [{ effect: Identifier.create('luck'), duration: 6000, amplifier: 0 }]],
	['minecraft:slow_falling', [{ effect: Identifier.create('slow_falling'), duration: 1800, amplifier: 0 }]],
	['minecraft:long_slow_falling', [{ effect: Identifier.create('slow_falling'), duration: 4800, amplifier: 0 }]],
	['minecraft:wind_charged', [{ effect: Identifier.create('wind_charged'), duration: 3600, amplifier: 0 }]],
	['minecraft:weaving', [{ effect: Identifier.create('weaving'), duration: 3600, amplifier: 0 }]],
	['minecraft:oozing', [{ effect: Identifier.create('oozing'), duration: 3600, amplifier: 0 }]],
	['minecraft:infested', [{ effect: Identifier.create('infested'), duration: 3600, amplifier: 0 }]],
])

export type PotionContents = {
	potion?: Identifier,
	customColor?: number,
	customEffects?: MobEffectInstance[],
}

export namespace PotionContents {
	export function fromNbt(tag: NbtTag): PotionContents {
		const ans: PotionContents = {}
		if (tag.isString()) {
			ans.potion = Identifier.parse(tag.getAsString())
		} else if (tag.isCompound()) {
			if (tag.hasString('potion')) {
				ans.potion = Identifier.parse(tag.getString('potion'))
			}
			if (tag.hasNumber('custom_color')) {
				ans.customColor = tag.getNumber('custom_color')
			}
			if (tag.hasList('custom_effects')) {
				ans.customEffects = tag.getList('custom_effects', NbtType.Compound).map(MobEffectInstance.fromNbt)
			}
		}
		return ans
	}

	export function getColor(contents: PotionContents): Color {
		if (contents.customColor) {
			return Color.intToRgb(contents.customColor)
		}
		const effects = getAllEffects(contents)
		return mixEffectColors(effects)
	}
	
	export function getAllEffects(contents: PotionContents) {
		const ans: MobEffectInstance[] = []
		if (contents.potion) {
			ans.push(...POTION_EFFECTS.get(contents.potion.toString()) ?? [])
		}
		if (contents.customEffects) {
			ans.push(...contents.customEffects)
		}
		return ans
	}

	function mixEffectColors(effects: MobEffectInstance[]): Color {
		let [r, g, b] = [0, 0, 0]
		let total = 0
		for (const effect of effects) {
			const color = EFFECT_COLORS.get(effect.effect.toString())
			if (color === undefined) continue
			const rgb = Color.intToRgb(color)
			const amplifier = effect.amplifier + 1
			r += amplifier * rgb[0]
			g += amplifier * rgb[1]
			b += amplifier * rgb[2]
			total += amplifier
		}
		if (total === 0) {
			return Color.intToRgb(-13083194)
		}
		r = r / total
		g = g / total
		b = b / total
		return [r, g, b]
	}
}
