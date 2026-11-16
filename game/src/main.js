// Boot and the one loop: a fixed 60 Hz simulation feeding a render at the display's rate.
// ?shot=start|play|end with &seed=N sets up a deterministic frame for a capture, renders it twice,
// then freezes it and sets window.__shotReady.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createArsenal } from './arsenal.js';
import { createEconomy } from './economy.js';
import { createBuyMenu } from './buy.js';
import { createBots } from './bots.js';
import { createRounds } from './rounds.js';
import { createHud } from './hud.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.sky), 34, 96);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 140);
scene.add(camera);

const world = createWorld(scene);
const effects = createEffects(scene);
const player = createPlayer(world.colliders);
const bots = createBots(scene, random);
const arsenal = createArsenal(scene);
const economy = createEconomy();
const rounds = createRounds();
const hud = createHud();
const audio = createAudio();
const weapon = createWeapon(camera, arsenal, player);
const buy = createBuyMenu({
  arsenal,
  economy,
  onClose() {
    if (!shot) input.requestLock();
  },
});
const input = createInput(renderer.domElement, onLockChange);
const raycaster = new THREE.Raycaster();
raycaster.far = 80;
const shootables = world.shootables.concat(bots.hitMeshes);
const direction = new THREE.Vector3();
const playerMuzzle = new THREE.Vector3();
const shotEndpoint = new THREE.Vector3();
const incomingDirection = new THREE.Vector3();

const body = player.state;
const markerHoldMs = shot ? 4000 : 90;
const throwOrigin = new THREE.Vector3();
const throwDirection = new THREE.Vector3();
const heldKeys = new Set();
let lastPromptSeconds = -1;
let combatActive = false;
let frozen = false;
let started = false;
let matchEnded = false;
let lastAudioPhase = '';
let accumulator = 0;
let lastTime = performance.now();

startMatch();
hud.setAmmo(arsenal.currentAmmo().mag, arsenal.currentAmmo().reserve);
hud.setEconomy(economy.state.money, arsenal.state.grenades);
hud.showOverlay('start', rounds.state);
hud.onPlay(() => {
  if (shot) return;
  audio.unlock();
  if (rounds.state.matchOver) restart();
  input.requestLock();
});

function startMatch() {
  economy.resetMatch();
  arsenal.state.owned.rifle = false;
  arsenal.state.owned.marksman = false;
  arsenal.state.armor = false;
  arsenal.state.active = 'pistol';
  rounds.beginMatch();
  spawnRound();
  rounds.state.roundReset = false;
  matchEnded = false;
  lastAudioPhase = '';
}

function restart() {
  startMatch();
}

function spawnRound() {
  player.reset();
  bots.reset();
  arsenal.beginRound();
  combatActive = false;
  hud.setAmmo(arsenal.currentAmmo().mag, arsenal.currentAmmo().reserve);
  hud.setEconomy(economy.state.money, arsenal.state.grenades);
  hud.setLoadout(arsenal.current().name, arsenal.state.armor);
  hud.setHealth(body.health);
  hud.setMatch(rounds.state.round, rounds.state.playerWins, rounds.state.botWins, rounds.state.phase, 0);
  hud.setRoundOutcome(rounds.state.lastRoundWinner, rounds.state.phase);
}

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    audio.unlock();
    hud.hideOverlay();
  } else if (buy.isOpen()) {
    return;
  } else if (rounds.state.matchOver) {
    hud.showOverlay(rounds.state.winner === 'player' ? 'win' : 'loss', rounds.state);
  } else {
    hud.showOverlay(started ? 'paused' : 'start', rounds.state);
  }
}

function syncCamera() {
  camera.position.set(body.position.x, body.position.y + body.eye, body.position.z);
  camera.rotation.set(body.pitch, body.yaw, 0, 'YXZ');
}

