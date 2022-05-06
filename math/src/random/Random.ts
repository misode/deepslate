export interface Random {
	consume(count: number): void
	nextInt(max?: number): number
	nextLong(): bigint
	nextFloat(): number
	nextDouble(): number
	fork(): Random
	forkPositional(): PositionalRandom
}

export interface PositionalRandom {
	at(x: number, y: number, z: number): Random
	fromHashOf(name: string): Random
	seedKey(): [bigint, bigint]
}
