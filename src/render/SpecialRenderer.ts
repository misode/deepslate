import { TextureAtlasProvider } from "./TextureAtlas"
import { BlockDefinition } from "./BlockDefinition"
import { BlockModel } from "./BlockModel"

function dummy(name: string, uvProvider: TextureAtlasProvider, offset: number, model: BlockModel) {
  const definition = new BlockDefinition('', {'': { model: '' } }, undefined)
  const modelProvider = { getBlockModel: () => model }
  model.flatten(modelProvider)
  return definition.getBuffers(name, {}, uvProvider, modelProvider, offset, {})
}

function liquidRenderer(type: string, index: number, level: number, uvProvider: TextureAtlasProvider, tintindex?: number) {
    const y = [14.2, 12.5, 10.5, 9, 7, 5.3, 3.7, 1.9, 16, 16, 16, 16, 16, 16, 16, 16][level]
    return dummy(`minecraft:${type}`, uvProvider, index, new BlockModel('', '', {
      'still': `minecraft:block/${type}_still`,
      'flow': `minecraft:block/${type}_flow`
    }, [{
      from: [0, 0, 0],
      to: [16, y, 16],
      faces: {
        up: { texture: '#still', tintindex },
        down: { texture: '#still', tintindex },
        north: { texture: '#flow', tintindex },
        east: { texture: '#flow', tintindex },
        south: { texture: '#flow', tintindex },
        west: { texture: '#flow', tintindex }
      }
    }]))
  }

export const SpecialRenderer: {
  [key: string]: (index: number, props: { [key: string]: string }, uvProvider: TextureAtlasProvider) => any
} = {
  'minecraft:water': (index, props, uvProvider) =>
    liquidRenderer('water', index, parseInt(props.level), uvProvider, 0),
  'minecraft:lava': (index, props, uvProvider) =>
    liquidRenderer('lava', index, parseInt(props.level), uvProvider)
}

export const SpecialRenderers = new Set(Object.keys(SpecialRenderer))
