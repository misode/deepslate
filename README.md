# Deepslate
Library for rendering and emulating parts of Minecraft

## Install
```
npm install deepslate
```
```html
<script src="https://unpkg.com/deepslate@0.9.0-beta.0"></script>
```

## Examples

### Reading and writing binary NBT files
```ts
import * as nbt from 'deepslate/nbt'

fetch('./example.nbt')
	.then(res => res.arrayBuffer())
	.then(data => {
		const { result, compressed } = nbt.read(new Uint8Array(data))

		nbt.write(result, compressed)
	})
```

### Rendering a structure
```ts
import { Structure } from 'deepslate/core'
import { StructureRenderer } from 'deepslate/render'
import { mat4 } from 'gl-matrix'

const structure = new Structure([4, 3, 4])
structure.addBlock([0, 0, 3], "minecraft:stone")
structure.addBlock([0, 1, 3], "minecraft:cactus", { "age": "1" })

// Obtain the WebGL context of a canvas element
const gl = canvas.getContext('webgl')

// See the demo on how to create a resources object
const renderer = new StructureRenderer(gl, structure, resources)

const view = mat4.create()
mat4.translate(view, view, [0, 0, -5])

renderer.drawStructure(view)
```

## [Demo](https://misode.github.io/deepslate/)
A collection of examples showcasing the utility of deepslate

#### [Render](https://misode.github.io/deepslate/render/)
Rendering a simple structure to a canvas, read from an NBT file.
Includes mouse controls and loading of an arbitrary resource pack.

![3D structure rendered](https://user-images.githubusercontent.com/17352009/131235802-ed6c6617-f054-4312-b567-f2692196bfaa.png)

#### [Terrain Shaper](https://misode.github.io/deepslate/terrainshaper/)