function shoot(spread) {
  if (!weapon.takeRound()) return false;
  camera.getWorldDirection(direction);
  direction.x += (random() * 2 - 1) * spread;
  direction.y += (random() * 2 - 1) * spread;
  direction.z += (random() * 2 - 1) * spread;
  direction.normalize();
  scene.updateMatrixWorld(true);
  raycaster.set(camera.position, direction);
  const hit = raycaster.intersectObjects(shootables, false)[0];
  shotEndpoint.copy(camera.position).addScaledVector(direction, hit ? hit.distance : 44);
  playerMuzzle.set(0.24, -0.18, -0.95).applyMatrix4(camera.matrixWorld);
  effects.addTracer(playerMuzzle, shotEndpoint);
  if (hit && hit.object.userData.bot) {
    incomingDirection.copy(direction).negate();
    const killed = bots.damage(
      hit.object,
      weapon.damage(hit.object.userData.part),
      incomingDirection.x,
      incomingDirection.z,
      world.cover,
      body,
      world.shootables,
    );
    hud.hitMarker(killed, markerHoldMs);
    if (killed) {
      economy.addKillReward();
      hud.killConfirmed(economy.killReward());
      hud.setEconomy(economy.state.money, arsenal.state.grenades);
    }
  }
  weapon.pullTrigger();
  player.recoil(0.009 + random() * 0.004, (random() * 2 - 1) * 0.004);
  hud.setAmmo(arsenal.currentAmmo().mag, arsenal.currentAmmo().reserve);
  audio.gunshot();
  return true;
}

function damagePlayer(amount, shooterX = 0, shooterZ = 0) {
  player.damage(arsenal.state.armor ? Math.ceil(amount / 2) : amount);
  const directionX = shooterX - body.position.x;
  const directionZ = shooterZ - body.position.z;
  hud.damageIndicator(Math.atan2(directionX, -directionZ));
  hud.setHealth(body.health);
}

function onGrenadeKill() {
  economy.addKillReward();
  hud.killConfirmed(economy.killReward());
  hud.setEconomy(economy.state.money, arsenal.state.grenades);
}

function keyWasPressed(code) {
  return !heldKeys.has(code) && input.state.keys.has(code);
}

function awardRoundEconomy() {
  const winner = rounds.state.lastRoundWinner;
  if (winner) economy.awardRound(winner);
}

function handleRoundReset() {
  if (!rounds.state.roundReset) return;
  awardRoundEconomy();
  spawnRound();
  rounds.state.roundReset = false;
}

