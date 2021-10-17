export interface Random{
	consume(count: number): void
	nextInt(max?: number): number
	nextLong(): BigInt
	nextFloat(): number
	nextDouble(): number
}
