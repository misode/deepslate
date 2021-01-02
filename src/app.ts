import { mat4 } from 'gl-matrix'
import { BlockAtlas } from './BlockAtlas'

let TEX_ATLAS_SIZE = 4
let TEX_SIZE = 1 / TEX_ATLAS_SIZE

const blocksTextures = [
  'stone',
  'dirt',
  'sand',
  'cobblestone',
  'oak_planks',
]

type GL = WebGLRenderingContext

var xRotation = 0.5;
var yRotation = 0.0;

const structure = {
  size: [2, 2, 2],
  palette: [
    { Name: 'minecraft:stone' },
    { Name: 'minecraft:dirt' },
  ],
  blocks: [
    { pos: [0, 0, 0], state: 0 },
    { pos: [0, 1, 0], state: 2 },
    { pos: [1, 0, 0], state: 1 },
    { pos: [1, 0, 1], state: 4 },
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

main();

function main() {
  const canvas = document.querySelector('#glcanvas') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl');

  if (!gl) {
    console.error('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if (!shaderProgram) {
    return
  }

  
  Promise.all([
    loadAtlas(gl, blocksTextures)
  ]).then(([atlas]) => {
    const { vertexCount } = initGl(gl, shaderProgram)

    const viewMatrixLoc = gl.getUniformLocation(shaderProgram, 'mView')!

    var then = 0;
    function render(now: number) {
      now *= 0.001;
      const deltaTime = now - then;
      then = now;

      drawScene(gl!, viewMatrixLoc, vertexCount, atlas!);

      yRotation += deltaTime

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  })
}

async function loadAtlas(gl: GL, blocks: string[]) {
  const urls = blocks.map(b => `/assets/minecraft/textures/block/${b}.png`)
  const blockAtlas = await BlockAtlas.fromUrls(urls)
  const atlasCanvas = document.querySelector('#atlas') as HTMLCanvasElement;
  const ctx = atlasCanvas.getContext('2d')!;
  atlasCanvas.width = blockAtlas.pixelWidth
  atlasCanvas.height = blockAtlas.pixelWidth
  ctx.putImageData(blockAtlas.getImageData(), 0, 0)

  const atlas = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlas);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blockAtlas.getImageData());
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return atlas
}

function initShaderProgram(gl: GL, vsSource: string, fsSource: string) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)!;
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)!;

  const shaderProgram = gl.createProgram()!;
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl: GL, type: number, source: string) {
  const shader = gl.createShader(type)!;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function getCubeBuffers(i: number, xo: number, yo: number, zo: number, id: number) {
  const positions = [
    0.0 + xo, 0.0 + yo, 1.0 + zo, // Front
    1.0 + xo, 0.0 + yo, 1.0 + zo,
    1.0 + xo, 1.0 + yo, 1.0 + zo,
    0.0 + xo, 1.0 + yo, 1.0 + zo,
    0.0 + xo, 0.0 + yo, 0.0 + zo, // Back
    0.0 + xo, 1.0 + yo, 0.0 + zo,
    1.0 + xo, 1.0 + yo, 0.0 + zo,
    1.0 + xo, 0.0 + yo, 0.0 + zo,
    0.0 + xo, 1.0 + yo, 0.0 + zo, // Top
    0.0 + xo, 1.0 + yo, 1.0 + zo,
    1.0 + xo, 1.0 + yo, 1.0 + zo,
    1.0 + xo, 1.0 + yo, 0.0 + zo,
    0.0 + xo, 0.0 + yo, 0.0 + zo, // Bottom
    1.0 + xo, 0.0 + yo, 0.0 + zo,
    1.0 + xo, 0.0 + yo, 1.0 + zo,
    0.0 + xo, 0.0 + yo, 1.0 + zo,
    1.0 + xo, 0.0 + yo, 0.0 + zo, // Bottom
    1.0 + xo, 1.0 + yo, 0.0 + zo,
    1.0 + xo, 1.0 + yo, 1.0 + zo,
    1.0 + xo, 0.0 + yo, 1.0 + zo,
    0.0 + xo, 0.0 + yo, 0.0 + zo, // Left
    0.0 + xo, 0.0 + yo, 1.0 + zo,
    0.0 + xo, 1.0 + yo, 1.0 + zo,
    0.0 + xo, 1.0 + yo, 0.0 + zo,
  ];
  const u0 = TEX_SIZE * (id % TEX_ATLAS_SIZE)
  const v0 = TEX_SIZE * (Math.floor(id / TEX_ATLAS_SIZE))
  const u1 = u0 + TEX_SIZE
  const v1 = v0 + TEX_SIZE
  const textureCoordinates = [
    u0, v0, // Front
    u1, v0,
    u1, v1,
    u0, v1,
    u1, v0, // Back
    u1, v1,
    u0, v1,
    u0, v0,
    u0, v0, // Top
    u1, v0,
    u1, v1,
    u0, v1,
    u0, v0, // Bottom
    u1, v0,
    u1, v1,
    u0, v1,
    u1, v0, // Right
    u1, v1,
    u0, v1,
    u0, v0,
    u0, v0, // Left
    u1, v0,
    u1, v1,
    u0, v1,
  ];
  const indices = [
    i + 0,  i + 1,  i + 2,      i + 0,  i + 2,  i + 3,    // Front
    i + 4,  i + 5,  i + 6,      i + 4,  i + 6,  i + 7,    // Back
    i + 8,  i + 9,  i + 10,     i + 8,  i + 10, i + 11,   // Top
    i + 12, i + 13, i + 14,     i + 12, i + 14, i + 15,   // Bottom
    i + 16, i + 17, i + 18,     i + 16, i + 18, i + 19,   // Right
    i + 20, i + 21, i + 22,     i + 20, i + 22, i + 23,   // Left
  ];
  return { positions, textureCoordinates, indices }
}

function createBuffer(gl: GL, type: number, array: ArrayBuffer) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, array, gl.STATIC_DRAW);
  return buffer
}

