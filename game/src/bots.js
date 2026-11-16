// Four enemy soldiers patrol fixed lane/connector routes, pause at waypoints, and seek cover
// when hit, peek in controlled bursts, and push the objective as pressure rises.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const HEALTH = 100;
const SPEED = 2.1;
const ARRIVE_DISTANCE = 0.28;
const BOT_EYE = 1.45;
const SHOT_RANGE = 38;
const DETECT_TIME = 0.34;
const LOS_INTERVAL = 0.12;
const FIRE_GAP = 0.85;
const BURST_GAP = 0.2;
const MUZZLE_TIME = 0.06;
const FALL_TIME = 0.7;
const HOLD_MIN = 0.55;
const HOLD_EXTRA = 0.6;
const COVER_DELAY = 0.72;
const COVER_STANDOFF = 1.1;
const PEEK_STANDOFF = 0.18;
const COVER_MARGIN = 0.25;
const REACTION_MIN = 0.3;
const REACTION_RANGE = 0.3;
const ACCURACY_TIME = 2.2;
const DUCK_SCALE = 0.58;
const SEPARATION_RADIUS = 2.3;
const HEAD_DAMAGE = 100;
const BODY_DAMAGE = 34;
const SHOT_DAMAGE = 17;
const PLAYER_RADIUS = 0.42;

const SPAWNS = [
  [-8.8, -9.6],
  [-2.6, -10.2],
  [2.6, -10.2],
  [8.8, -9.6],
];

const PUSH_POINTS = [
  [-9.2, -5.6],
  [-6.8, -8.2],
  [-5.4, -6.0],
  [-8.6, -3.4],
];

const ROUTES = [
  [
    [-9.2, -9.4], [-7.0, -6.2], [-7.4, 0.0], [-6.6, 3.8],
    [0.0, 4.4], [6.0, 2.2], [9.0, 0.0], [7.8, -3.2],
    [0.0, -1.6], [-3.0, 0.0], [-7.0, 3.0], [-9.2, -9.4],
  ],
  [
    [-6.0, -9.4], [-4.0, -5.8], [-3.6, 0.0], [-5.5, 3.4],
    [-1.5, 6.0], [2.0, 6.4], [6.5, 4.0], [7.0, -1.2],
    [3.0, -1.8], [0.0, 0.0], [-3.0, -2.4], [-6.0, -9.4],
  ],
  [
    [6.0, -9.4], [8.6, -5.4], [7.4, 0.0], [5.5, 3.4],
    [1.5, 6.0], [-2.0, 6.4], [-6.5, 4.0], [-7.0, -1.2],
    [-3.0, -1.8], [0.0, 0.0], [3.0, -2.4], [6.0, -9.4],
  ],
  [
    [9.2, -9.4], [7.0, -6.2], [7.4, 0.0], [6.6, 3.8],
    [0.0, 4.4], [-6.0, 2.2], [-9.0, 0.0], [-7.8, -3.2],
    [0.0, -1.6], [3.0, 0.0], [7.0, 3.0], [9.2, -9.4],
  ],
];

