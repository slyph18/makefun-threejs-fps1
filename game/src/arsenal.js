// Inventory, weapon numbers, grenades and the bomb objective. The model and effects stay in
// weapon.js; simulation-facing state is initialized here and reused every round.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export const WEAPON_IDS = ['pistol', 'rifle', 'marksman'];

const WEAPONS = {
  pistol: {
    name: 'Pistol', cost: 0, damage: 25, fireGap: 0.23, reload: 1.25,
    mag: 12, reserve: 48, spreadStill: 0.004, spreadMoving: 0.018,
  },
  rifle: {
    name: 'Rifle', cost: 2700, damage: 34, fireGap: 0.096, reload: 1.9,
    mag: 30, reserve: 90, spreadStill: 0.0022, spreadMoving: 0.028,
  },
  marksman: {
    name: 'Marksman', cost: 4600, damage: 72, fireGap: 1.15, reload: 2.4,
    mag: 8, reserve: 24, spreadStill: 0.0008, spreadMoving: 0.014,
  },
};

const GRENADES_PER_ROUND = 2;
const GRENADE_DAMAGE = 92;
const GRENADE_RADIUS = 4.8;
const GRENADE_GRAVITY = 13;
const GRENADE_THROW_SPEED = 13;
const GRENADE_THROW_GAP = 0.65;
const EXPLOSION_TIME = 0.25;
const BOMB_ZONE = new THREE.Vector3(-7.6, 0, -6.2);
const BOMB_ZONE_RADIUS = 3.4;
const PLANT_TIME = 3;
const BOMB_FUSE = 25;
const MAX_GRENADES = GRENADES_PER_ROUND;

