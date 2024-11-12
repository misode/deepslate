import { mat4 } from 'gl-matrix'
import type { ItemRendererResources, NbtTag, Resources, Voxel } from '../src/index.js'
import { BlockDefinition, BlockModel, Identifier, ItemRenderer, ItemStack, NormalNoise, Structure, StructureRenderer, TextureAtlas, VoxelRenderer, XoroshiroRandom, jsonToNbt, upperPowerOfTwo } from '../src/index.js'
import { } from '../src/nbt/Util.js'
import { ItemModel } from '../src/render/ItemModel.js'


class InteractiveCanvas {
	private xRotation = 0.8
	private yRotation = 0.5

	constructor(
		canvas: HTMLCanvasElement,
		private readonly onRender: (view: mat4) => void,
		private readonly center?: [number, number, number],
		private viewDist = 4,
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
		this.viewDist = Math.max(1, this.viewDist)

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
	fetch(`${MCMETA}summary/data/item_definition/data.min.json`).then(r => r.json()),
	fetch(`${MCMETA}summary/item_components/data.min.json`).then(r => r.json()),
	fetch(`${MCMETA}atlas/all/data.min.json`).then(r => r.json()),
	new Promise<HTMLImageElement>(res => {
		const image = new Image()
		image.onload = () => res(image)
		image.crossOrigin = 'Anonymous'
		image.src = `${MCMETA}atlas/all/atlas.png`
	}),
]).then(([items, blockstates, models, item_models, item_components, uvMap, atlas]) => {
	
	// === Prepare assets for item and structure rendering ===

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
		blockDefinitions['minecraft:' + id] = BlockDefinition.fromJson(blockstates[id])
	})

	const blockModels: Record<string, BlockModel> = {}
	Object.keys(models).forEach(id => {
		blockModels['minecraft:' + id] = BlockModel.fromJson(models[id])
	})
	Object.values(blockModels).forEach((m: any) => m.flatten({ getBlockModel: id => blockModels[id] }))


	const itemModels: Record<string, ItemModel> = {}
	Object.keys(item_models).forEach(id => {
		itemModels['minecraft:' + id] = ItemModel.fromJson(item_models[id].model)
	})


	const itemComponents: Record<string, Map<string, NbtTag>> = {}
	Object.keys(item_components).forEach(id => {
		const components = new Map<string, NbtTag>()
		Object.keys(item_components[id]).forEach(c_id => {
			components.set(c_id, jsonToNbt(item_components[id][c_id]))
		})
		itemComponents['minecraft:' + id] = components
	})

	const atlasCanvas = document.createElement('canvas')
	const atlasSize = upperPowerOfTwo(Math.max(atlas.width, atlas.height))
	atlasCanvas.width = atlasSize
	atlasCanvas.height = atlasSize
	const atlasCtx = atlasCanvas.getContext('2d')!
	atlasCtx.drawImage(atlas, 0, 0)
	const atlasData = atlasCtx.getImageData(0, 0, atlasSize, atlasSize)
	const idMap = {}
	Object.keys(uvMap).forEach(id => {
		const [u, v, du, dv] = uvMap[id]
		const dv2 = (du !== dv && id.startsWith('block/')) ? du : dv
		idMap[Identifier.create(id).toString()] = [u / atlasSize, v / atlasSize, (u + du) / atlasSize, (v + dv2) / atlasSize]
	})
	const textureAtlas = new TextureAtlas(atlasData, idMap)

	const resources: Resources & ItemRendererResources = {
		getBlockDefinition(id) { return blockDefinitions[id.toString()] },
		getBlockModel(id) { return blockModels[id.toString()] },
		getTextureUV(id) { return textureAtlas.getTextureUV(id) },
		getTextureAtlas() { return textureAtlas.getTextureAtlas() },
		getBlockFlags(id) { return { opaque: false } },
		getBlockProperties(id) { return null },
		getDefaultBlockProperties(id) { return null },
		getItemModel(id) { return itemModels[id.toString()] },
	}

	// === Item rendering ===

	const itemCanvas = document.getElementById('item-display') as HTMLCanvasElement
	const itemGl = itemCanvas.getContext('webgl')!
	const itemInput = document.getElementById('item-input') as HTMLInputElement
	itemInput.value = localStorage.getItem('deepslate_demo_item') ?? 'stone'
	const itemId = Identifier.parse(itemInput.value)
	const itemStack = new ItemStack(itemId, 1).withDefaultComponents(itemComponents[itemId.toString()])
	const itemRenderer = new ItemRenderer(itemGl, itemStack, resources)

	itemInput.addEventListener('keyup', () => {
		try {
			const id = itemInput.value
			const itemId = Identifier.parse(itemInput.value)
			if (!itemComponents[itemId.toString()]){
				itemInput.classList.add('invalid')
				return
			}
			const itemStack = new ItemStack(itemId, 1).withDefaultComponents(itemComponents[itemId.toString()])
			itemRenderer.setItem(itemStack)
			itemRenderer.drawItem()
			itemInput.classList.remove('invalid')
			localStorage.setItem('deepslate_demo_item', id)
		} catch (e) {
			console.error(e)
			itemInput.classList.add('invalid')
		}
	})
	itemRenderer.drawItem()

	// === Structure rendering ===

	const structure = new Structure([3, 2, 1])
	const size = structure.getSize()
	structure.addBlock([1, 0, 0], 'minecraft:grass_block', { snowy: 'false' })
	structure.addBlock([2, 0, 0], 'minecraft:stone')
	structure.addBlock([1, 1, 0], 'minecraft:skeleton_skull', { rotation: '15' })
	structure.addBlock([2, 1, 0], 'minecraft:acacia_fence', { waterlogged: 'true', north: 'true' })
	structure.addBlock([0, 0, 0], 'minecraft:wall_torch', { facing: 'west' })

	const structureCanvas = document.getElementById('structure-display') as HTMLCanvasElement
	const structureGl = structureCanvas.getContext('webgl')!
	const structureRenderer = new StructureRenderer(structureGl, structure, resources)

	new InteractiveCanvas(structureCanvas, view => {
		structureRenderer.drawStructure(view)
	}, [size[0] / 2, size[1] / 2, size[2] / 2])

	// === Voxel rendering ===

	const voxelCanvas = document.getElementById('voxel-display') as HTMLCanvasElement
	const voxelCtx = voxelCanvas.getContext('webgl')!
	const voxelRenderer = new VoxelRenderer(voxelCtx)

	const voxels: Voxel[] = []
	const random = XoroshiroRandom.create(BigInt(123))
	const noise = new NormalNoise(random, { firstOctave: -5, amplitudes: [1, 1, 1] })
	const sampleRegion = 50
	for (let x = -sampleRegion; x <= sampleRegion; x += 1) {
		for (let y = -sampleRegion; y <= sampleRegion; y += 1) {
			for (let z = -sampleRegion; z <= sampleRegion; z += 1) {
				const d = noise.sample(x, y, z)
				if (d > 0) {
					voxels.push({ x, y, z, color: [200, 200, 200] })
				}
			}
		}
	}
	voxelRenderer.setVoxels(voxels)

	new InteractiveCanvas(voxelCanvas, view => {
		voxelRenderer.draw(view)
	}, [0, 0, 0], sampleRegion * 3)
})
