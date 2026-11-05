// ============================================================
// Controles: tutorial, game over, teclado e joystick de toque
// ============================================================

// Tutorial
const tutorialModal = document.getElementById('tutorial-modal');
function openTutorial() {
  if (state === 'playing') togglePause();
  tutorialModal.style.display = 'flex';
}
function closeTutorial() {
  tutorialModal.style.display = 'none';
}
document.getElementById('tutorial-button').addEventListener('click', openTutorial);
document.getElementById('close-tutorial').addEventListener('click', closeTutorial);
tutorialModal.addEventListener('click', (e) => {
  if (e.target === tutorialModal) closeTutorial();
});

// Game Over
document.getElementById('gameover-restart').addEventListener('click', restartGame);
document.getElementById('gameover-reset').addEventListener('click', backToMenu);

// Joystick: aparece só em telas de toque
function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches ||
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
if (isTouchDevice()) {
  document.getElementById('joystick-container').classList.remove('hidden');
}

// Botão que dispara a ação ao tocar e repete enquanto segurado (opcional)
function bindButton(id, action, repeat = false) {
  const el = document.getElementById(id);
  let delayTimer = null;
  let repeatTimer = null;

  const stop = () => {
    clearTimeout(delayTimer);
    clearInterval(repeatTimer);
    delayTimer = repeatTimer = null;
  };

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stop();
    action();
    if (repeat) {
      delayTimer = setTimeout(() => {
        repeatTimer = setInterval(action, 70);
      }, 220);
    }
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, stop));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindButton('left-button',         () => playerMove(-1), true);
bindButton('right-button',        () => playerMove(1), true);
bindButton('down-button',         softDrop, true);
bindButton('rotate-left-button',  () => playerRotate(-1));
bindButton('rotate-right-button', () => playerRotate(1));
bindButton('drop-button',         hardDrop);

// Teclado (PC)
document.addEventListener('keydown', (event) => {
  const k = event.key.toLowerCase();

  // Fecha o tutorial com Esc
  if (tutorialModal.style.display === 'flex') {
    if (event.code === 'Escape') closeTutorial();
    return;
  }

  if (k === 'm') { toggleMute(); return; }

  if (k === 'p' || event.code === 'Escape') {
    if (state === 'playing' || state === 'paused') togglePause();
    return;
  }

  // Enter/Espaço inicia a partida quando ainda não começou
  if (state === 'idle' && (event.code === 'Enter' || event.code === 'Space')) {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
    event.preventDefault();
    startGame();
    return;
  }

  if (state !== 'playing') return;

  // Evita que setas/espaço rolem a página
  if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();

  if (k === 'a' || event.code === 'ArrowLeft') playerMove(-1);
  else if (k === 'd' || event.code === 'ArrowRight') playerMove(1);
  else if (k === 's' || event.code === 'ArrowDown') softDrop();
  else if (k === 'e' || event.code === 'ArrowUp') playerRotate(1);
  else if (k === 'q') playerRotate(-1);
  else if (event.code === 'Space') hardDrop();
});

// Depois de clicar num botão, devolve o foco ao jogo (Espaço não "clica" o botão sem querer)
document.querySelectorAll('button').forEach(b => {
  b.addEventListener('click', () => b.blur());
});
