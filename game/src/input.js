// Keyboard and mouse input. Held keys give movement; one-shot presses
// (confirm, pause, enter car, punch, interact) are queued as bit flags and
// taken once by the loop, so a press between frames is never lost.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_INTERACT = 16;
export const ACTION_MUTE = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const INTERACT = new Set(['KeyQ']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER_CAR.has(event.code)) actions |= ACTION_ENTER_CAR;
    else if (PUNCH.has(event.code)) actions |= ACTION_PUNCH;
    else if (INTERACT.has(event.code)) actions |= ACTION_INTERACT;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  function has(set) {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  }

  return {
    moveX() { return (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0); },
    moveY() { return (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0); },
    sprint() { return has(SPRINT); },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
