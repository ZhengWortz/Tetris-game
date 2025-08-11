// Tutorial
const tutorialModal = document.getElementById("tutorial-modal");
document.getElementById("tutorial-button").addEventListener("click", () => {
  tutorialModal.style.display = "flex";
});
document.getElementById("close-tutorial").addEventListener("click", () => {
  tutorialModal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === tutorialModal) tutorialModal.style.display = "none";
});

// Game Over
document.getElementById('gameover-ok').addEventListener('click', () => {
  document.getElementById('gameover-modal').style.display = 'none';
});
window.addEventListener("click", (e) => {
  const modal = document.getElementById('gameover-modal');
  if (e.target === modal) modal.style.display = 'none';
});

// Função para detectar dispositivo móvel
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Mostra o joystick se for um dispositivo móvel
if (isMobileDevice()) {
  document.getElementById('joystick-container').classList.remove('hidden');
}

// Controles via joystick (mobile)
document.getElementById('left-button').addEventListener('click', () => playerMove(-1));
document.getElementById('right-button').addEventListener('click', () => playerMove(1));
document.getElementById('rotate-left-button').addEventListener('click', () => playerRotate(-1));
document.getElementById('rotate-right-button').addEventListener('click', () => playerRotate(1));
document.getElementById('drop-button').addEventListener('click', () => {
  while (!collide(arena, player)) player.pos.y++;
  player.pos.y--;
  merge(arena, player);
  playerReset();
  arenaSweep();
  updateScore();
  dropCounter = 0;
});
document.getElementById('down-button').addEventListener('click', () => {
  playerDrop();
});

// Controles via teclado (PC)
document.addEventListener('keydown', event => {
  if (isGameOver) return;
  const k = event.key.toLowerCase();

  if (k === 'a' || event.code === 'ArrowLeft') playerMove(-1);
  else if (k === 'd' || event.code === 'ArrowRight') playerMove(1);
  else if (k === 's' || event.code === 'ArrowDown') playerDrop();
  else if (k === 'e' || event.code === 'ArrowUp') playerRotate(1);
  else if (k === 'q') playerRotate(-1);
  else if (event.code === 'Space') {
    event.preventDefault();
    while (!collide(arena, player)) player.pos.y++;
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
  }
});