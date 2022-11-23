import type { ReadonlyVec3 } from 'gl-matrix'
import { glMatrix, mat4, vec3 } from 'gl-matrix'
import type { Direction } from '../core/index.js'
import { Identifier } from '../core/index.js'
import { Cull } from './Cull.js'
import type { TextureAtlasProvider, UV } from './TextureAtlas.js'
import { mergeFloat32Arrays, transformVectors } from './Util.js'

type Axis = 'x' | 'y' | 'z'

type Display = 'thirdperson_righthand' | 'thirdperson_lefthand' | 'firstperson_righthand' | 'firstperson_lefthand' | 'gui' | 'head' | 'ground' | 'fixed'

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

type BlockModelDisplay = {
	[key in Display]?: {
		rotation?: [number, number, number],
		translation?: [number, number, number],
		scale?: [number, number, number],
	}
}

type BlockModelGuiLight = 'front' | 'side'

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
	private static readonly BUILTIN_GENERATED = Identifier.create('builtin/generated')
	private static readonly GENERATED_LAYERS = ['layer0', 'layer1', 'layer2', 'layer3', 'layer4']
	private generationMarker = false

	constructor(
		private readonly id: Identifier,
		private parent: Identifier | undefined,
		private textures: { [key: string]: string } | undefined,
		private elements: BlockModelElement[] | undefined,
		private display?: BlockModelDisplay | undefined,
		private guiLight?: BlockModelGuiLight | undefined,
	) {}

	public getDisplayBuffers(display: Display, uvProvider: TextureAtlasProvider, offset: number, tint?: number[] | ((index: number) => number[])) {
		const buffers = this.getBuffers(uvProvider, offset, Cull.none(), tint)
		
		const transform = this.display?.[display]
		const t = mat4.create()
		mat4.identity(t)
		mat4.translate(t, t, [8, 8, 8])
		if (transform?.translation) {
			mat4.translate(t, t, transform.translation)
		}
		if (transform?.rotation) {
			mat4.rotateX(t, t, transform.rotation[0] * Math.PI/180)
			mat4.rotateY(t, t, transform.rotation[1] * Math.PI/180)
			mat4.rotateZ(t, t, -transform.rotation[2] * Math.PI/180)
		}
		if (transform?.scale) {
			mat4.scale(t, t, transform.scale)
		}
		mat4.translate(t, t, [-8, -8, -8])
		transformVectors(buffers.position, t)

		const normals = []
		for (let i = 0; i < buffers.position.length; i += 12) {
			const a = vec3.fromValues(buffers.position[i], buffers.position[i + 1], buffers.position[i + 2])
			const b = vec3.fromValues(buffers.position[i + 3], buffers.position[i + 4], buffers.position[i + 5])
			const c = vec3.fromValues(buffers.position[i + 6], buffers.position[i + 7], buffers.position[i + 8])
			vec3.subtract(b, b, a)
			vec3.subtract(c, c, a)
			vec3.cross(b, b, c)
			vec3.normalize(b, b)
			normals.push(...b, ...b, ...b, ...b)
		}

		return {
			...buffers,
			normal: normals,
		}
	}

	public getBuffers(uvProvider: TextureAtlasProvider, offset: number, cull: Cull, tint?: number[] | ((index: number) => number[])) {
		const position: Float32Array[] = []
		const texCoord: number[] = []
		const tintColor: number[] = []
		const index: number[] = []

		for (const element of this.elements ?? []) {
			const buffers = this.getElementBuffers(element, offset, uvProvider, cull, tint)
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

	private getElementBuffers(e: BlockModelElement, i: number, uvProvider: TextureAtlasProvider, cull: {[key in Direction]?: boolean}, tint?: number[] | ((index: number) => number[])) {
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

		const getTint = (index?: number) => {
			if (tint === undefined) return [1, 1, 1]
			if (index === undefined || index < 0) return [1, 1, 1]
			if (typeof tint === 'function') return tint(index)
			return tint
		}

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
			const t = getTint(face.tintindex)
			tintColors.push(...t, ...t, ...t, ...t)
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
		if (!this.parent) {
			return
		}
		if (this.parent.equals(BlockModel.BUILTIN_GENERATED)) {
			this.generationMarker = true
			return
		}
		const parent = this.getParent(accessor)
		if (!parent) {
			console.warn(`parent ${this.parent} does not exist!`)
			this.parent = undefined
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
		if (!this.display) {
			this.display = {}
		}
		Object.keys(parent.display ?? {}).forEach(k => {
			const l = k as Display
			if (!this.display![l]) {
				this.display![l] = parent.display![l]
			} else {
				Object.keys(parent.display![l] ?? {}).forEach(m => {
					const n = m as 'rotation' | 'translation' | 'scale'
					if (!this.display![l]![n]) {
						this.display![l]![n] = parent.display![l]![n]
					}
				})
			}
		})
		if (!this.guiLight) {
			this.guiLight = parent.guiLight
		}
		if (parent.generationMarker) {
			this.generationMarker = true
		}

		if (this.generationMarker && (this.elements?.length ?? 0) === 0) {
			for (let i = 0; i < BlockModel.GENERATED_LAYERS.length; i += 1) {
				const layer = BlockModel.GENERATED_LAYERS[i]
				if (!Object.hasOwn(this.textures, layer)) {
					break
				}
				if (!this.elements) {
					this.elements = []
				}
				this.elements.push({
					from: [0, 0, 0],
					to: [16, 16, 0],
					faces: { south: { texture: `#${layer}`, tintindex: i }},
				})
			}
		}

		this.parent = undefined
	}

	private getParent(accessor: BlockModelProvider) {
		if (!this.parent) return null
		return accessor.getBlockModel(this.parent)
	}

	public static fromJson(id: string, data: any) {
		const parent = data.parent === undefined ? undefined : Identifier.parse(data.parent)
		return new BlockModel(Identifier.parse(id), parent, data.textures, data.elements, data.display)
	}
}
