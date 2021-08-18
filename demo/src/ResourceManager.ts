import type { BlockDefinitionProvider, BlockFlagsProvider, BlockModelProvider, BlockPropertiesProvider, TextureAtlasProvider } from 'deepslate/render'
import { BlockDefinition, BlockModel, TextureAtlas } from 'deepslate/render'
import jszip from 'jszip'
import { isOpaque } from './OpaqueHelper'

export class ResourceManager implements BlockModelProvider, BlockDefinitionProvider, BlockFlagsProvider, TextureAtlasProvider, BlockPropertiesProvider {
	private blockDefinitions: { [id: string]: BlockDefinition }
	private blockModels: { [id: string]: BlockModel }
	private blockAtlas: TextureAtlas
	private blocks: Record<string, {
		default: Record<string, string>,
		properties: Record<string, string[]>,
	}>

	constructor() {
		this.blockDefinitions = {}
		this.blockModels = {}
		this.blockAtlas = TextureAtlas.empty()
		this.blocks = {}
	}

	public getBlockDefinition(id: string) {
		return this.blockDefinitions[id]
	}

	public getBlockModel(id: string) {
		return this.blockModels[id]
	}

	public getTextureUV(id: string) {
		return this.blockAtlas.getTextureUV(id)
	}

	public getTextureAtlas() {
		return this.blockAtlas.getTextureAtlas()
	}

	public getBlockFlags(id: string) {
		return {
			opaque: isOpaque(id),
		}
	}

	public getBlockProperties(id: string) {
		return this.blocks[id]?.properties ?? null
	}

	public getDefaultBlockProperties(id: string) {
		return this.blocks[id]?.default ?? null
	}

	public async loadFromZip(url: string) {
		const assetsBuffer = await (await fetch(url)).arrayBuffer()
		const assets = await jszip.loadAsync(assetsBuffer)
		await this.loadFromFolderJson(assets.folder('minecraft/blockstates')!, async (id, data) => {
			id = 'minecraft:' + id
			this.blockDefinitions[id] = BlockDefinition.fromJson(id, data)
		})
		await this.loadFromFolderJson(assets.folder('minecraft/models/block')!, async (id, data) => {
			id = 'minecraft:block/' + id
			this.blockModels[id] = BlockModel.fromJson(id, data)
		})
		const textures: { [id: string]: Blob } = {}
		await this.loadFromFolderPng(assets.folder('minecraft/textures/block')!, async (id, data) => {
			textures['minecraft:block/' + id] = data
		})
		this.blockAtlas = await TextureAtlas.fromBlobs(textures)
		Object.values(this.blockModels).forEach(m => m.flatten(this))
	}

	private loadFromFolderJson(folder: jszip, callback: (id: string, data: any) => Promise<void>) {
		const promises: Promise<void>[] = []
		folder.forEach((path, file) => {
			if (file.dir || !path.endsWith('.json')) return
			const id = path.replace(/\.json$/, '')
			promises.push(file.async('text').then(data => callback(id, JSON.parse(data))))
		})
		return Promise.all(promises)
	}

	private loadFromFolderPng(folder: jszip, callback: (id: string, data: Blob) => Promise<void>) {
		const promises: Promise<void>[] = []
		folder.forEach((path, file) => {
			if (file.dir || !path.endsWith('.png')) return
			const id = path.replace(/\.png$/, '')
			promises.push(file.async('blob').then(data => callback(id, data)))
		})
		return Promise.all(promises)
	}

	public async loadBlocks(url: string) {
		this.blocks = await (await fetch(url)).json()
	}
}
