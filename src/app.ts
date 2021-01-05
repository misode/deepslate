import { ResourceManager } from './ResourceManager';
import { ShaderProgram } from './ShaderProgram';
import { StructureRenderer } from './StructureRenderer';

const structure = {
  size: [3, 2, 3],
  palette: [
    { Name: 'minecraft:crafting_table' },
    { Name: 'minecraft:hopper', Properties: { facing: 'south' } },
    { Name: 'minecraft:piston', Properties: { extended: 'false', facing: 'west' } },
    { Name: 'minecraft:grass_block', Properties: { snowy: 'false' } },
    { Name: 'minecraft:lantern', Properties: { hanging: 'false' } },
    { Name: 'minecraft:cauldron', Properties: { level: '2' } },
    { Name: 'minecraft:cobweb' },
    { Name: 'minecraft:vine', Properties: { east: 'false', north: 'true', south: 'false', west: 'false', up: 'false' } },
    { Name: 'minecraft:lily_pad' },
  ],
  blocks: [
    { pos: [0, 0, 0], state: 0 },
    { pos: [2, 0, 1], state: 1 },
    { pos: [1, 0, 1], state: 2 },
    { pos: [2, 0, 2], state: 3 },
    { pos: [2, 1, 2], state: 4 },
    { pos: [2, 0, 0], state: 5 },
    { pos: [1, 1, 1], state: 6 },
    { pos: [0, 0, 1], state: 7 },
    { pos: [0, 0, 2], state: 8 },
  ]
}

const vsSource = `
  attribute vec4 vertPos;
  attribute vec2 texCoord;
  attribute vec3 tintColor;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec2 vTexCoord;
  varying highp vec3 vTintColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
    vTintColor = tintColor;
  }
`;

const fsSource = `
  precision highp float;
  varying highp vec2 vTexCoord;
  varying highp vec3 vTintColor;

  uniform sampler2D sampler;

  void main(void) {
    vec4 texColor = texture2D(sampler, vTexCoord);
    gl_FragColor = vec4(texColor.xyz * vTintColor, texColor.a);
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

  const resources = new ResourceManager()
  await resources.loadFromZip('./assets.zip')

  // Fetch block textures
  const blockAtlas = resources.getBlockAtlas()
  // Display preview of atlas
  const atlasCanvas = document.querySelector('#atlas') as HTMLCanvasElement;
  const ctx = atlasCanvas.getContext('2d')!;
  atlasCanvas.width = blockAtlas.pixelWidth
  atlasCanvas.height = blockAtlas.pixelWidth
  ctx.putImageData(blockAtlas.getImageData(), 0, 0)

  // Create structure renderer
  const renderer = new StructureRenderer(gl, shaderProgram, resources, resources, blockAtlas, structure)

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
