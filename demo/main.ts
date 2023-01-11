import { mat4 } from 'gl-matrix'
import type { NbtCompound, Resources } from '../src/index.js'
import { BlockDefinition, BlockModel, Identifier, ItemRenderer, ItemStack, NbtTag, Structure, StructureRenderer, TextureAtlas, upperPowerOfTwo, VoxelRenderer } from '../src/index.js'


class InteractiveCanvas {
	private viewDist = 4
	private xRotation = 0.8
	private yRotation = 0.5

	constructor(
		canvas: HTMLCanvasElement,
		private readonly onRender: (view: mat4) => void,
		private readonly center?: [number, number, number]
	) {
		let dragPos: null | [number, number] = null
		canvas.addEventListener('mousedown', evt => {
			if (evt.button === 0) {
				dragPos = [evt.clientX, evt.clientY]
			}
		})
		canvas.addEventListener('mousemove', evt => {
			if (dragPos) {
				this.yRotation += (evt.clientX - dragPos[0]) / 100
				this.xRotation += (evt.clientY - dragPos[1]) / 100
				dragPos = [evt.clientX, evt.clientY]
				this.redraw()
			}
		})
		canvas.addEventListener('mouseup', () => {
			dragPos = null
		})
		canvas.addEventListener('wheel', evt => {
			evt.preventDefault()
			this.viewDist += evt.deltaY / 100
			this.redraw()
		})

		this.redraw()
	}

	public redraw() {
		requestAnimationFrame(() => this.renderImmediately())
	}

	private renderImmediately() {
		this.yRotation = this.yRotation % (Math.PI * 2)
		this.xRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.xRotation))
		this.viewDist = Math.max(1, Math.min(20, this.viewDist))

		const view = mat4.create()
		mat4.translate(view, view, [0, 0, -this.viewDist])
		mat4.rotate(view, view, this.xRotation, [1, 0, 0])
		mat4.rotate(view, view, this.yRotation, [0, 1, 0])
		if (this.center) {
			mat4.translate(view, view, [-this.center[0], -this.center[1], -this.center[2]])
		}

		this.onRender(view)
	}
}

const MCMETA = 'https://raw.githubusercontent.com/misode/mcmeta/'

Promise.all([
	fetch(`${MCMETA}registries/item/data.min.json`).then(r => r.json()),
	fetch(`${MCMETA}summary/assets/block_definition/data.min.json`).then(r => r.json()),
	fetch(`${MCMETA}summary/assets/model/data.min.json`).then(r => r.json()),
	fetch(`${MCMETA}atlas/all/data.min.json`).then(r => r.json()),
	new Promise<HTMLImageElement>(res => {
		const image = new Image()
		image.onload = () => res(image)
		image.crossOrigin = 'Anonymous'
		image.src = `${MCMETA}atlas/all/atlas.png`
	}),
]).then(([items, blockstates, models, uvMap, atlas]) => {

	const itemList = document.createElement('datalist')
	itemList.id = 'item-list'
	items.forEach(item => {
		const option = document.createElement('option')
		option.textContent = item
		itemList.append(option)
	})
	document.getElementById('item-input')?.after(itemList)

	const blockDefinitions: Record<string, BlockDefinition> = {}
	Object.keys(blockstates).forEach(id => {
		blockDefinitions['minecraft:' + id] = BlockDefinition.fromJson(id, blockstates[id])
	})

	const blockModels: Record<string, BlockModel> = {}
	Object.keys(models).forEach(id => {
		blockModels['minecraft:' + id] = BlockModel.fromJson(id, models[id])
	})
	Object.values(blockModels).forEach((m: any) => m.flatten({ getBlockModel: id => blockModels[id] }))

	const atlasCanvas = document.createElement('canvas')
	const atlasSize = upperPowerOfTwo(Math.max(atlas.width, atlas.height))
	atlasCanvas.width = atlasSize
	atlasCanvas.height = atlasSize
	const atlasCtx = atlasCanvas.getContext('2d')!
	atlasCtx.drawImage(atlas, 0, 0)
	const atlasData = atlasCtx.getImageData(0, 0, atlasSize, atlasSize)
	const part = 16 / atlasData.width
	const idMap = {}
	Object.keys(uvMap).forEach(id => {
		const u = uvMap[id][0] / atlasSize
		const v = uvMap[id][1] / atlasSize
		idMap['minecraft:' + id] = [u, v, u + part, v + part]
	})
	const textureAtlas = new TextureAtlas(atlasData, idMap)

	const resources: Resources = {
		getBlockDefinition(id) { return blockDefinitions[id.toString()] },
		getBlockModel(id) { return blockModels[id.toString()] },
		getTextureUV(id) { return textureAtlas.getTextureUV(id) },
		getTextureAtlas() { return textureAtlas.getTextureAtlas() },
		getBlockFlags(id) { return { opaque: false } },
		getBlockProperties(id) { return null },
		getDefaultBlockProperties(id) { return null },
	}

	const itemCanvas = document.getElementById('item-display') as HTMLCanvasElement
	const itemGl = itemCanvas.getContext('webgl')!
	const itemRenderer = new ItemRenderer(itemGl, Identifier.parse('stone'), resources)

	const itemInput = document.getElementById('item-input') as HTMLInputElement
	itemInput.addEventListener('keyup', () => {
		try {
			const str = itemInput.value
			const nbtIndex = str.indexOf('{')
			let id: string
			let nbt: NbtCompound | undefined
			if (nbtIndex !== -1) {
				id = str.slice(0, nbtIndex)
				nbt = NbtTag.fromString(str.slice(nbtIndex)) as NbtCompound
			} else {
				id = str
			}
			itemRenderer.setItem(new ItemStack(Identifier.parse(id), 1, nbt))
			itemRenderer.drawItem()
			itemInput.classList.remove('invalid')
		} catch (e) {
			console.error(e)
			itemInput.classList.add('invalid')
		}
	})
	itemRenderer.drawItem()

	const structure = new Structure([3, 2, 1])
	const size = structure.getSize()
	structure.addBlock([1, 0, 0], 'minecraft:stone')
	structure.addBlock([2, 0, 0], 'minecraft:grass_block', { snowy: 'false' })
	structure.addBlock([1, 1, 0], 'minecraft:cake', { bites: '3' })
	structure.addBlock([0, 0, 0], 'minecraft:wall_torch', { facing: 'west' })

	const structureCanvas = document.getElementById('structure-display') as HTMLCanvasElement
	const structureGl = structureCanvas.getContext('webgl')!
	const structureRenderer = new StructureRenderer(structureGl, structure, resources)

	new InteractiveCanvas(structureCanvas, view => {
		structureRenderer.drawStructure(view)
	}, [size[0] / 2, size[1] / 2, size[2] / 2])
})

const voxelCanvas = document.getElementById('voxel-display') as HTMLCanvasElement
const voxelCtx = voxelCanvas.getContext('webgl')!
const voxelRenderer = new VoxelRenderer(voxelCtx)

voxelRenderer.setVoxels([
	{ x: 0, y: 0, z: 0, color: [200, 50, 0] },
	{ x: 0, y: 0, z: 1, color: [200, 200, 200] },
])

new InteractiveCanvas(voxelCanvas, view => {
	voxelRenderer.draw(view)
})
