import { mat4 } from 'gl-matrix'
import { BlockAtlas } from './BlockAtlas'
import { ModelManager } from './ModelManager';
import { ShaderProgram } from './ShaderProgram';
import { StructureRenderer } from './StructureRenderer';
import { mergeFloat32Arrays } from './Util';

const blocksTextureIds = [
  'block/crafting_table_front',
  'block/crafting_table_side',
  'block/crafting_table_top',
  'block/oak_planks',
  'block/dirt',
  'block/sand',
  'block/cobblestone',
  'block/stone',
  'block/hopper_inside',
  'block/hopper_outside',
  'block/hopper_top',
  'block/lantern',
  'block/oak_sapling',
]

const blockModelIds = [
  'block/stone',
  'block/crafting_table',
  'block/cube_all',
  'block/cube',
  'block/hopper',
  'block/hanging_lantern',
  'block/cross',
  'block/oak_sapling',
]

type GL = WebGLRenderingContext

const structure = {
  size: [3, 2, 1],
  palette: [
    { Name: 'stone' },
    { Name: 'crafting_table' },
    { Name: 'hopper' },
    { Name: 'hanging_lantern' },
    { Name: 'oak_sapling' },
  ],
  blocks: [
    { pos: [1, 0, 0], state: 0 },
    { pos: [2, 0, 0], state: 0 },
    { pos: [2, 1, 0], state: 1 },
    { pos: [0, 1, 0], state: 2 },
    { pos: [0, 0, 0], state: 3 },
    { pos: [1, 1, 0], state: 4 },
  ]
}

const vsSource = `
  attribute vec4 vertPos;
  attribute vec2 texCoord;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec2 vTexCoord;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
  }
`;

const fsSource = `
  varying highp vec2 vTexCoord;

  uniform sampler2D sampler;

  void main(void) {
    gl_FragColor = texture2D(sampler, vTexCoord);
  }
`;

let viewDist = 4;
let xRotation = 0.8;
let yRotation = 0.5;

main();

async function main() {
  const canvas = document.querySelector('#glcanvas') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl');

  if (!gl) {
    console.error('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  const shaderProgram = new ShaderProgram(gl, vsSource, fsSource).getProgram()
  if (!shaderProgram) {
    return
  }

  // Fetch block textures
  const blockAtlas = await BlockAtlas.fromIds(blocksTextureIds)
  // Display preview of atlas
  const atlasCanvas = document.querySelector('#atlas') as HTMLCanvasElement;
  const ctx = atlasCanvas.getContext('2d')!;
  atlasCanvas.width = blockAtlas.pixelWidth
  atlasCanvas.height = blockAtlas.pixelWidth
  ctx.putImageData(blockAtlas.getImageData(), 0, 0)

  // Fetch block models
  const modelManager = await ModelManager.fromIds(blockModelIds)

  // Create structure renderer
  const renderer = new StructureRenderer(gl, shaderProgram, blockAtlas, modelManager, structure)

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
}
