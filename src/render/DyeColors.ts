import { Color } from '../util/index.js'

const white = Color.intToRgb(16383998)
const orange = Color.intToRgb(16351261)
const magenta = Color.intToRgb(13061821)
const light_blue = Color.intToRgb(3847130)
const yellow = Color.intToRgb(16701501)
const lime = Color.intToRgb(8439583)
const pink = Color.intToRgb(15961002)
const gray = Color.intToRgb(4673362)
const light_gray = Color.intToRgb(10329495)
const cyan = Color.intToRgb(1481884)
const purple = Color.intToRgb(8991416)
const blue = Color.intToRgb(3949738)
const brown = Color.intToRgb(8606770)
const green = Color.intToRgb(6192150)
const red = Color.intToRgb(11546150)
const black = Color.intToRgb(1908001)

export const DyeColors: {
	[key: string]: (props: { [key: string]: string }) => Color,
} = {
	white: () => white,
	orange: () => orange,
	magenta: () => magenta,
	light_blue: () => light_blue,
	yellow: () => yellow,
	lime: () => lime,
	pink: () => pink,
	gray: () => gray,
	light_gray: () => light_gray,
	cyan: () => cyan,
	purple: () => purple,
	blue: () => blue,
	brown: () => brown,
	green: () => green,
	red: () => red,
	black: () => black,
}
