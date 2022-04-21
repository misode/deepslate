import type { ReadonlyVec3 } from 'gl-matrix'
import { glMatrix, mat4, vec3 } from 'gl-matrix'
import type { Direction } from '../core'
import { Identifier } from '../core'
import { BlockColors } from './BlockColors'
import type { Cull } from './Cull'
import type { TextureAtlasProvider, UV } from './TextureAtlas'
import { mergeFloat32Arrays, transformVectors } from './Util'

type Axis = 'x' | 'y' | 'z'

type BlockModelFace = {
	texture: string,
	uv?: UV,
	cullface?: Direction,
	rotation?: 0 | 90 | 180 | 270,
	tintindex?: number,
}

type BlockModelElement = {
	from: number[],
	to: number[],
	rotation?: {
		origin: [number, number, number],
		axis: Axis,
		angle: number,
		rescale?: boolean,
	},
	faces?: {
		[key in Direction]?: BlockModelFace
	},
}

const faceRotations = {
	0: [0, 3, 2, 3, 2, 1, 0, 1],
	90: [2, 3, 2, 1, 0, 1, 0, 3],
	180: [2, 1, 0, 1, 0, 3, 2, 3],
	270: [0, 1, 0, 3, 2, 3, 2, 1],
}

const rotationAxis: {[key in Axis] : ReadonlyVec3} = {
	x: [1, 0, 0],
	y: [0, 1, 0],
	z: [0, 0, 1],
}

const SQRT2 = 1.41421356237

const rescaleAxis: {[key in Axis] : ReadonlyVec3} = {
	x: [1, SQRT2, SQRT2],
	y: [SQRT2, 1, SQRT2],
	z: [SQRT2, SQRT2, 1],
}

export interface BlockModelProvider {
	getBlockModel(id: Identifier): BlockModel | null
}

export class BlockModel {
	private flattened: boolean
	constructor(
		private readonly id: Identifier,
		private readonly parent: Identifier | undefined,
		private textures: { [key: string]: string } | undefined,
		private elements: BlockModelElement[] | undefined,
	) {
		this.flattened = false
	}

	public getBuffers(name: Identifier, props: {[key: string]: string}, uvProvider: TextureAtlasProvider, offset: number, cull: Cull) {
		const position: Float32Array[] = []
		const texCoord: number[] = []
		const tintColor: number[] = []
		const index: number[] = []

		for (const element of this.elements ?? []) {
			const buffers = this.getElementBuffers(name, props, element, offset, uvProvider, cull)
			position.push(buffers.position)
			texCoord.push(...buffers.texCoord)
			tintColor.push(...buffers.tintColor)
			index.push(...buffers.index)
			offset += buffers.texCoord.length / 2
		}

		return {
			position: mergeFloat32Arrays(...position),
			texCoord,
			tintColor,
			index,
		}
	}

