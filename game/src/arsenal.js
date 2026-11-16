// Player inventory, weapon performance, grenades, and the bomb objective.
// Visual weapon models live in weapon.js; this module owns simulation state.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export const WEAPON_IDS = ['pistol', 'rifle', 'marksman'];

const WEAPONS = {
  pistol: {
    name: 'Pistol',
    cost: 0,
    damage: 25,
    fireGap: 0.23,
    reload: 1.25,
    mag: 12,
    reserve: 48,
    spreadStill: 0.004,
    spreadMoving: 0.018,
  },
  rifle: {
    name: 'Rifle',
    cost: 2700,
    damage: 34,
    fireGap: 0.096,
    reload: 1.9,
    mag: 30,
    reserve: 90,
    spreadStill: 0.0022,
    spreadMoving: 0.028,
  },
  marksman: {
    name: 'Marksman',
    cost: 4600,
    damage: 72,
    fireGap: 1.15,
    reload: 2.4,
    mag: 8,
    reserve: 24,
    spreadStill: 0.0008,
    spreadMoving: 0.014,
  },
};

const GRENADES_PER_ROUND = 2;
const GRENADE_DAMAGE = 92;
const GRENADE_RADIUS = 4.8;
const GRENADE_GRAVITY = 13;
const GRENADE_THROW_SPEED = 13;
const GRENADE_THROW_GAP = 0.65;
const GRENADE_FUSE = 2.2;
const GRENADE_REST_HEIGHT = 0.09;
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
    ammo: { pistol: createAmmo('pistol') },
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

  const bombMarker = createBombMarker();
  scene.add(bombMarker);
  const bombMesh = createBombMesh();
  scene.add(bombMesh);
  const grenadeProjectiles = createGrenadeProjectiles();
  for (const { mesh, explosion } of grenadeProjectiles) scene.add(mesh, explosion);

  function createAmmo(id) {
    return { mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve };
  }

  function createBombMarker() {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(BOMB_ZONE_RADIUS - 0.2, BOMB_ZONE_RADIUS, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.accent),
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(BOMB_ZONE.x, 0.04, BOMB_ZONE.z);
    return marker;
  }

  function createBombMesh() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.18, 0.24),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(PALETTE.ink),
        roughness: 0.45,
        metalness: 0.2,
      }),
    );
    mesh.visible = false;
    return mesh;
  }

  function createGrenadeProjectiles() {
    const material = new THREE.MeshStandardMaterial({
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

    return Array.from({ length: MAX_GRENADES }, () => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), material);
      mesh.visible = false;
      const explosion = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        explosionMaterial.clone(),
      );
      explosion.visible = false;
      return {
        mesh,
        explosion,
        velocity: new THREE.Vector3(),
        life: 0,
        explodeLeft: 0,
        exploded: false,
      };
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
      state.ammo[id] = createAmmo(id);
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
      if (state.owned[id]) state.ammo[id] = createAmmo(id);
    }
    state.cooldown = 0;
    state.reloadLeft = 0;
    state.grenades = 0;
    state.grenadeCooldown = 0;
    state.bomb.carried = true;
    state.bomb.planted = false;
    state.bomb.progress = 0;
    state.bomb.fuse = BOMB_FUSE;
    state.bomb.plantedAt.set(BOMB_ZONE.x, 0, BOMB_ZONE.z);
    state.bomb.outcome = '';
    bombMesh.visible = false;
    bombMarker.material.opacity = 0.16;

    for (const projectile of grenadeProjectiles) {
      projectile.mesh.visible = false;
      projectile.explosion.visible = false;
      projectile.life = 0;
      projectile.explodeLeft = 0;
      projectile.exploded = false;
    }
  }

  function throwGrenade(origin, direction) {
    if (state.grenades <= 0 || state.grenadeCooldown > 0) return false;

    const first = grenadeProjectiles[0];
    const second = grenadeProjectiles[1];
    const projectile = first.mesh.visible || first.exploded ? second : first;
    projectile.mesh.visible = true;
    projectile.mesh.position.copy(origin);
    projectile.velocity.copy(direction).multiplyScalar(GRENADE_THROW_SPEED);
    projectile.velocity.y += 2.6;
    projectile.life = 0;
    projectile.exploded = false;
    projectile.explodeLeft = 0;
    projectile.explosion.visible = false;
    state.grenades -= 1;
    state.grenadeCooldown = GRENADE_THROW_GAP;
    return true;
  }

  function applyBotDamage(bot, amount) {
    bot.health -= amount;
    if (bot.health > 0) return false;

    bot.alive = false;
    bot.fall = 0;
    bot.flash.visible = false;
    bot.muzzle = 0;
    return true;
  }

  function explode(projectile, botItems, onKill) {
    projectile.exploded = true;
    projectile.explodeLeft = EXPLOSION_TIME;
    projectile.explosion.visible = true;
    projectile.explosion.position.copy(projectile.mesh.position);

    for (const bot of botItems) {
      if (!bot.alive) continue;
      const distance = Math.hypot(
        bot.group.position.x - projectile.mesh.position.x,
        bot.group.position.y + 1 - projectile.mesh.position.y,
        bot.group.position.z - projectile.mesh.position.z,
      );
      if (distance > GRENADE_RADIUS) continue;

      const falloff = 1 - Math.min(1, distance / GRENADE_RADIUS);
      const damage = GRENADE_DAMAGE * (0.35 + 0.65 * falloff);
      if (applyBotDamage(bot, damage)) onKill();
    }
  }

  function updateGrenades(dt, botItems, onKill) {
    for (const projectile of grenadeProjectiles) {
      if (projectile.explodeLeft > 0) {
        projectile.explodeLeft = Math.max(0, projectile.explodeLeft - dt);
        const progress = 1 - projectile.explodeLeft / EXPLOSION_TIME;
        projectile.explosion.scale.setScalar(1 + progress * GRENADE_RADIUS);
        projectile.explosion.material.opacity = 0.9 * (1 - progress);
        if (projectile.explodeLeft === 0) projectile.mesh.visible = false;
        continue;
      }

      if (!projectile.mesh.visible || projectile.exploded) continue;
      projectile.velocity.y -= GRENADE_GRAVITY * dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.life += dt;

      if (projectile.mesh.position.y <= GRENADE_REST_HEIGHT) {
        projectile.mesh.position.y = GRENADE_REST_HEIGHT;
        projectile.velocity.y = Math.abs(projectile.velocity.y) * 0.38;
        projectile.velocity.x *= 0.68;
        projectile.velocity.z *= 0.68;
      }

      if (projectile.life >= GRENADE_FUSE) {
        explode(projectile, botItems, onKill);
      }
    }
  }

  function updateBomb(dt, playerPosition, plantingHeld) {
    const bomb = state.bomb;
    bomb.outcome = '';

    if (!bomb.planted) {
      const insideZone = playerPosition.distanceTo(BOMB_ZONE) <= BOMB_ZONE_RADIUS;
      if (insideZone && plantingHeld) {
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
    const pulse = 0.5 + 0.5 * Math.sin(bomb.fuse * 9);
    bombMarker.material.opacity = 0.12 + 0.12 * pulse;
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