export function createArsenal(scene) {
  const state = {
    active: 'pistol',
    owned: { pistol: true, rifle: false, marksman: false },
    ammo: { pistol: { mag: WEAPONS.pistol.mag, reserve: WEAPONS.pistol.reserve } },
    cooldown: 0,
    reloadLeft: 0,
    flash: 0,
    kick: 0,
    grenades: 0,
    grenadeCooldown: 0,
    armor: false,
    bomb: {
      carried: true,
      planted: false,
      progress: 0,
      fuse: BOMB_FUSE,
      plantedAt: new THREE.Vector3(),
      outcome: '',
    },
  };

  const bombMarker = new THREE.Mesh(
    new THREE.RingGeometry(BOMB_ZONE_RADIUS - 0.2, BOMB_ZONE_RADIUS, 48),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.accent),
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  bombMarker.rotation.x = -Math.PI / 2;
  bombMarker.position.set(BOMB_ZONE.x, 0.04, BOMB_ZONE.z);
  scene.add(bombMarker);

  const bombMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.18, 0.24),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.45, metalness: 0.2 }),
  );
  bombMesh.visible = false;
  scene.add(bombMesh);

  const grenadeMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.hairline),
    roughness: 0.5,
    metalness: 0.25,
  });
  const explosionMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.muted),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const grenades = [];
  for (let index = 0; index < MAX_GRENADES; index += 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), grenadeMaterial);
    mesh.visible = false;
    const explosion = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), explosionMaterial.clone());
    explosion.visible = false;
    scene.add(mesh, explosion);
    grenades.push({
      mesh,
      explosion,
      velocity: new THREE.Vector3(),
      life: 0,
      explodeLeft: 0,
      exploded: false,
    });
  }

  function current() {
    return WEAPONS[state.active];
  }

  function currentAmmo() {
    return state.ammo[state.active];
  }

  function selectWeapon(id) {
    if (!state.owned[id] || state.active === id) return false;
    state.active = id;
    state.cooldown = Math.max(state.cooldown, 0.25);
    state.reloadLeft = 0;
    return true;
  }

  function buyWeapon(id) {
    if (!state.owned[id]) {
      state.owned[id] = true;
      state.ammo[id] = { mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve };
    }
    state.active = id;
    state.reloadLeft = 0;
  }

  function buyArmor() {
    state.armor = true;
  }

  function buyGrenade() {
    state.grenades = Math.min(MAX_GRENADES, state.grenades + 1);
  }

  function beginRound() {
    for (const id of WEAPON_IDS) {
      if (state.owned[id]) state.ammo[id] = { mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve };
    }
    state.cooldown = 0;
    state.reloadLeft = 0;
    state.grenades = 0;
    state.grenadeCooldown = 0;
    state.bomb.carried = true; // re-asserted each round start; field kept in initial state below
    state.bomb.planted = false;
    state.bomb.progress = 0;
    state.bomb.fuse = BOMB_FUSE;
    state.bomb.plantedAt.set(BOMB_ZONE.x, 0, BOMB_ZONE.z);
    state.bomb.outcome = '';
    bombMesh.visible = false;
    bombMarker.material.opacity = 0.16;
    for (const grenade of grenades) {
      grenade.mesh.visible = false;
      grenade.explosion.visible = false;
      grenade.life = 0;
      grenade.explodeLeft = 0;
      grenade.exploded = false;
    }
  }

  function throwGrenade(origin, direction) {
    if (state.grenades <= 0 || state.grenadeCooldown > 0) return false;
    const grenade = grenades[0].mesh.visible || grenades[0].exploded
      ? grenades[1]
      : grenades[0];
    grenade.mesh.visible = true;
    grenade.mesh.position.copy(origin);
    grenade.velocity.copy(direction).multiplyScalar(GRENADE_THROW_SPEED);
    grenade.velocity.y += 2.6;
    grenade.life = 0;
    grenade.exploded = false;
    grenade.explodeLeft = 0;
    grenade.explosion.visible = false;
    state.grenades -= 1;
    state.grenadeCooldown = GRENADE_THROW_GAP;
    return true;
  }

  function explode(grenade, botItems, onKill) {
    grenade.exploded = true;
    grenade.explodeLeft = EXPLOSION_TIME;
    grenade.explosion.visible = true;
    grenade.explosion.position.copy(grenade.mesh.position);
    for (const bot of botItems) {
      if (!bot.alive) continue;
      const distance = Math.hypot(
        bot.group.position.x - grenade.mesh.position.x,
        bot.group.position.y + 1 - grenade.mesh.position.y,
        bot.group.position.z - grenade.mesh.position.z,
      );
      if (distance > GRENADE_RADIUS) continue;
      const falloff = 1 - Math.min(1, distance / GRENADE_RADIUS);
      const killed = botsDamage(bot, GRENADE_DAMAGE * (0.35 + 0.65 * falloff));
      if (killed) onKill();
    }
  }

  function botsDamage(bot, amount) {
    bot.health -= amount;
    if (bot.health > 0) return false;
    bot.alive = false;
    bot.fall = 0;
    bot.flash.visible = false;
    bot.muzzle = 0;
    return true;
  }

  function updateGrenades(dt, botItems, onKill) {
    for (const grenade of grenades) {
      if (grenade.explodeLeft > 0) {
        grenade.explodeLeft = Math.max(0, grenade.explodeLeft - dt);
        const blend = 1 - grenade.explodeLeft / EXPLOSION_TIME;
        grenade.explosion.scale.setScalar(1 + blend * GRENADE_RADIUS);
        grenade.explosion.material.opacity = 0.9 * (1 - blend);
        if (grenade.explodeLeft === 0) grenade.mesh.visible = false;
        continue;
      }
      if (!grenade.mesh.visible || grenade.exploded) continue;
      grenade.velocity.y -= GRENADE_GRAVITY * dt;
      grenade.mesh.position.addScaledVector(grenade.velocity, dt);
      grenade.life += dt;
      if (grenade.mesh.position.y <= 0.09) {
        grenade.mesh.position.y = 0.09;
        grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.38;
        grenade.velocity.x *= 0.68;
        grenade.velocity.z *= 0.68;
      }
      if (grenade.life >= 2.2) explode(grenade, botItems, onKill);
    }
  }

  function updateBomb(dt, playerPosition, plantingHeld) {
    const bomb = state.bomb;
    bomb.outcome = '';
    if (!bomb.planted) {
      const inside = playerPosition.distanceTo(BOMB_ZONE) <= BOMB_ZONE_RADIUS;
      if (inside && plantingHeld) {
        bomb.progress = Math.min(PLANT_TIME, bomb.progress + dt);
        if (bomb.progress === PLANT_TIME) {
          bomb.planted = true;
          bomb.fuse = BOMB_FUSE;
          bombMesh.visible = true;
          bombMesh.position.copy(bomb.plantedAt).setY(0.1);
        }
      } else {
        bomb.progress = Math.max(0, bomb.progress - dt * 1.6);
      }
      return;
    }

    bomb.fuse -= dt;
    bombMarker.material.opacity = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(bomb.fuse * 9));
    if (bomb.fuse <= 0) {
      bomb.outcome = 'player';
      bomb.planted = false;
      bombMesh.visible = false;
      bombMarker.material.opacity = 0.16;
    }
  }

  return {
    state,
    current,
    currentAmmo,
    selectWeapon,
    buyWeapon,
    buyArmor,
    buyGrenade,
    beginRound,
    throwGrenade,
    updateGrenades,
    updateBomb,
    bombZone: BOMB_ZONE,
    bombZoneRadius: BOMB_ZONE_RADIUS,
  };
}
