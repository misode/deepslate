import type { ItemStack } from '../core/index.js'
import { Identifier } from '../core/index.js'
import type { NbtCompound } from '../nbt/index.js'
import { NbtType } from '../nbt/index.js'
import { BlockColors } from './BlockColors.js'
import { intToRGB } from './Util.js'

type Tint = number[] | ((index: number) => number[])
const ItemColors = new Map<string, (item: ItemStack) => Tint>()

export function getItemColor(item: ItemStack): Tint {
	if (item.id.namespace !== Identifier.DEFAULT_NAMESPACE) return [1, 1, 1]
	const tint = ItemColors.get(item.id.path)
	return tint ? tint(item) : [1, 1, 1]
}

function register(items: string[], fn: (item: ItemStack) => Tint) {
	for (const item of items) {
		ItemColors.set(item, fn)
	}
}

register([
	'leather_helmet',
	'leather_chestplate',
	'leather_leggings',
	'leather_boots',
	'leather_horse_armor',
], ({ tag }) => {
	const display = tag.getCompound('display')
	const color = intToRGB(display.hasNumber('color') ? display.getNumber('color') : 10511680)
	return (index: number) => index > 0 ? [1, 1, 1] : color
})

const grass = [124 / 255, 189 / 255, 107 / 255]
register([
	'tall_grass',
	'large_fern',
], () => grass)

register([
	'firework_star',
], ({ tag }) => {
	const color = (() => {
		const explosion = tag.getCompound('Explosion')
		const colors = explosion.get('Colors')
		if (!colors?.isIntArray() || colors.length === 0) {
			return intToRGB(9079434)
		}
		if (colors.length === 1) {
			return intToRGB(colors.get(0)!.getAsNumber())
		}
		let [r, g, b] = [0, 0, 0]
		for (const color of colors.getItems()) {
			r += (color.getAsNumber() & 0xFF0000) >> 16
			g += (color.getAsNumber() & 0xFF00) >> 8
			b += (color.getAsNumber() & 0xFF) >> 0
		}
		r /= colors.length
		g /= colors.length
		b /= colors.length
		return [r, g, b]
	})()
	return (index: number) => index !== 1 ? [1, 1, 1] : color
})

const MobEffects: [number, string, number][] = [
	[1, 'speed', 8171462],
	[2, 'slowness', 5926017],
	[3, 'haste', 14270531],
	[4, 'mining_fatigue', 4866583],
	[5, 'strength', 9643043],
	[6, 'instant_health', 16262179],
	[7, 'instant_damage', 4393481],
	[8, 'jump_boost', 2293580],
	[9, 'nausea', 5578058],
	[10, 'regeneration', 13458603],
	[11, 'resistance', 10044730],
	[12, 'fire_resistance', 14981690],
	[13, 'water_breathing', 3035801],
	[14, 'invisibility', 8356754],
	[15, 'blindness', 2039587],
	[16, 'night_vision', 2039713],
	[17, 'hunger', 5797459],
	[18, 'weakness', 4738376],
	[19, 'poison', 5149489],
	[20, 'wither', 3484199],
	[21, 'health_boost', 16284963],
	[22, 'absorption', 2445989],
	[23, 'saturation', 16262179],
	[24, 'glowing', 9740385],
	[25, 'levitation', 13565951],
	[26, 'luck', 3381504],
	[27, 'unluck', 12624973],
	[28, 'slow_falling', 16773073],
	[29, 'conduit_power', 1950417],
	[30, 'dolphins_grace', 8954814],
	[31, 'bad_omen', 745784],
	[32, 'hero_of_the_village', 4521796],
	[33, 'darkness', 2696993],
]

function getPotionColor(tag: NbtCompound) {
	if (tag.hasNumber('CustomPotionColor')) {
		return intToRGB(tag.getNumber('CustomPotionColor'))
	}
	if (tag.size === 0) {
		return intToRGB(16253176)
	}
	const effects: { id: string, amplifier: number }[] = []
	let id = tag.getString('Potion')
	let strong = false
	if (id.startsWith('minecraft:')) {
		id = id.slice('minecraft:'.length)
	}
	if (id.startsWith('long_')) {
		id = id.slice('long_'.length)
	} else if (id.startsWith('strong_')) {
		id = id.slice('strong_'.length)
		strong = true
	}
	if (id === 'turtle_master') {
		effects.push(
			{ id: 'slowness', amplifier: strong ? 5 : 3 },
			{ id: 'resistance', amplifier: strong ? 3 : 2 },
		)
	} else {
		const amplifier = strong ? (id === 'slowness' ? 3 : 1) : 0
		effects.push({ id, amplifier })
	}
	tag.getList('CustomPotionEffects', NbtType.Compound).forEach(entry => {
		const numId = entry.getNumber('Id')
		const id = MobEffects.find(p => p[0] === numId)?.[1]
		if (id) {
			const amplifier = entry.getNumber('Amplifier')
			const visible = !entry.has('ShowParticles') || entry.getBoolean('ShowParticles')
			if (visible) {
				effects.push({ id, amplifier })
			}
		}
	})
	let [r, g, b] = [0, 0, 0]
	let total = 0
	for (const effect of effects) {
		const amplifier = effect.amplifier + 1
		const color = MobEffects.find(p => p[1] === effect.id)?.[2]
		if (color === undefined) continue
		r += (amplifier * (color >> 16 & 0xFF)) / 255
		g += (amplifier * (color >> 8 & 0xFF)) / 255
		b += (amplifier * (color >> 0 & 0xFF)) / 255
		total += amplifier
	}
	if (total === 0) {
		return intToRGB(0)
	}
	r = r / total
	g = g / total
	b = b / total
	return [r, g, b]
}