	private getElementBuffers(name: Identifier, props: {[key: string]: string}, e: BlockModelElement, i: number, uvProvider: TextureAtlasProvider, cull: {[key in Direction]?: boolean}) {
		const x0 = e.from[0]
		const y0 = e.from[1]
		const z0 = e.from[2]
		const x1 = e.to[0]
		const y1 = e.to[1]
		const z1 = e.to[2]

		const positions: number[] = []
		const texCoords: number[] = []
		const tintColors: number[] = []
		const indices: number[] = []

		const addFace = (face: BlockModelFace, uv: UV, pos: number[]) => {
			const [u0, v0, u1, v1] = uvProvider.getTextureUV(this.getTexture(face.texture))
			const du = (u1 - u0) / 16
			const dv = (v1 - v0) / 16
			// Hack to remove stiching lines
			const duu = du / 16
			const dvv = dv / 16
			uv[0] = (face.uv?.[0] ?? uv[0]) * du + duu
			uv[1] = (face.uv?.[1] ?? uv[1]) * dv + dvv
			uv[2] = (face.uv?.[2] ?? uv[2]) * du - duu
			uv[3] = (face.uv?.[3] ?? uv[3]) * dv - dvv
			const r = faceRotations[face.rotation ?? 0]
			texCoords.push(
				u0 + uv[r[0]], v0 + uv[r[1]],
				u0 + uv[r[2]], v0 + uv[r[3]],
				u0 + uv[r[4]], v0 + uv[r[5]],
				u0 + uv[r[6]], v0 + uv[r[7]])
			const tint = (face.tintindex ?? -1) >= 0 ? (BlockColors[name.path]?.(props) ?? [1, 1, 1]) : [1, 1, 1]
			tintColors.push(...tint, ...tint, ...tint, ...tint)
			positions.push(...pos)
			indices.push(i, i+1, i+2,  i, i+2, i+3)
			i += 4
		}

		if (e.faces?.up?.texture && (!e.faces.up.cullface || !cull[e.faces.up.cullface])) {
			addFace(e.faces.up, [x0, 16 - z1, x1, 16 - z0],
				[x0, y1, z1,  x1, y1, z1,  x1, y1, z0,  x0, y1, z0])
		}
		if (e.faces?.down?.texture && (!e.faces.down.cullface || !cull[e.faces.down.cullface])) {
			addFace(e.faces.down, [16 - z1, 16 - x1, 16 - z0, 16 - x0],
				[x0, y0, z0,  x1, y0, z0,  x1, y0, z1,  x0, y0, z1])
		}
		if (e.faces?.south?.texture && (!e.faces.south.cullface || !cull[e.faces.south.cullface])) {
			addFace(e.faces.south, [x0, 16 - y1, x1, 16 - y0], 
				[x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1])
		}
		if (e.faces?.north?.texture && (!e.faces.north.cullface || !cull[e.faces.north.cullface])) {
			addFace(e.faces.north, [16 - x1, 16 - y1, 16 - x0, 16 - y0], 
				[x1, y0, z0,  x0, y0, z0,  x0, y1, z0,  x1, y1, z0])
		}
		if (e.faces?.east?.texture && (!e.faces.east.cullface || !cull[e.faces.east.cullface])) {
			addFace(e.faces.east, [16 - z1, 16 - y1, 16 - z0, 16 - y0], 
				[x1, y0, z1,  x1, y0, z0,  x1, y1, z0,  x1, y1, z1])
		}
		if (e.faces?.west?.texture && (!e.faces.west.cullface || !cull[e.faces.west.cullface])) {
			addFace(e.faces.west, [z0, 16 - y1, z1, 16 - y0], 
				[x0, y0, z0,  x0, y0, z1,  x0, y1, z1,  x0, y1, z0])
		}

		const t = mat4.create()
		mat4.identity(t)
		if (e.rotation) {
			const origin = vec3.fromValues(...e.rotation.origin)
			mat4.translate(t, t, origin)
			mat4.rotate(t, t, glMatrix.toRadian(e.rotation.angle), rotationAxis[e.rotation.axis])
			if (e.rotation.rescale) {
				mat4.scale(t, t, rescaleAxis[e.rotation.axis])
			}
			vec3.negate(origin, origin)
			mat4.translate(t, t, origin)
		}

		const posArray = new Float32Array(positions)
		transformVectors(posArray, t)

		return {
			position: posArray,
			texCoord: texCoords,
			tintColor: tintColors,
			index: indices,
		}
	}

	private getTexture(textureRef: string) {
		while (textureRef.startsWith('#')) {
			textureRef = this.textures?.[textureRef.slice(1)] ?? ''
		}
		return Identifier.parse(textureRef)
	}

	public flatten(accessor: BlockModelProvider) {
		if (!this.flattened && this.parent) {
			const parent = accessor.getBlockModel(this.parent)
			if (!parent) {
				console.warn(`parent ${this.parent} does not exist!`)
				this.flattened = true
				return
			}
			parent.flatten(accessor)
			if (!this.elements) {
				this.elements = parent.elements
			}
			if (!this.textures) {
				this.textures = {}
			}
			Object.keys(parent.textures ?? {}).forEach(t => {
				if (!this.textures![t]) {
					this.textures![t] = parent.textures![t]
				}
			})
			this.flattened = true
		}
	}

	public static fromJson(id: string, data: any) {
		const parent = data.parent === undefined ? undefined : Identifier.parse(data.parent)
		return new BlockModel(Identifier.parse(id), parent, data.textures, data.elements)
	}
}