function initBuffers(gl: GL) {
  const positions = []
  const textureCoordinates = []
  const indices = []
  let indexOffset = 0

  for (const b of structure.blocks) {
    const buffers = getCubeBuffers(indexOffset, b.pos[0], b.pos[1], b.pos[2], b.state)
    positions.push(...buffers.positions)
    textureCoordinates.push(...buffers.textureCoordinates)
    indices.push(...buffers.indices)
    indexOffset += buffers.textureCoordinates.length / 2
  }

  return {
    position: createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(positions)),
    textureCoord: createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(textureCoordinates)),
    indices: createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices)),
    length: indices.length
  };
}

function initGl(gl: GL, shaderProgram: WebGLProgram) {
  const buffers = initBuffers(gl)
  
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = 70 * Math.PI / 180;
  const aspect = (gl.canvas as HTMLCanvasElement).clientWidth / (gl.canvas as HTMLCanvasElement).clientHeight;
  const projMatrix = mat4.create();
  mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 100.0);

  const vertLoc = gl.getAttribLocation(shaderProgram, 'vertPos')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(vertLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertLoc);

  const texCoordLoc = gl.getAttribLocation(shaderProgram, 'texCoord')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texCoordLoc);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  gl.useProgram(shaderProgram);
  
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'mProj'), false, projMatrix);

  return {
    vertexCount: buffers.length
  }
}

function drawScene(gl: GL, viewMatrixLoc: WebGLUniformLocation, vertexCount: number, atlas: WebGLTexture) {
  const viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, [0.0, 0.5, -5.0]);
  mat4.rotate(viewMatrix, viewMatrix, xRotation, [1, 0, 0]);
  mat4.rotate(viewMatrix, viewMatrix, yRotation, [0, 1, 0]);
  mat4.translate(viewMatrix, viewMatrix, [-structure.size[0] / 2, -structure.size[1] / 2, -structure.size[2] / 2]);
  gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, atlas);

  gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
}
