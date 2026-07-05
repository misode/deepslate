import { describe, expect, it } from 'vitest'
import type { Identifier } from '../../src'
import { BlockModel } from '../../src'
import type { TextureAtlasProvider, UV } from '../../src/render/TextureAtlas'

describe('BlockModel', () => {
	function collectingAtlas(requested: string[]): TextureAtlasProvider {
		return {
			getTextureUV(id: Identifier): UV {
				requested.push(id.toString())
				return [0, 0, 1, 1]
			},
			getTextureAtlas() {
				return new ImageData(1, 1)
			},
		}
	}

	const cube = {
		elements: [{
			from: [0, 0, 0],
			to: [16, 16, 16],
			faces: { up: { texture: '#all' } },
		}],
	}

	it('resolves a plain string texture reference', () => {
		const requested: string[] = []
		const model = BlockModel.fromJson({ ...cube, textures: { all: 'minecraft:block/stone' } })
		model.getMesh(collectingAtlas(requested), {})
		expect(requested).toContain('minecraft:block/stone')
	})

	it('resolves an object texture reference to its sprite (1.21.4+ format)', () => {
		const requested: string[] = []
		const model = BlockModel.fromJson({
			...cube,
			textures: { all: { sprite: 'minecraft:block/glass', force_translucent: true } },
		})
		model.getMesh(collectingAtlas(requested), {})
		expect(requested).toContain('minecraft:block/glass')
	})

	it('follows a reference chain that ends in an object', () => {
		const requested: string[] = []
		const model = BlockModel.fromJson({
			...cube,
			textures: {
				all: '#ref',
				ref: { sprite: 'minecraft:block/white_stained_glass' },
			},
		})
		model.getMesh(collectingAtlas(requested), {})
		expect(requested).toContain('minecraft:block/white_stained_glass')
	})
})
