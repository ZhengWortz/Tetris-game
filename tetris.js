// Canvas principal
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// Canvas de preview
const previewCanvas = document.getElementById('preview');
const previewCtx = previewCanvas.getContext('2d');

// Elementos do DOM
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startButton = document.getElementById('start-button');
const volumeSlider = document.getElementById('volume-slider');
const bgMusic = document.getElementById('bg-music');
const gameOverModal = document.getElementById('gameover-modal');

// Estado do jogo
let isGameOver = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId = null;

// Tipos de peças
const pieces = 'TJLOSZI';

// Matrizes das peças
const matrixes = {
  'T': [[0, 0, 0],
        [1, 1, 1],
        [0, 1, 0]],
  'O': [[2, 2],
        [2, 2]],
  'L': [[0, 3, 0],
        [0, 3, 0],
        [0, 3, 3]],
  'J': [[0, 4, 0],
        [0, 4, 0],
        [4, 4, 0]],
  'I': [[0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0]],
  'S': [[0, 6, 6],
        [6, 6, 0],
        [0, 0, 0]],
  'Z': [[7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]]
};

// Cores
const colors = [
  null,
  '#FF0D72', // T
  '#0DC2FF', // O
  '#0DFF72', // L
  '#F538FF', // J
  '#FF8E0D', // I
  '#FFE138', // S
  '#3877FF'  // Z
];

// Tabuleiro 12x20
const arena = createMatrix(12, 20);

// Jogador
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 0
};

// Próximas peças
let nextPieces = [];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function randomPiece() {
  const type = pieces[Math.floor(Math.random() * pieces.length)];
  return matrixes[type];
}

function initNextPieces() {
  nextPieces = [];
  for (let i = 0; i < 3; i++) {
    nextPieces.push(randomPiece());
  }
}

function updatePreview() {
  previewCtx.fillStyle = '#000';
  previewCtx.fillRect(0, 0, previewCanvas.width / 10, previewCanvas.height / 10);

  let yOffset = 1;
  nextPieces.forEach(piece => {
    const xOffset = Math.floor(((previewCanvas.width / 10) - piece[0].length) / 2);

    piece.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          previewCtx.fillStyle = colors[value];
          previewCtx.fillRect(x + xOffset, y + yOffset, 1, 1);
          previewCtx.strokeStyle = '#fff';
          previewCtx.lineWidth = 0.05;
          previewCtx.strokeRect(x + xOffset, y + yOffset, 1, 1);
        }
      });
    });

    yOffset += 5;
  });
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);

        context.strokeStyle = '#fff';
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);

        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fillRect(x + offset.x, y + offset.y, 1, 0.2);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = '#333';
  context.lineWidth = 0.02;
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 12; x++) {
      context.strokeRect(x, y, 1, 1);
    }
  }

  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
          (arena[y + o.y] === undefined ||
           arena[y + o.y][x + o.x] === undefined ||
           arena[y + o.y][x + o.x] !== 0)) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    arena.splice(y, 1);
    arena.unshift(Array(12).fill(0));
    y++;
    rowCount++;
  }

  if (rowCount > 0) {
    const pointsEarned = rowCount * 200;
    player.score += pointsEarned;
    updateScore();

    const newLevel = Math.floor(player.score / 1000);
    if (newLevel > player.level) {
      player.level = newLevel;
      updateScore();
    }

    const speedStages = Math.floor(player.score / 2000);
    dropInterval = Math.max(100, 1000 - (speedStages * 500));
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    if (collide(arena, player)) gameOver();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > 5) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerReset() {
  player.matrix = nextPieces.shift();
  nextPieces.push(randomPiece());

  player.pos.y = 0;
  player.pos.x = Math.floor((12 - player.matrix[0].length) / 2);

  if (collide(arena, player)) {
    gameOver();
  }

  updatePreview();
}

function updateScore() {
  scoreElement.innerText = player.score;
  levelElement.innerText = player.level;
  linesElement.innerText = player.lines;
}

function update(time = 0) {
  if (isGameOver) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) playerDrop();
  draw();
  animationId = requestAnimationFrame(update);
}

function gameOver() {
  if (isGameOver) return;
  isGameOver = true;
  if (animationId) cancelAnimationFrame(animationId);
  bgMusic.pause();
  document.getElementById('final-score').innerText = player.score;
  gameOverModal.style.display = 'flex';
}

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);
  isGameOver = false;
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 0;
  dropInterval = 1000;
  initNextPieces();
  updateScore();
  playerReset();
  updatePreview();
  bgMusic.currentTime = 0;
  bgMusic.play().catch(() => {});
  update();
}

// Redimensionamento responsivo
function resizeCanvas() {
  const containerWidth = window.innerWidth < 800 ? window.innerWidth * 0.9 : 240;
  const height = containerWidth * (400 / 240);

  canvas.width = 12 * 20;
  canvas.height = 20 * 20;
  context.scale(20, 20);

  previewCanvas.width = 10 * 10;
  previewCanvas.height = 15 * 10;
  previewCtx.scale(10, 10);

  updatePreview();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Eventos
startButton.addEventListener('click', startGame);
volumeSlider.addEventListener('input', () => {
  bgMusic.volume = volumeSlider.value;
});

document.getElementById('gameover-ok').addEventListener('click', () => {
  gameOverModal.style.display = 'none';
});