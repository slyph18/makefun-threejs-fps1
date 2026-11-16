// Keyboard, mouse, and pointer-lock input. The canvas owns pointer lock; while it is
// active, mouse movement accumulates in input state until the fixed-step loop consumes it.

export function createInput(canvas, onLockChange) {
  const keys = new Set();
  const state = { keys, locked: false, firing: false, lookX: 0, lookY: 0 };
  const look = { x: 0, y: 0 };

  function setKey(event, pressed) {
    if (pressed) {
      keys.add(event.code);
    } else {
      keys.delete(event.code);
    }

    if (event.code === 'Space') {
      event.preventDefault();
    }
  }

  function handleMouseMove(event) {
    if (!state.locked) return;
    state.lookX += event.movementX;
    state.lookY += event.movementY;
  }

  function handleMouseDown(event) {
    if (state.locked && event.button === 0) {
      state.firing = true;
    }
  }

  function handleMouseUp(event) {
    if (event.button === 0) {
      state.firing = false;
    }
  }

  function handlePointerLockChange() {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) {
      keys.clear();
      state.firing = false;
    }
    onLockChange(state.locked);
  }

  window.addEventListener('keydown', (event) => setKey(event, true));
  window.addEventListener('keyup', (event) => setKey(event, false));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('pointerlockchange', handlePointerLockChange);

  return {
    state,
    requestLock() {
      try {
        const request = canvas.requestPointerLock();
        if (request?.catch) request.catch(() => {});
      } catch (error) {
        console.warn('Pointer lock was unavailable.', error);
      }
    },
    takeLook() {
      look.x = state.lookX;
      look.y = state.lookY;
      state.lookX = 0;
      state.lookY = 0;
      return look;
    },
  };
}
