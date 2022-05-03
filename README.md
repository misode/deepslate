# Deepslate
> Library for rendering and emulating parts of Minecraft

## Install
```
npm install deepslate
```
```html
<script src="https://unpkg.com/deepslate@0.10.0"></script>
```

## Examples

### Reading and writing binary NBT files
```ts
import { readNbt, writeNbt } from 'deepslate'

fetch('./example.nbt')
	.then(res => res.arrayBuffer())
	.then(data => {
		const { value, name, compression } = readNbt(new Uint8Array(data))

		const newData = writeNbt(value, { name, compression })
	})
```

### Rendering a structure
```ts
import { Structure, StructureRenderer } from 'deepslate'
import { mat4 } from 'gl-matrix'

const structure = new Structure([4, 3, 4])
structure.addBlock([0, 0, 3], "minecraft:stone")
structure.addBlock([0, 1, 3], "minecraft:cactus", { "age": "1" })

// Obtain the WebGL context of a canvas element
const gl = canvas.getContext('webgl')

// See the example on how to create a resources object
const renderer = new StructureRenderer(gl, structure, resources)

const view = mat4.create()
mat4.translate(view, view, [0, 0, -5])

renderer.drawStructure(view)
```

## [Docs](https://misode.github.io/deepslate/docs/)
A collection of examples showcasing the use cases of deepslate.

#### [Render](https://misode.github.io/deepslate/examples/structurerenderer/)
Rendering a simple structure to a canvas, read from an NBT file.
Includes mouse controls and loading of an arbitrary resource pack.

![image](https://user-images.githubusercontent.com/17352009/131235802-ed6c6617-f054-4312-b567-f2692196bfaa.png)

#### [Splines](https://misode.github.io/deepslate/examples/splines/)
![image](https://user-images.githubusercontent.com/17352009/132134408-e140b1f2-d5df-4f6c-9913-6a8a5c01fd3c.png)

#### [Noise](https://misode.github.io/deepslate/examples/noise/)
![image](https://user-images.githubusercontent.com/17352009/132598742-7f9fc32c-58b7-45f0-8d4b-ae132a94b2b5.png)

#### [MultiNoise](https://misode.github.io/deepslate/examples/multinoise/) 
![image](https://user-images.githubusercontent.com/17352009/132134430-f21970b6-aaa8-4a95-9aa3-a52ea60bc0b0.png)

#### [Noise Sampler](https://misode.github.io/deepslate/examples/noisesampler/)
![image](https://user-images.githubusercontent.com/17352009/132598802-417d7934-a389-4733-a191-748794db63bf.png)

#### [Chunk Generator](https://misode.github.io/deepslate/examples/chunkgenerator/)
![image](https://user-images.githubusercontent.com/17352009/132598866-d2d61f8a-0d82-447d-a74b-97401f1a2425.png)