register([
	'potion',
	'splash_potion',
	'lingering_potion',
], ({ tag }) => {
	const color = getPotionColor(tag)
	return (index: number) => index > 0 ? [1, 1, 1] : color
})

const SpawnEggs: [string, number, number][] = [
	['allay', 56063, 44543],
	['axolotl', 16499171, 10890612],
	['bat', 4996656, 986895],
	['bee', 15582019, 4400155],
	['blaze', 16167425, 16775294],
	['cat', 15714446, 9794134],
	['camel', 16565097, 13341495],
	['cave_spider', 803406, 11013646],
	['chicken', 10592673, 16711680],
	['cod', 12691306, 15058059],
	['cow', 4470310, 10592673],
	['creeper', 894731, 0],
	['dolphin', 2243405, 16382457],
	['donkey', 5457209, 8811878],
	['drowned', 9433559, 7969893],
	['elder_guardian', 13552826, 7632531],
	['ender_dragon', 1842204, 14711290],
	['enderman', 1447446, 0],
	['endermite', 1447446, 7237230],
	['evoker', 9804699, 1973274],
	['fox', 14005919, 13396256],
	['frog', 13661252, 16762748],
	['ghast', 16382457, 12369084],
	['glow_squid', 611926, 8778172],
	['goat', 10851452, 5589310],
	['guardian', 5931634, 15826224],
	['hoglin', 13004373, 6251620],
	['horse', 12623485, 15656192],
	['husk', 7958625, 15125652],
	['iron_golem', 14405058, 7643954],
	['llama', 12623485, 10051392],
	['magma_cube', 3407872, 16579584],
	['mooshroom', 10489616, 12040119],
	['mule', 1769984, 5321501],
	['ocelot', 15720061, 5653556],
	['panda', 15198183, 1776418],
	['parrot', 894731, 16711680],
	['phantom', 4411786, 8978176],
	['pig', 15771042, 14377823],
	['piglin', 10051392, 16380836],
	['piglin_brute', 5843472, 16380836],
	['pillager', 5451574, 9804699],
	['polar_bear', 15658718, 14014157],
	['pufferfish', 16167425, 3654642],
	['rabbit', 10051392, 7555121],
	['ravager', 7697520, 5984329],
	['salmon', 10489616, 951412],
	['sheep', 15198183, 16758197],
	['shulker', 9725844, 5060690],
	['silverfish', 7237230, 3158064],
	['skeleton', 12698049, 4802889],
	['skeleton_horse', 6842447, 15066584],
	['slime', 5349438, 8306542],
	['snow_golem', 14283506, 8496292],
	['spider', 3419431, 11013646],
	['squid', 2243405, 7375001],
	['stray', 6387319, 14543594],
	['strider', 10236982, 5065037],
	['tadpole', 7164733, 1444352],
	['trader_llama', 15377456, 4547222],
	['tropical_fish', 15690005, 16775663],
	['turtle', 15198183, 44975],
	['vex', 8032420, 15265265],
	['villager', 5651507, 12422002],
	['vindicator', 9804699, 2580065],
	['wandering_trader', 4547222, 15377456],
	['warden', 1001033, 3790560],
	['witch', 3407872, 5349438],
	['wither', 1315860, 5075616],
	['wither_skeleton', 1315860, 4672845],
	['wolf', 14144467, 13545366],
	['zoglin', 13004373, 15132390],
	['zombie', 44975, 7969893],
	['zombie_horse', 3232308, 9945732],
	['zombie_villager', 5651507, 7969893],
	['zombified_piglin', 15373203, 5009705],
]

for (const egg of SpawnEggs) {
	register([`${egg[0]}_spawn_egg`], () => {
		return (index: number) => intToRGB(index === 0 ? egg[1] : egg[2])
	})
}

for (const id of [
	'grass_block',
	'grass',
	'fern',
	'vine',
	'oak_leaves',
	'spruce_leaves',
	'birch_leaves',
	'jungle_leaves',
	'acacia_leaves',
	'dark_oak_leaves',
	'lily_pad',
]) {
	const color = BlockColors[id]({})
	register([id], () => color)
}

register([
	'mangrove_leaves',
], () => intToRGB(9619016))

register([
	'tipped_arrow',
], ({ tag }) => {
	const color = getPotionColor(tag)
	return (index: number) => index === 0 ? color : [1, 1, 1]
})

register([
	'filled_map',
], ({ tag }) => {
	const display = tag.getCompound('display')
	const color = intToRGB(display.hasNumber('MapColor')
		? (0xFF000000 | display.getNumber('MapColor') & 16777215)
		: -12173266)
	return (index: number) => index === 0 ? [1, 1, 1] : color
})
