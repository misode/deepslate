import { Identifier } from '../core/index.js'
import type { FluidPicker } from './Aquifer.js'
import { Aquifer, NoiseAquifer } from './Aquifer.js'
import type { DensityVolume } from './DensityVolume.js'
import type { NoiseGeneratorSettings } from './NoiseGeneratorSettings.js'
import type { RandomState } from './RandomState.js'

export class NoiseChunk {
	public readonly aquifer: Aquifer

	constructor(
		public readonly randomState: RandomState,
		public readonly settings: NoiseGeneratorSettings,
		public readonly globalFluidPicker: FluidPicker,
		public readonly volume: DensityVolume,
	) {
		if (!settings.aquifers) {
			this.aquifer = Aquifer.createDisabled(globalFluidPicker)
		} else {
			const aquiferRandom = this.randomState.getOrCreateRandom(Identifier.create('aquifer'))
			this.aquifer = new NoiseAquifer(settings.aquifers, aquiferRandom, volume, globalFluidPicker)
		}
	}
}
