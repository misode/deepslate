import { Structure } from "@webmc/core"
import { read as readNbt } from '@webmc/nbt'
import { StructureRenderer } from '@webmc/render';
import { ResourceManager } from './ResourceManager'
import { mat4 } from 'gl-matrix'

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
  const exampleNbt = readNbt(new Uint8Array(exampleData))
  const structure = Structure.fromNbt(exampleNbt.result)

  const resources = new ResourceManager()
  await Promise.all([
    resources.loadFromZip('./assets.zip'),
    resources.loadBlocks('https://raw.githubusercontent.com/Arcensoth/mcdata/master/processed/reports/blocks/simplified/data.min.json')
  ])

  const renderer = new StructureRenderer(gl, structure, resources)

  function resize() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      renderer.setViewport(0, 0, canvas.width, canvas.height)
      return true
    }
  }

  function render() {
    resize()

    yRotation = yRotation % (Math.PI * 2)
    xRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, xRotation))
    viewDist = Math.max(1, Math.min(20, viewDist))

    const size = structure.getSize()
    const viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, [0, 0, -viewDist]);
    mat4.rotate(viewMatrix, viewMatrix, xRotation, [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, yRotation, [0, 1, 0]);
    mat4.translate(viewMatrix, viewMatrix, [-size[0] / 2, -size[1] / 2, -size[2] / 2]);

    renderer.drawGrid(viewMatrix);
    renderer.drawStructure(viewMatrix);
  }
  requestAnimationFrame(render);

  let dragPos: [number, number] | null = null
  let dragButton: number
  canvas.addEventListener('mousedown', evt => {
    dragPos = [evt.clientX, evt.clientY]
    dragButton = evt.button
  })
  canvas.addEventListener('mousemove', evt => {
    if (dragPos) {
      if (dragButton === 0) {
        yRotation += (evt.clientX - dragPos[0]) / 100
        xRotation += (evt.clientY - dragPos[1]) / 100
      }
      dragPos = [evt.clientX, evt.clientY]
      requestAnimationFrame(render);
    }
  })
  canvas.addEventListener('mouseup', evt => {
    dragPos = null
  })
  canvas.addEventListener('contextmenu', evt => {
    evt.preventDefault()
  })
  canvas.addEventListener('wheel', evt => {
    viewDist += evt.deltaY / 100
    requestAnimationFrame(render);
  })

  window.addEventListener('resize', () => {
    if (resize()) {
      requestAnimationFrame(render);
    }
  })
}
