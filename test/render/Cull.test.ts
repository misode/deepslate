import { expect } from 'chai'
import 'mocha'
import { Cull } from '../../src/render/Cull'

describe('Cull', () => {
	it('rotate (none)', () => {
		const cull = { up: true, down: false, north: true, east: false, south: true, west: true }
		expect(Cull.rotate(cull, 0, 0)).deep.equal(cull)
	})
	it('rotate (x)', () => {
		const cull = { up: true, down: false, north: true, east: false, south: true, west: true }
		expect(Cull.rotate(cull, 90, 0)).deep.equal(
			{ up: true, down: true, north: false, east: false, south: true, west: true }
		)
		expect(Cull.rotate(cull, 180, 0)).deep.equal(
			{ up: false, down: true, north: true, east: false, south: true, west: true }
		)
		expect(Cull.rotate(cull, 270, 0)).deep.equal(
			{ up: true, down: true, north: true, east: false, south: false, west: true }
		)
	})
	it('rotate (y)', () => {
		const cull = { up: true, down: false, north: true, east: false, south: true, west: true }
		expect(Cull.rotate(cull, 0, 90)).deep.equal(
			{ up: true, down: false, north: false, east: true, south: true, west: true }
		)
		expect(Cull.rotate(cull, 0, 180)).deep.equal(
			{ up: true, down: false, north: true, east: true, south: true, west: false }
		)
		expect(Cull.rotate(cull, 0, 270)).deep.equal(
			{ up: true, down: false, north: true, east: true, south: false, west: true }
		)
	})
})
