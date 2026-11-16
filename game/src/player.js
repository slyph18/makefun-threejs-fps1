// Player movement: acceleration, friction, gravity, crouching, and jumping. The body is
// resolved as a box against world colliders one axis at a time so walls cannot swallow it.

import * as THREE from 'three';

const RADIUS = 0.34;
const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
const WALK_SPEED = 5.2;
const CROUCH_SPEED = 2.4;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 9;
const FRICTION = 9;
const GRAVITY = 20;
const JUMP_SPEED = 6.2;
const STEP_HEIGHT = 0.34;
const MAX_HEALTH = 100;
const MAX_PITCH = 1.45;
const MAX_FALL_SPEED = 30;

export function createPlayer(colliders) {
  const player = {
    position: new THREE.Vector3(0, 0, 9.5),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    eye: STAND_EYE,
    onGround: true,
    crouching: false,
    height: STAND_HEIGHT,
    health: MAX_HEALTH,
  };
  const probe = new THREE.Box3();
  const moveDirection = new THREE.Vector3();

  function findCollision(x, y, z, height, lift) {
    probe.min.set(x - RADIUS, y + lift, z - RADIUS);
    probe.max.set(x + RADIUS, y + height - lift, z + RADIUS);

    for (const collider of colliders) {
      if (probe.intersectsBox(collider)) return collider;
    }
    return null;
  }

  function look(deltaX, deltaY, sensitivity = 0.0022) {
    player.yaw -= deltaX * sensitivity;
    player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch - deltaY * sensitivity));
  }

  function recoil(pitchKick, yawKick) {
    player.pitch = Math.min(MAX_PITCH, player.pitch + pitchKick);
    player.yaw += yawKick;
  }

  function damage(amount) {
    if (player.health <= 0) return false;
    player.health = Math.max(0, player.health - amount);
    return player.health === 0;
  }

  function reset() {
    player.position.set(0, 0, 9.5);
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    player.pitch = 0;
    player.eye = STAND_EYE;
    player.onGround = true;
    player.crouching = false;
    player.height = STAND_HEIGHT;
    player.health = MAX_HEALTH;
  }

  function updateCrouch(keys) {
    const crouchRequested = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    if (crouchRequested && !player.crouching) {
      player.crouching = true;
      player.height = CROUCH_HEIGHT;
      return;
    }

    const standingBlocked = findCollision(
      player.position.x,
      player.position.y,
      player.position.z,
      STAND_HEIGHT,
      0.02,
    );
    if (!crouchRequested && player.crouching && !standingBlocked) {
      player.crouching = false;
      player.height = STAND_HEIGHT;
    }
  }

  function updateEye(dt) {
    const targetEye = player.crouching ? CROUCH_EYE : STAND_EYE;
    player.eye += (targetEye - player.eye) * Math.min(1, dt * 12);
  }

  function updateVelocity(dt, keys) {
    const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    moveDirection.set(0, 0, 0);

    if (forward || strafe) {
      const yawSine = Math.sin(player.yaw);
      const yawCosine = Math.cos(player.yaw);
      moveDirection
        .set(-yawSine * forward + yawCosine * strafe, 0, -yawCosine * forward - yawSine * strafe)
        .normalize();
    }

    const speed = player.crouching ? CROUCH_SPEED : WALK_SPEED;
    const acceleration = player.onGround ? GROUND_ACCEL : AIR_ACCEL;
    const blend = Math.min(1, acceleration * dt / speed);
    player.velocity.x += (moveDirection.x * speed - player.velocity.x) * blend;
    player.velocity.z += (moveDirection.z * speed - player.velocity.z) * blend;

    if (player.onGround && !moveDirection.lengthSq()) {
      const damping = Math.max(0, 1 - FRICTION * dt);
      player.velocity.x *= damping;
      player.velocity.z *= damping;
    }

    if (keys.has('Space') && player.onGround) {
      player.velocity.y = JUMP_SPEED;
      player.onGround = false;
    }
    player.velocity.y -= GRAVITY * dt;
  }

  function moveHorizontally(dt) {
    const nextX = player.position.x + player.velocity.x * dt;
    const xCollision = findCollision(nextX, player.position.y, player.position.z, player.height, 0.04);
    if (!xCollision) {
      player.position.x = nextX;
    } else if (player.onGround && xCollision.max.y - player.position.y <= STEP_HEIGHT) {
      player.position.x = nextX;
      player.position.y = xCollision.max.y;
    } else {
      player.velocity.x = 0;
    }

    const nextZ = player.position.z + player.velocity.z * dt;
    const zCollision = findCollision(player.position.x, player.position.y, nextZ, player.height, 0.04);
    if (!zCollision) {
      player.position.z = nextZ;
    } else if (player.onGround && zCollision.max.y - player.position.y <= STEP_HEIGHT) {
      player.position.z = nextZ;
      player.position.y = zCollision.max.y;
    } else {
      player.velocity.z = 0;
    }
  }

  function moveVertically(dt) {
    player.position.y += player.velocity.y * dt;
    player.onGround = false;
    const collision = findCollision(
      player.position.x,
      player.position.y,
      player.position.z,
      player.height,
      0,
    );

    if (collision && player.velocity.y <= 0) {
      player.position.y = collision.max.y;
      player.velocity.y = 0;
      player.onGround = true;
    } else if (collision) {
      player.position.y = collision.min.y - player.height;
      player.velocity.y = 0;
    }

    if (player.position.y < 0) {
      player.position.y = 0;
      player.velocity.y = 0;
      player.onGround = true;
    }
    player.velocity.y = Math.max(-MAX_FALL_SPEED, player.velocity.y);
  }

  function step(dt, keys) {
    updateCrouch(keys);
    updateEye(dt);
    updateVelocity(dt, keys);
    moveHorizontally(dt);
    moveVertically(dt);
  }

  return {
    state: player,
    step,
    look,
    recoil,
    damage,
    reset,
    groundSpeed() {
      return Math.hypot(player.velocity.x, player.velocity.z);
    },
  };
}
