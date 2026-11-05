// ============================================================
// The Tetris - Miku Edition
// ============================================================

const COLS = 12;
const ROWS = 20;
const CELL = 30; // resolução interna: o CSS escala o canvas para qualquer tela

// Canvas principal
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
context.setTransform(CELL, 0, 0, CELL, 0, 0);

// Canvas de preview
const previewCanvas = document.getElementById('preview');
const previewCtx = previewCanvas.getContext('2d');
const PREVIEW_CELL = 16;
const PREVIEW_COUNT = 3;
const PREVIEW_SLOT = 5; // cada peça ocupa um "slot" 5x5 (máx. 4 de largura + folga)

// Elementos do DOM
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const bestElement = document.getElementById('best');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');
const volumeButton = document.getElementById('volume-control');
const bgMusic = document.getElementById('bg-music');
const gameOverModal = document.getElementById('gameover-modal');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');

// Estado do jogo: 'idle' | 'playing' | 'paused' | 'over'
let state = 'idle';
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId = null;

// Matrizes das peças (cada uso recebe uma cópia)
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
const arena = createMatrix(COLS, ROWS);

// Jogador
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 0
};

// Próximas peças + "saco" de 7 (todas as peças saem antes de repetir)
let nextPieces = [];
let bag = [];

// Recorde (localStorage pode falhar em modo privado)
let bestScore = 0;
try {
  bestScore = parseInt(localStorage.getItem('miku-tetris-best'), 10) || 0;
} catch (e) { /* ignora */ }
bestElement.innerText = bestScore;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function cloneMatrix(m) {
  return m.map(row => row.slice());
}

function randomPiece() {
  if (bag.length === 0) {
    bag = Object.keys(matrixes);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return cloneMatrix(matrixes[bag.pop()]);
}

function initNextPieces() {
  bag = [];
  nextPieces = [];
  for (let i = 0; i < PREVIEW_COUNT; i++) nextPieces.push(randomPiece());
}

// ------------------------------------------------------------
// Desenho
// ------------------------------------------------------------
function drawCell(ctx, x, y, value, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colors[value];
  ctx.fillRect(x, y, 1, 1);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.05;
  ctx.strokeRect(x, y, 1, 1);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x, y, 1, 0.2);
  ctx.globalAlpha = 1;
}

function drawMatrix(matrix, offset, alpha = 1) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) drawCell(context, x + offset.x, y + offset.y, value, alpha);
    });
  });
}

function getGhostY() {
  const ghost = { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y } };
  while (!collide(arena, ghost)) ghost.pos.y++;
  return ghost.pos.y - 1;
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, COLS, ROWS);

  context.strokeStyle = '#333';
  context.lineWidth = 0.02;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      context.strokeRect(x, y, 1, 1);
    }
  }

  drawMatrix(arena, { x: 0, y: 0 });

  if (player.matrix && state !== 'idle' && state !== 'over') {
    // Sombra de onde a peça vai cair
    drawMatrix(player.matrix, { x: player.pos.x, y: getGhostY() }, 0.22);
    drawMatrix(player.matrix, player.pos);
  }
}

// Recorta a peça pela caixa que ela realmente ocupa (para centralizar no preview)
function trimmed(piece) {
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  piece.forEach((row, y) => row.forEach((v, x) => {
    if (v !== 0) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }));
  return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// No celular o preview fica na horizontal; no PC, na vertical
const compactQuery = window.matchMedia(
  '(max-width: 900px), (max-aspect-ratio: 1/1), (max-height: 520px) and (orientation: landscape)'
);

function sizePreview() {
  const horizontal = compactQuery.matches;
  const w = (horizontal ? PREVIEW_COUNT * PREVIEW_SLOT : PREVIEW_SLOT) * PREVIEW_CELL;
  const h = (horizontal ? PREVIEW_SLOT : PREVIEW_COUNT * PREVIEW_SLOT) * PREVIEW_CELL;
  previewCanvas.width = w;
  previewCanvas.height = h;
  previewCtx.setTransform(PREVIEW_CELL, 0, 0, PREVIEW_CELL, 0, 0);
  updatePreview();
}

function updatePreview() {
  const horizontal = compactQuery.matches;
  const cols = horizontal ? PREVIEW_COUNT * PREVIEW_SLOT : PREVIEW_SLOT;
  const rows = horizontal ? PREVIEW_SLOT : PREVIEW_COUNT * PREVIEW_SLOT;

  previewCtx.fillStyle = '#000';
  previewCtx.fillRect(0, 0, cols, rows);

  nextPieces.forEach((piece, i) => {
    const t = trimmed(piece);
    const slotX = horizontal ? i * PREVIEW_SLOT : 0;
    const slotY = horizontal ? 0 : i * PREVIEW_SLOT;
    const ox = slotX + (PREVIEW_SLOT - t.w) / 2 - t.minX;
    const oy = slotY + (PREVIEW_SLOT - t.h) / 2 - t.minY;

    piece.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) drawCell(previewCtx, x + ox, y + oy, value);
      });
    });
  });
}

// ------------------------------------------------------------
// Regras
// ------------------------------------------------------------
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
      if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
    });
  });
}

const LINE_POINTS = [0, 100, 300, 500, 800];

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) continue outer;
    }
    arena.splice(y, 1);
    arena.unshift(new Array(COLS).fill(0));
    y++;
    rowCount++;
  }

  if (rowCount > 0) {
    player.lines += rowCount;
    player.score += LINE_POINTS[Math.min(rowCount, 4)] * (player.level + 1);
    player.level = Math.floor(player.lines / 10);
    // Fica mais rápido a cada nível, com piso de 100ms
    dropInterval = Math.max(100, 1000 * Math.pow(0.85, player.level));
  }
}