function handleMatchOver() {
  if (rounds.state.matchOver && !matchEnded) {
    matchEnded = true;
    awardRoundEconomy();
    hud.showOverlay(rounds.state.winner === 'player' ? 'win' : 'loss', rounds.state);
    hud.setEconomy(economy.state.money, arsenal.state.grenades);
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

function startNextRound() {
  playPhaseAudio();
  handleRoundReset();
}

function playPhaseAudio() {
  if (rounds.state.phase === lastAudioPhase) return;
  if (rounds.state.phase === 'combat') audio.roundStart();
  else if (rounds.state.phase === 'roundEnd') audio.roundEnd(rounds.state.lastRoundWinner);
  lastAudioPhase = rounds.state.phase;
}

function handleControls() {
  const keys = input.state.keys;
  if (keyWasPressed('KeyB') && rounds.state.phase === 'buy' && !rounds.state.matchOver) {
    buy.toggle();
    if (buy.isOpen() && document.pointerLockElement) document.exitPointerLock();
  }
  if (combatActive && !buy.isOpen()) {
    if (keyWasPressed('Digit1')) arsenal.selectWeapon('pistol');
    if (keyWasPressed('Digit2')) arsenal.selectWeapon('rifle');
    if (keyWasPressed('Digit3')) arsenal.selectWeapon('marksman');
    if (keyWasPressed('KeyQ')) {
      throwOrigin.set(body.position.x, body.position.y + body.eye, body.position.z);
      camera.getWorldDirection(throwDirection);
      if (arsenal.throwGrenade(throwOrigin, throwDirection)) {
        hud.setEconomy(economy.state.money, arsenal.state.grenades);
      }
    }
  }
  for (const key of keys) heldKeys.add(key);
  for (const key of heldKeys) if (!keys.has(key)) heldKeys.delete(key);
}

function step(dt) {
  if (rounds.state.phase === 'roundEnd') {
    rounds.step(dt);
    effects.step(dt);
    if (rounds.state.phase !== 'roundEnd') startNextRound();
    handleMatchOver();
    return;
  }

  handleRoundReset();

  combatActive = rounds.state.phase === 'combat';
  if (combatActive) {
    player.step(dt, input.state.keys);
  } else {
    body.velocity.set(0, 0, 0);
  }
  weapon.step(dt, player.groundSpeed());
  bots.step(dt, body, world.shootables, combatActive, damagePlayer, world.cover, effects, rounds.pressure(), audio);
  if (combatActive) {
    arsenal.updateGrenades(dt, bots.items, onGrenadeKill);
    arsenal.updateBomb(dt, body.position, input.state.keys.has('KeyE'));
    if (arsenal.state.bomb.planted) audio.bombTick(dt, arsenal.state.bomb.fuse);
  }
  rounds.step(dt, body.health > 0, bots.remaining(), arsenal.state.bomb.outcome, arsenal.state.bomb.planted);
  effects.step(dt);
  playPhaseAudio();

  handleMatchOver();
}

function updateHud() {
  hud.setAmmo(arsenal.currentAmmo().mag, arsenal.currentAmmo().reserve);
  hud.setEconomy(economy.state.money, arsenal.state.grenades);
  hud.setMatch(
    rounds.state.round,
    rounds.state.playerWins,
    rounds.state.botWins,
    rounds.state.phase,
    Math.ceil(rounds.remainingTime()),
  );
  hud.setLoadout(arsenal.current().name, arsenal.state.armor);
  hud.setRoundOutcome(rounds.state.lastRoundWinner, rounds.state.phase);
  const bomb = arsenal.state.bomb;
  if (bomb.planted) {
    const seconds = Math.ceil(bomb.fuse);
    if (seconds !== lastPromptSeconds) {
      lastPromptSeconds = seconds;
      hud.setBombPrompt(`Bomb detonates in ${seconds}s`);
    }
  } else if (combatActive && body.position.distanceTo(arsenal.bombZone) <= arsenal.bombZoneRadius) {
    const progressTick = Math.floor(bomb.progress * 10);
    if (progressTick !== lastPromptSeconds) {
      lastPromptSeconds = progressTick;
      hud.setBombPrompt(`Hold E to plant (${(progressTick / 10).toFixed(1)}/3s)`);
    }
  } else {
    hud.setBombPrompt('');
    lastPromptSeconds = -1;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!frozen && input.state.locked) {
    const look = input.takeLook();
    player.look(look.x, look.y);
    handleControls();
    if (input.state.firing && combatActive && weapon.ready()) {
      shoot(weapon.spread(player.groundSpeed()));
    }
    if (input.state.keys.has('KeyR') && combatActive && keyWasPressed('KeyR') && weapon.reload()) audio.reload();
    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
    updateHud();
  }
  renderer.render(scene, camera);
}

function settle(steps) {
  for (let index = 0; index < steps; index += 1) step(FIXED_STEP);
}

function runShot(name) {
  hud.hideOverlay();
  if (name === 'play' || name === 'end') {
    rounds.state.phase = 'combat';
    rounds.state.phaseTime = 0;
  }
  body.pitch = 0;
  body.yaw = 0;
  if (name === 'play' || name === 'end') {
    body.position.set(0, 0, -5);
    settle(20);
    const count = name === 'play' ? 1 : bots.items.length;
    for (let index = 0; index < count; index += 1) {
      for (let burst = 0; burst < 3; burst += 1) {
        const target = new THREE.Vector3(
          bots.items[index].group.position.x,
          bots.items[index].group.position.y + 1.53,
          bots.items[index].group.position.z,
        );
        aimAt(target);
        shoot(0);
        if (burst < 2) settle(8);
      }
    }
    if (name === 'play') settle(12);
    else settle(40);
  } else {
    body.position.set(0.6, 0, 8.6);
    settle(20);
    aimAt(new THREE.Vector3(0, 1.5, -6));
    hud.showOverlay('start', rounds.state);
  }
  updateHud();
  hud.setAmmo(arsenal.currentAmmo().mag, arsenal.currentAmmo().reserve);
  paintTwiceThenReady();
}

function aimAt(point) {
  const dx = point.x - body.position.x;
  const dy = point.y - (body.position.y + body.eye);
  const dz = point.z - body.position.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  body.yaw = Math.atan2(-dx, -dz);
  body.pitch = Math.asin(Math.max(-1, Math.min(1, dy / length)));
  syncCamera();
}

function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint);
    syncCamera();
    renderer.render(scene, camera);
    painted += 1;
    if (painted === 2) {
      window.__shotReady = true;
      frozen = true;
    }
  }
  requestAnimationFrame(paint);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();
if (shot) runShot(shot);
else requestAnimationFrame(frame);
