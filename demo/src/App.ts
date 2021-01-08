import { NamedNbtTag, Structure } from "@webmc/core"
import { StructureRenderer } from '@webmc/render';
import { ResourceManager } from './ResourceManager'
import nbt from 'nbt'

let viewDist = 4;
let xRotation = 0.8;
let yRotation = 0.5;

main();

async function main() {
  const canvas = document.querySelector('#demo') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl');

  if (!gl) {
    throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
  }

  const exampleRes = await fetch('./example.nbt')
  const exampleData = await exampleRes.arrayBuffer()
  
  const structure = await Structure.fromNbt(exampleData)

  const resources = new ResourceManager()
  await resources.loadFromZip('./assets.zip')

  const renderer = new StructureRenderer(gl, resources, resources, resources.getBlockAtlas(), structure)

  function render() {
    yRotation = yRotation % (Math.PI * 2)
    xRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, xRotation))
    viewDist = Math.max(1, Math.min(20, viewDist))
    renderer.drawStructure(xRotation, yRotation, viewDist);
  }
  requestAnimationFrame(render);

  let dragPos: [number, number] | null = null
  canvas.addEventListener('mousedown', evt => {
    dragPos = [evt.clientX, evt.clientY]
  })
  canvas.addEventListener('mousemove', evt => {
    if (dragPos) {
      yRotation += (evt.clientX - dragPos[0]) / 100
      xRotation += (evt.clientY - dragPos[1]) / 100
      dragPos = [evt.clientX, evt.clientY]
      requestAnimationFrame(render);
    }
  })
  canvas.addEventListener('mouseup', () => {
    dragPos = null
  })
  canvas.addEventListener('wheel', evt => {
    viewDist += evt.deltaY / 100
    requestAnimationFrame(render);
  })

  window.addEventListener('resize', () => {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      renderer.setViewport(0, 0, canvas.width, canvas.height)
      requestAnimationFrame(render);
    }
  })
}

function parseNbt(buffer: ArrayBuffer): Promise<NamedNbtTag> {
  return new Promise((res, rej) => {
    nbt.parse(buffer, (err, data) => {
      if (err) rej(err)
      res(data)
    })
  })
}
