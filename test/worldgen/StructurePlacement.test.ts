import { describe, expect, it } from 'vitest'
import { Holder, StructurePlacement, StructureSet } from '../../src'


describe('StructurePlacement', () => {

	const seed = BigInt(0)

	describe('RandomSpreadStructurePlacement', () => {

		it('getPotentialStructureChunk linear', () => {
			const placement_village = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.ProbabilityReducer,
				1,
				10387312,
				undefined,
				34,
				8,
				'linear'
			)

			expect(placement_village.getPotentialStructureChunk(seed, 0, 0)).toEqual([15, 2])
			expect(placement_village.getPotentialStructureChunk(seed, -1, 0)).toEqual([-27, 1])
			expect(placement_village.getPotentialStructureChunk(seed, -1, -1)).toEqual([-9, -34])
			expect(placement_village.getPotentialStructureChunk(seed, 0, -1)).toEqual([19, -15])
		})

		it('getPotentialStructureChunk triangular', () => {
			const placement_end_cities = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.ProbabilityReducer,
				1,
				10387313,
				undefined,
				20,
				11,
				'triangular'
			)

			expect(placement_end_cities.getPotentialStructureChunk(seed, 0, 0)).toEqual([3, 4])
			expect(placement_end_cities.getPotentialStructureChunk(seed, -1, 0)).toEqual([-16, 3])
			expect(placement_end_cities.getPotentialStructureChunk(seed, -1, -1)).toEqual([-18, -17])
			expect(placement_end_cities.getPotentialStructureChunk(seed, 0, -1)).toEqual([3, -16])
		})

		it('getPotentialStructureChunks', () => {
			const placement = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.ProbabilityReducer,
				1,
				0,
				undefined,
				10,
				9,
				'linear'
			)

			const chunks = placement.getPotentialStructureChunks(seed, 3, 3, 13, 13)
			expect(chunks.length).toEqual(4)
			expect(chunks).toContainEqual([0, 0])
			expect(chunks).toContainEqual([10, 0])
			expect(chunks).toContainEqual([0, 10])
			expect(chunks).toContainEqual([10, 10])
		})

	})

	describe('isStructureChunk', () => {
		it('ProbabilityReducer', () => {
			const placement = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.ProbabilityReducer,
				0.5,
				0,
				undefined,
				2,
				1,
				'linear'
			)

			expect(placement.isStructureChunk(seed, -2, -2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, -2, 0)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 0, -2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 0, 0)).toBeFalsy()
		})

		it('LegacyPillagerOutpostReducer', () => {
			const placement = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.LegacyPillagerOutpostReducer,
				0.5,
				0,
				undefined,
				2,
				1,
				'linear'
			)

			expect(placement.isStructureChunk(seed, -2, -2)).toBeFalsy()
			expect(placement.isStructureChunk(seed, -2, 0)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 0, -2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 0, 0)).toBeFalsy()
		})

		it('LegacyArbitrarySaltProbabilityReducer', () => {
			const placement = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.LegacyArbitrarySaltProbabilityReducer,
				0.5,
				0,
				undefined,
				2,
				1,
				'linear'
			)

			expect(placement.isStructureChunk(seed, -2, -2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, -2, 0)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 0, -2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 0, 0)).toBeFalsy()
		})

		it('LegacyProbabilityReducerWithDouble', () => {
			const placement = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.LegacyProbabilityReducerWithDouble,
				0.5,
				0,
				undefined,
				2,
				1,
				'linear'
			)

			expect(placement.isStructureChunk(seed, -2, -2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, -2, 0)).toBeFalsy()
			expect(placement.isStructureChunk(seed, 0, -2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 0, 0)).toBeFalsy()
		})

		it('ExclusionZone', () => {
			const otherSet = new StructureSet([], new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.ProbabilityReducer,
				0.5,
				0,
				undefined,
				4,
				3,
				'linear'
			))

			const placement = new StructurePlacement.RandomSpreadStructurePlacement(
				[0,0,0],
				StructurePlacement.FrequencyReducer.ProbabilityReducer,
				1,
				0,
				new StructurePlacement.ExclusionZone(Holder.direct(otherSet), 1),
				1,
				0,
				'linear'
			)

			expect(placement.isStructureChunk(seed, 0, 0)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 1, 0)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 2, 0)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 3, 0)).toBeFalsy()
			expect(placement.isStructureChunk(seed, 4, 0)).toBeFalsy()

			expect(placement.isStructureChunk(seed, 0, 1)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 1, 1)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 2, 1)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 3, 1)).toBeFalsy()
			expect(placement.isStructureChunk(seed, 4, 1)).toBeFalsy()

			expect(placement.isStructureChunk(seed, 0, 2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 1, 2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 2, 2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 3, 2)).toBeTruthy()
			expect(placement.isStructureChunk(seed, 4, 2)).toBeTruthy()

		})		
	})
})
