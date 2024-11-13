import { Identifier, ItemRenderingContext, ItemStack, Json, TextureAtlasProvider } from "../index.js"
import { Mesh } from "./Mesh.js"



export abstract class SpecialModel {
	public abstract getMesh(item: ItemStack, resources: TextureAtlasProvider, context: ItemRenderingContext): Mesh
}

export namespace SpecialModel {
	export function fromJson(obj: unknown){
		const root = Json.readObject(obj) ?? {}
		const type = Json.readString(root.type)?.replace(/^minecraft:/, '')
		switch (type) {
			default:
			case 'bed': return new Bed(
				Identifier.parse(Json.readString(root.texture) ?? '')
			)
//				throw new Error(`Invalid item model type ${type}`)
		}
	}

	class Bed extends SpecialModel{
		//private readonly renderer

		constructor(
			private texture: Identifier
		) {
			super()
			//this.renderer = SpecialRenderers.
		}

		public getMesh(item: ItemStack, resources: TextureAtlasProvider, context: ItemRenderingContext): Mesh {
			throw new Error("Method not implemented.")
		}
	}
}