export function createBots(scene, random) {
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.uniformDark), roughness: 0.68, metalness: 0.04 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d7bd92'), roughness: 0.52, metalness: 0.03, emissive: new THREE.Color('#f6d8a4'), emissiveIntensity: 0.24 });
  const limbMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.uniformLight), roughness: 0.82, metalness: 0.02 });
  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ff933f'),
    emissive: new THREE.Color('#873400'),
    emissiveIntensity: 0.24,
    roughness: 0.46,
    metalness: 0.02,
  });
  const helmetMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1e242a'), roughness: 0.58, metalness: 0.14 });
  const backpackMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2c333a'), roughness: 0.74, metalness: 0.05 });
  const gunMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.concreteDark), roughness: 0.58, metalness: 0.18 });
  const torsoGeometry = new THREE.BoxGeometry(0.52, 0.78, 0.3);
  const headGeometry = new THREE.SphereGeometry(0.155, 16, 12);
  const legGeometry = new THREE.BoxGeometry(0.14, 0.72, 0.16);
  const armGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.12);
  const shoulderGeometry = new THREE.BoxGeometry(0.16, 0.08, 0.32);
  const gunGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.44);
  const helmetGeometry = new THREE.SphereGeometry(0.175, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const backpackGeometry = new THREE.BoxGeometry(0.36, 0.46, 0.15);
  const stripeGeometry = new THREE.BoxGeometry(0.55, 0.11, 0.33);
  legGeometry.translate(0, -0.36, 0);
  armGeometry.translate(0, -0.25, 0);
  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = 128;
  flashCanvas.height = 128;
  const flashContext = flashCanvas.getContext('2d');
  const flashGradient = flashContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  flashGradient.addColorStop(0, 'rgba(255, 252, 224, 0.98)');
  flashGradient.addColorStop(0.35, 'rgba(255, 231, 148, 0.78)');
  flashGradient.addColorStop(1, 'rgba(255, 231, 148, 0)');
  flashContext.fillStyle = flashGradient;
  flashContext.fillRect(0, 0, 128, 128);
  const flashTexture = new THREE.CanvasTexture(flashCanvas);
  flashTexture.colorSpace = THREE.SRGBColorSpace;
  const flashMaterial = new THREE.SpriteMaterial({ map: flashTexture, transparent: true, depthWrite: false });

  const items = [];
  const hitMeshes = [];
  const raycaster = new THREE.Raycaster();
  raycaster.far = SHOT_RANGE;
  const rayOrigin = new THREE.Vector3();
  const rayTarget = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  const shotDirection = new THREE.Vector3();
  const shotEndpoint = new THREE.Vector3();
  const muzzlePosition = new THREE.Vector3();
  const playerCenter = new THREE.Vector3();
  const coverOrigin = new THREE.Vector3();
  const coverTarget = new THREE.Vector3();
  const coverDirection = new THREE.Vector3();
  const coverRaycaster = new THREE.Raycaster();
  coverRaycaster.far = SHOT_RANGE;

  for (let index = 0; index < SPAWNS.length; index += 1) {
    const [spawnX, spawnZ] = SPAWNS[index];
    const group = new THREE.Group();
    group.position.set(spawnX, 0, spawnZ);

    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.position.y = 1.0;
    torso.userData.part = 'torso';
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.53;
    head.userData.part = 'head';
    const leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
    leftLeg.position.set(-0.16, 0.72, 0);
    const rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
    rightLeg.position.set(0.16, 0.72, 0);
    const leftArm = new THREE.Mesh(armGeometry, limbMaterial);
    leftArm.position.set(-0.35, 1.24, 0);
    const rightArm = new THREE.Mesh(armGeometry, limbMaterial);
    rightArm.position.set(0.35, 1.24, -0.08);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, stripeMaterial);
    leftShoulder.position.set(-0.24, 1.27, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeometry, stripeMaterial);
    rightShoulder.position.set(0.24, 1.27, 0);
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.set(0.2, 1.02, -0.28);
    const flash = new THREE.Sprite(flashMaterial);
    flash.position.set(0.2, 1.02, -0.54);
    flash.scale.setScalar(0.42);
    flash.visible = false;
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.59;
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    backpack.position.set(0, 1.06, 0.22);
    const teamStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    teamStripe.position.set(0, 1.24, 0);
    group.add(torso, head, leftLeg, rightLeg, leftArm, rightArm, leftShoulder, rightShoulder, gun, flash, helmet, backpack, teamStripe);
    group.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    scene.add(group);

    const item = {
      group,
      torso,
      head,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      flash,
      spawnX,
      spawnZ,
      route: ROUTES[index],
      routeIndex: 1,
      walkCycle: 0,
      losLeft: index * LOS_INTERVAL,
      detect: 0,
      fireIn: 0.8 + index * 0.24,
      muzzle: 0,
      reactLeft: 0,
      coverLeft: 0,
      holdLeft: 0,
      coverState: 'route',
      duck: 0,
      seenTime: 0,
      burstLeft: 0,
      coverTargetX: spawnX,
      coverTargetZ: spawnZ,
      alertX: 0,
      alertZ: 0,
      health: HEALTH,
      alive: true,
      fall: 0,
    };
    torso.userData.bot = item;
    head.userData.bot = item;
    hitMeshes.push(torso, head);
    items.push(item);
  }

  function damage(mesh, amount, incomingX = 0, incomingZ = 0, cover = [], playerState, shootables) {
    const item = mesh.userData.bot;
    if (!item || !item.alive) return false;
    item.health -= amount;
    if (item.health > 0) {
      item.alertX = incomingX;
      item.alertZ = incomingZ;
      item.coverState = 'seek';
      item.coverLeft = 0;
      item.seenTime = 0;

      let bestDistance = Number.POSITIVE_INFINITY;
      for (const [crateX, crateZ] of cover) {
        const towardCrateX = crateX - item.group.position.x;
        const towardCrateZ = crateZ - item.group.position.z;
        const crateDot = towardCrateX * incomingX + towardCrateZ * incomingZ;
        if (crateDot <= COVER_MARGIN) continue;
        const distance = towardCrateX * towardCrateX + towardCrateZ * towardCrateZ;
        if (distance >= bestDistance) continue;
        const hiddenX = crateX - incomingX * COVER_STANDOFF;
        const hiddenZ = crateZ - incomingZ * COVER_STANDOFF;
        if (visibleBetween(
          playerState.position.x,
          playerState.position.y + playerState.eye,
          playerState.position.z,
          hiddenX,
          0.86,
          hiddenZ,
          shootables,
        )) continue;
        bestDistance = distance;
        item.coverTargetX = hiddenX;
        item.coverTargetZ = hiddenZ;
        item.peekTargetX = crateX - incomingX * PEEK_STANDOFF;
        item.peekTargetZ = crateZ - incomingZ * PEEK_STANDOFF;
      }
      if (!Number.isFinite(bestDistance)) item.coverState = 'route';
      return false;
    }
    item.alive = false;
    item.fall = 0;
    item.flash.visible = false;
    item.muzzle = 0;
    return true;
  }

  function visibleBetween(startX, startY, startZ, endX, endY, endZ, shootables) {
    coverOrigin.set(startX, startY, startZ);
    coverTarget.set(endX, endY, endZ);
    coverDirection.subVectors(coverTarget, coverOrigin);
    const distance = coverDirection.length();
    if (distance > SHOT_RANGE) return false;
    coverDirection.divideScalar(distance || 1);
    coverRaycaster.set(coverOrigin, coverDirection);
    const hits = coverRaycaster.intersectObjects(shootables, false);
    return hits.length === 0 || hits[0].distance >= distance - 0.12;
  }

  function hasLineOfSight(item, playerState, shootables) {
    return visibleBetween(
      item.group.position.x,
      BOT_EYE * item.group.scale.y,
      item.group.position.z,
      playerState.position.x,
      playerState.position.y + playerState.height * 0.62,
      playerState.position.z,
      shootables,
    );
  }

  function shootAtPlayer(item, playerState, shootables, onPlayerHit, effects, audio) {
    rayOrigin.set(item.group.position.x, BOT_EYE, item.group.position.z);
    rayTarget.set(
      playerState.position.x,
      playerState.position.y + playerState.height * 0.62,
      playerState.position.z,
    );
    rayDirection.subVectors(rayTarget, rayOrigin);
    const distance = rayDirection.length();
    rayDirection.divideScalar(distance || 1);
    const movePenalty = 0.075;
    const distancePenalty = Math.min(1, distance / 26) * 0.075;
    const sightAccuracy = Math.min(1, item.seenTime / ACCURACY_TIME);
    const spread = 0.023 - sightAccuracy * 0.011 + movePenalty + distancePenalty;
    shotDirection.copy(rayDirection);
    shotDirection.x += (random() * 2 - 1) * spread;
    shotDirection.y += (random() * 2 - 1) * spread;
    shotDirection.z += (random() * 2 - 1) * spread;
    shotDirection.normalize();
    raycaster.set(rayOrigin, shotDirection);
    const hits = raycaster.intersectObjects(shootables, false);
    const wallDistance = hits.length > 0 ? hits[0].distance : Number.POSITIVE_INFINITY;
    playerCenter.set(
      playerState.position.x,
      playerState.position.y + playerState.height * 0.62,
      playerState.position.z,
    );
    if (
      raycaster.ray.distanceSqToPoint(playerCenter) <= PLAYER_RADIUS * PLAYER_RADIUS
      && distance <= wallDistance + 0.1
    ) onPlayerHit(SHOT_DAMAGE, item.group.position.x, item.group.position.z);
    if (hits.length > 0) shotEndpoint.copy(hits[0].point);
    else shotEndpoint.copy(rayOrigin).addScaledVector(shotDirection, SHOT_RANGE);
    muzzlePosition.set(0.2, 1.02, -0.54).applyMatrix4(item.group.matrixWorld);
    effects.addTracer(muzzlePosition, shotEndpoint);
    effects.addPuff(shotEndpoint);
    audio.gunshot(distance);
    item.muzzle = MUZZLE_TIME;
    item.flash.visible = true;
    item.fireIn = item.coverState === 'peek'
      ? BURST_GAP * (0.82 + random() * 0.38)
      : FIRE_GAP * (0.82 + random() * 0.38);
    if (item.coverState === 'peek') item.burstLeft -= 1;
  }

  function step(dt, playerState, shootables, combatActive, onPlayerHit, cover, effects, roundPressure, audio) {
    for (const item of items) {
      if (!item.alive) {
        item.fall = Math.min(1, item.fall + dt / FALL_TIME);
        item.group.rotation.x = -item.fall * 1.35;
        item.group.position.y = -item.fall * 0.08;
        continue;
      }

      let moveX = 0;
      let moveZ = 0;
      let duckTarget = 0;
      if (item.coverState === 'seek') {
        moveX = item.coverTargetX - item.group.position.x;
        moveZ = item.coverTargetZ - item.group.position.z;
        duckTarget = 1;
        const moveDistance = Math.hypot(moveX, moveZ);
        if (moveDistance < ARRIVE_DISTANCE) {
          item.coverState = 'covered';
          item.coverLeft = COVER_DELAY * (0.72 + random() * 0.56);
          moveX = 0;
          moveZ = 0;
        }
      } else if (item.coverState === 'covered') {
        item.coverLeft -= dt;
        duckTarget = 1;
        if (item.coverLeft <= 0 && playerState.health > 0) {
          item.coverState = 'peek';
          item.burstLeft = 2 + (random() < 0.5 ? 0 : 1);
          item.fireIn = 0.08 + random() * 0.08;
        }
      } else if (item.coverState === 'peek') {
        moveX = item.peekTargetX - item.group.position.x;
        moveZ = item.peekTargetZ - item.group.position.z;
        if (item.burstLeft <= 0) {
          item.coverState = 'seek';
        }
      } else if (roundPressure >= item.pushAt) {
        const target = PUSH_POINTS[item.pushIndex];
        moveX = target[0] - item.group.position.x;
        moveZ = target[1] - item.group.position.z;
        if (Math.hypot(moveX, moveZ) < ARRIVE_DISTANCE) {
          moveX = 0;
          moveZ = 0;
        }
      } else {
        const target = item.route[item.routeIndex];
        moveX = target[0] - item.group.position.x;
        moveZ = target[1] - item.group.position.z;
        const targetDistance = Math.hypot(moveX, moveZ);
        if (targetDistance < ARRIVE_DISTANCE) {
          item.holdLeft = HOLD_MIN + random() * HOLD_EXTRA;
          moveX = 0;
          moveZ = 0;
        }
        if (item.holdLeft > 0) {
          item.holdLeft -= dt;
          if (item.holdLeft <= 0) {
            item.routeIndex = (item.routeIndex + 1) % item.route.length;
            const next = item.route[item.routeIndex];
            moveX = next[0] - item.group.position.x;
            moveZ = next[1] - item.group.position.z;
          } else {
            moveX = 0;
            moveZ = 0;
          }
        }
      }
      item.duck += (duckTarget - item.duck) * Math.min(1, dt * 9);
      item.group.scale.y = 1 - (1 - DUCK_SCALE) * item.duck;
      const moveDistance = Math.hypot(moveX, moveZ);
      if (item.coverState !== 'covered' && moveDistance < SEPARATION_RADIUS) {
        let separationX = 0;
        let separationZ = 0;
        for (const other of items) {
          if (other === item || !other.alive) continue;
          const awayX = item.group.position.x - other.group.position.x;
          const awayZ = item.group.position.z - other.group.position.z;
          const awayDistance = Math.hypot(awayX, awayZ);
          if (awayDistance >= SEPARATION_RADIUS || awayDistance <= 0.001) continue;
          const strength = 1 - awayDistance / SEPARATION_RADIUS;
          separationX += (awayX / awayDistance) * strength;
          separationZ += (awayZ / awayDistance) * strength;
        }
        moveX += separationX;
        moveZ += separationZ;
      }
      if (moveDistance > 0.001) {
        const travel = Math.min(moveDistance, SPEED * dt);
        item.group.position.x += (moveX / moveDistance) * travel;
        item.group.position.z += (moveZ / moveDistance) * travel;
        item.group.position.y = 0;
        item.walkCycle += travel * 2.7;
      }
        item.leftLeg.rotation.x = Math.sin(item.walkCycle) * 0.58;
        item.rightLeg.rotation.x = -Math.sin(item.walkCycle) * 0.58;
        item.leftArm.rotation.x = -Math.sin(item.walkCycle) * 0.38;
        item.rightArm.rotation.x = Math.sin(item.walkCycle) * 0.22;

      item.muzzle = Math.max(0, item.muzzle - dt);
      item.flash.visible = item.muzzle > 0;
      item.losLeft = Math.max(0, item.losLeft - dt);
      if (item.losLeft === 0) {
        item.losLeft = LOS_INTERVAL;
        const visible = combatActive && playerState.health > 0 && hasLineOfSight(item, playerState, shootables);
        if (visible) {
          if (item.detect === 0) item.reactLeft = REACTION_MIN + random() * REACTION_RANGE;
          item.detect = Math.min(DETECT_TIME, item.detect + LOS_INTERVAL);
          item.seenTime = Math.min(ACCURACY_TIME + 1, item.seenTime + LOS_INTERVAL);
        } else {
          item.detect = 0;
          item.seenTime = 0;
        }
      }
      if (item.detect > 0 && item.reactLeft > 0) item.reactLeft -= dt;

      let facingX;
      let facingZ;
      if (item.detect > 0) {
        facingX = playerState.position.x - item.group.position.x;
        facingZ = playerState.position.z - item.group.position.z;
        item.fireIn -= dt;
        if (
          item.reactLeft <= 0
          && item.fireIn <= 0
          && combatActive
          && playerState.health > 0
        ) {
          shootAtPlayer(item, playerState, shootables, onPlayerHit, effects, audio);
        }
      } else {
        facingX = moveX;
        facingZ = moveZ;
        item.fireIn = Math.max(item.fireIn, 0.18);
      }
      const facingLength = Math.hypot(facingX, facingZ);
      if (facingLength > 0.001) {
        item.group.rotation.y = Math.atan2(-facingX / facingLength, -facingZ / facingLength);
      }
      item.group.updateMatrixWorld(true);
    }
  }

  function reset() {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      item.group.position.set(item.spawnX, 0, item.spawnZ);
      item.group.rotation.set(0, 0, 0);
      item.group.scale.set(1, 1, 1);
      item.routeIndex = 1;
      item.walkCycle = 0;
      item.leftLeg.rotation.set(0, 0, 0);
      item.rightLeg.rotation.set(0, 0, 0);
      item.leftArm.rotation.set(0, 0, 0);
      item.rightArm.rotation.set(0, 0, 0);
      item.losLeft = index * LOS_INTERVAL;
      item.detect = 0;
      item.fireIn = 0.8 + index * 0.24;
      item.muzzle = 0;
      item.flash.visible = false;
      item.health = HEALTH;
      item.alive = true;
      item.fall = 0;
      item.reactLeft = 0;
      item.coverLeft = 0;
      item.holdLeft = 0;
      item.coverState = 'route';
      item.duck = 0;
      item.seenTime = 0;
      item.burstLeft = 0;
      item.coverTargetX = item.spawnX;
      item.coverTargetZ = item.spawnZ;
      item.peekTargetX = item.spawnX;
      item.peekTargetZ = item.spawnZ;
      item.alertX = 0;
      item.alertZ = 0;
      item.pushIndex = index;
      item.pushAt = 0.22 + index * 0.12;
      item.group.updateMatrixWorld(true);
    }
  }

  return {
    items,
    hitMeshes,
    damage,
    step,
    reset,
    remaining() {
      let count = 0;
      for (const item of items) if (item.alive) count += 1;
      return count;
    },
  };
}
