import { clamp } from '../math/index.js'
import { intToRGB } from './Util.js'

const grass = [124 / 255, 189 / 255, 107 / 255]
const spruce = intToRGB(6396257)
const birch = intToRGB(8431445)
const foliage = intToRGB(4764952)
const water = intToRGB(4159204)
const attached_stem = intToRGB(8431445)
const lily_pad = intToRGB(2129968)

const redstone = (power: number) => {
	const a = power / 15
	const r = a * 0.6 + (a > 0 ? 0.4 : 0.3)
	const g = clamp(a * a * 0.7 - 0.5, 0, 1)
	const b = clamp(a * a * 0.6 - 0.7, 0, 1)
	return [r, g, b]
}

const stem = (age: number) => {
	return [age / 8, 1 - age / 32, age * 64]
}

export const BlockColors: {
	[key: string]: (props: { [key: string]: string }) => number[],
} = {
	large_fern: () => grass,
	tall_grass: () => grass,
	grass_block: () => grass,
	fern: () => grass,
	grass: () => grass,
	potted_fern: () => grass,
	spruce_leaves: () => spruce,
	birch_leaves: () => birch,
	oak_leaves: () => foliage,
	jungle_leaves: () => foliage,
	acacia_leaves: () => foliage,
	dark_oak_leaves: () => foliage,
	vine: () => foliage,
	mangrove_leaves: () => foliage,
	water: () => water,
	bubble_column: () => water,
	cauldron: () => water, // this is removed in versions since 20w45a
	water_cauldron: () => water,
	redstone_wire: (props) => redstone(parseInt(props['power'] ?? '0')),
	sugar_cane: () => grass,
	attached_melon_stem: () => attached_stem,
	attached_pumpkin_stem: () => attached_stem,
	melon_stem: (props) => stem(parseInt(props['age'] ?? '0')),
	pumpkin_stem: (props) => stem(parseInt(props['age'] ?? '0')),
	lily_pad: () => lily_pad,
}
