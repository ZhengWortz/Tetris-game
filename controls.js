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
window.addEventListener('click', (e) => {
  const modal = document.getElementById('gameover-modal');
  if (e.target === modal) modal.style.display = 'none';
});

// Controles
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
    // Queda instantânea segura
    while (!collide(arena, player)) player.pos.y++;
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
  }
});