// Trava a peça atual, limpa linhas e entrega a próxima
function lockPiece() {
  merge(arena, player);
  arenaSweep();
  playerReset();
  updateScore();
}

function playerDrop() {
  if (state !== 'playing') return;
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    lockPiece();
  }
  dropCounter = 0;
}

function softDrop() {
  if (state !== 'playing') return;
  const before = player.pos.y;
  playerDrop();
  if (player.pos.y > before) {
    player.score += 1;
    updateScore();
  }
}

function hardDrop() {
  if (state !== 'playing' || collide(arena, player)) return;
  let rows = 0;
  while (!collide(arena, player)) { player.pos.y++; rows++; }
  player.pos.y--;
  player.score += Math.max(0, rows - 1) * 2;
  lockPiece();
  dropCounter = 0;
}

function playerMove(dir) {
  if (state !== 'playing') return;
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
  if (state !== 'playing') return;
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
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function playerReset() {
  player.matrix = nextPieces.shift();
  nextPieces.push(randomPiece());

  player.pos.y = 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);

  updatePreview();

  if (collide(arena, player)) gameOver();
}

function updateScore() {
  scoreElement.innerText = player.score;
  levelElement.innerText = player.level;
  linesElement.innerText = player.lines;
}

// ------------------------------------------------------------
// Loop e estados
// ------------------------------------------------------------
function update(time = 0) {
  if (state !== 'playing') return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) playerDrop();
  draw();
  if (state === 'playing') animationId = requestAnimationFrame(update);
}

function showOverlay(title, text) {
  overlayTitle.innerHTML = title;
  overlayText.innerHTML = text;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function playMusic(fromStart) {
  if (fromStart) bgMusic.currentTime = 0;
  bgMusic.play().catch(() => {});
}

function gameOver() {
  if (state === 'over') return;
  state = 'over';
  if (animationId) cancelAnimationFrame(animationId);
  bgMusic.pause();
  pauseButton.disabled = true;

  const isRecord = player.score > bestScore;
  if (isRecord) {
    bestScore = player.score;
    bestElement.innerText = bestScore;
    try { localStorage.setItem('miku-tetris-best', String(bestScore)); } catch (e) { /* ignora */ }
  }

  document.getElementById('final-score').innerText = player.score;
  document.getElementById('new-record').style.display = isRecord && player.score > 0 ? 'block' : 'none';
  draw();
  gameOverModal.style.display = 'flex';
}

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 0;
  dropInterval = 1000;
  dropCounter = 0;
  initNextPieces();
  updateScore();
  gameOverModal.style.display = 'none';
  hideOverlay();

  state = 'playing';
  pauseButton.disabled = false;
  pauseButton.innerText = 'Pausar';
  startButton.innerText = 'Restart';
  playerReset();
  playMusic(true);
  lastTime = performance.now();
  update(lastTime);
}

function restartGame() {
  startGame();
}

function backToMenu() {
  if (animationId) cancelAnimationFrame(animationId);
  state = 'idle';
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 0;
  updateScore();
  bgMusic.pause();
  bgMusic.currentTime = 0;
  gameOverModal.style.display = 'none';
  startButton.innerText = 'Start';
  pauseButton.disabled = true;
  pauseButton.innerText = 'Pausar';
  nextPieces = [];
  updatePreview();
  draw();
  showOverlay('Pronto?', 'Aperte <b>Start</b> para jogar');
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    if (animationId) cancelAnimationFrame(animationId);
    bgMusic.pause();
    pauseButton.innerText = 'Continuar';
    showOverlay('⏸️ Pausado', 'Aperte <b>P</b> para continuar');
  } else if (state === 'paused') {
    state = 'playing';
    pauseButton.innerText = 'Pausar';
    hideOverlay();
    playMusic(false);
    lastTime = performance.now();
    update(lastTime);
  }
}

// Pausa sozinho se a aba perder o foco (evita perder a partida)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') togglePause();
});

// ------------------------------------------------------------
// Áudio
// ------------------------------------------------------------
let lastVolume = 0.5;
try {
  const saved = parseFloat(localStorage.getItem('miku-tetris-volume'));
  if (!isNaN(saved)) lastVolume = Math.min(1, Math.max(0, saved));
} catch (e) { /* ignora */ }

function applyVolume(v) {
  bgMusic.volume = v;
  volumeSlider.value = v;
  volumeIcon.innerText = v === 0 ? '🔇' : v < 0.4 ? '🔉' : '🔊';
  try { localStorage.setItem('miku-tetris-volume', String(v)); } catch (e) { /* ignora */ }
}

function toggleMute() {
  if (bgMusic.volume > 0) {
    lastVolume = bgMusic.volume;
    applyVolume(0);
  } else {
    applyVolume(lastVolume || 0.5);
  }
}

volumeSlider.addEventListener('input', () => {
  const v = parseFloat(volumeSlider.value);
  if (v > 0) lastVolume = v;
  applyVolume(v);
});
volumeButton.addEventListener('click', toggleMute);
applyVolume(lastVolume);

// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

if (compactQuery.addEventListener) compactQuery.addEventListener('change', sizePreview);
else compactQuery.addListener(sizePreview);

sizePreview();
draw();
