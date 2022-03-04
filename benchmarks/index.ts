import math from './math'

const filter = process.argv.slice(2)[0]

const suites =[
	...math,
]
for (const suite of suites) {
	const name = (suite as any).name as string
	if (filter && !name.match(filter)) continue

	suite
		.on('cycle', (e: Event) => {
			console.log(`${name}: ${e.target}`)
		})
		.run()
}
