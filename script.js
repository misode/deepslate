const TEX_ATLAS_SIZE = 4
const TEX_SIZE = 1 / TEX_ATLAS_SIZE

const blocks = [
  'stone',
  'dirt',
  'sand',
  'cobblestone',
  'oak_planks'
]

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
    { pos: [1, 0, 1], state: 1 },
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

  uniform sampler2D uSampler;

  void main(void) {
    gl_FragColor = texture2D(uSampler, vTexCoord);
  }
`;

main();

function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');

  if (!gl) {
    console.error('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if (!shaderProgram) {
    return
  }

  const buffers = initBuffers(gl);

  Promise.all([
    loadAtlas(gl, blocks)
  ]).then(([atlas, ]) => {
    var then = 0;
    function render(now) {
      now *= 0.001;
      const deltaTime = now - then;
      then = now;

      drawScene(gl, shaderProgram, buffers, atlas);

      yRotation += deltaTime

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  })
}

async function loadAtlas(gl, blocks) {
  return Promise.all(blocks.map(b => loadImage(`/textures/${b}.png`))).then((blockImages) => {
    const atlasCanvas = document.querySelector('#atlas');
    const atlasCtx = atlasCanvas.getContext('2d')
    blockImages.forEach((img, i) => {
      const dx = 16 * (i % TEX_ATLAS_SIZE)
      const dy = 16 * Math.floor(i / TEX_ATLAS_SIZE)
      if (img) {
        atlasCtx.drawImage(img, dx, dy)
      } else {
        atlasCtx.fillStyle = 'black'
        atlasCtx.fillRect(dx, dy, 16, 16)
        atlasCtx.fillStyle = `rgb(255, 0, 255)`
        atlasCtx.fillRect(dx, dy, 8, 8)
        atlasCtx.fillRect(dx + 8, dy + 8, 8, 8)
      }
    })
    const atlasImage = atlasCtx.getImageData(0, 0, atlasCanvas.width, atlasCanvas.height)

    const atlas = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasImage);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return atlas
  })
}

async function loadImage(url) {
  const img = new Image()
  return new Promise((res, rej) => {
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = url
  })
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function getCubeBuffers(i, xo, yo, zo, id) {
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

function createBuffer(gl, type, array) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, array, gl.STATIC_DRAW);
  return buffer
}

function initBuffers(gl) {
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

function drawScene(gl, shaderProgram, buffers, atlas) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  const fieldOfView = 70 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projMatrix = mat4.create();
  mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 100.0);
  
  const viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, [0.0, 0.5, -5.0]);
  mat4.rotate(viewMatrix, viewMatrix, xRotation, [1, 0, 0]);
  mat4.rotate(viewMatrix, viewMatrix, yRotation, [0, 1, 0]);
  mat4.translate(viewMatrix, viewMatrix, [-structure.size[0] / 2, -structure.size[1] / 2, -structure.size[2] / 2]);
  
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

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, atlas);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);

  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'mProj'), false, projMatrix);
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'mView'), false, viewMatrix);

  gl.drawElements(gl.TRIANGLES, buffers.length, gl.UNSIGNED_SHORT, 0);
}
