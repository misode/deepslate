export enum AttributeModifierOperation {
	addition,
	multiply_base,
	multiply_total,
}

export interface AttributeModifier {
	readonly amount: number
	readonly operation: AttributeModifierOperation
}
