// First-person weapon view model and firing feel. Weapon rules and ammunition
// live in arsenal.js; this module only presents and consumes them.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const MUZZLE_TIME = 0.06;
const WEAPON_BASE_Z = {
  pistol: -0.34,
  rifle: -0.38,
  marksman: -0.45,
};

const BODY_COLOR = '#2c333b';
const FURNITURE_COLOR = '#3a4149';
const DARK_METAL_COLOR = '#15181d';

export function createWeapon(camera, arsenal, playerState) {
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(BODY_COLOR),
    roughness: 0.38,
    metalness: 0.46,
  });
  const furnitureMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(FURNITURE_COLOR),
    roughness: 0.8,
    metalness: 0.08,
  });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DARK_METAL_COLOR),
    roughness: 0.34,
    metalness: 0.68,
  });

  const model = new THREE.Group();
  const weaponModels = {};

  function addBox(parent, material, width, height, depth, x, y, z, rotationX = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rotationX;
    parent.add(mesh);
    return mesh;
  }

  function buildPistol() {
    const pistol = new THREE.Group();
    addBox(pistol, bodyMaterial, 0.058, 0.084, 0.24, 0, 0, -0.02);
    addBox(pistol, darkMetalMaterial, 0.048, 0.05, 0.3, 0, 0.036, -0.04);
    addBox(pistol, darkMetalMaterial, 0.02, 0.02, 0.048, 0, 0.036, -0.21);
    addBox(pistol, furnitureMaterial, 0.046, 0.155, 0.09, 0, -0.105, 0.085, 0.18);
    addBox(pistol, furnitureMaterial, 0.052, 0.028, 0.09, 0, -0.024, 0.045);
    return pistol;
  }

  function buildRifle() {
    const rifle = new THREE.Group();
    addBox(rifle, bodyMaterial, 0.078, 0.11, 0.37, 0, 0, 0.04);
    addBox(rifle, furnitureMaterial, 0.064, 0.08, 0.32, 0, -0.006, -0.36);
    addBox(rifle, darkMetalMaterial, 0.03, 0.03, 0.3, 0, 0.014, -0.64);
    addBox(rifle, darkMetalMaterial, 0.058, 0.215, 0.12, 0, -0.155, 0.025, 0.1);
    addBox(rifle, furnitureMaterial, 0.066, 0.115, 0.26, 0, -0.006, 0.35);
    addBox(rifle, darkMetalMaterial, 0.052, 0.062, 0.17, 0, 0.088, -0.03);
    addBox(rifle, furnitureMaterial, 0.086, 0.055, 0.11, 0, -0.042, -0.13);
    return rifle;
  }

  function buildMarksman() {
    const marksman = new THREE.Group();
    addBox(marksman, bodyMaterial, 0.07, 0.096, 0.48, 0, 0, 0.06);
    addBox(marksman, darkMetalMaterial, 0.028, 0.028, 0.4, 0, 0.01, -0.54);
    addBox(marksman, darkMetalMaterial, 0.068, 0.09, 0.22, 0, 0.115, -0.01);
    addBox(marksman, darkMetalMaterial, 0.046, 0.185, 0.1, 0, -0.14, 0.02, 0.07);
    addBox(marksman, furnitureMaterial, 0.08, 0.13, 0.3, 0, -0.01, 0.4);
    addBox(marksman, furnitureMaterial, 0.09, 0.06, 0.13, 0, -0.038, -0.1);
    return marksman;
  }

  weaponModels.pistol = buildPistol();
  weaponModels.rifle = buildRifle();
  weaponModels.marksman = buildMarksman();
  model.add(weaponModels.pistol, weaponModels.rifle, weaponModels.marksman);
  model.position.set(0.27, -0.28, WEAPON_BASE_Z.pistol);
  camera.add(model);

  const flashTexture = createMuzzleFlashTexture();
  const muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTexture,
    transparent: true,
    depthWrite: false,
  }));
  muzzleFlash.scale.setScalar(0.36);
  muzzleFlash.position.set(0.24, -0.18, -0.95);
  muzzleFlash.visible = false;
  camera.add(muzzleFlash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.tracer), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  let activeId = '';
  let activeBaseZ = WEAPON_BASE_Z.pistol;
  let swayTime = 0;

  function selectModel(id) {
    weaponModels.pistol.visible = id === 'pistol';
    weaponModels.rifle.visible = id === 'rifle';
    weaponModels.marksman.visible = id === 'marksman';
    activeBaseZ = WEAPON_BASE_Z[id];
    model.position.set(0.27, -0.28, activeBaseZ);
  }

  function finishReload() {
    const ammo = arsenal.currentAmmo();
    const missing = arsenal.current().mag - ammo.mag;
    const transfer = Math.min(missing, ammo.reserve);
    ammo.mag += transfer;
    ammo.reserve -= transfer;
  }

  function step(dt, speed = playerState?.groundSpeed() ?? 0) {
    const state = arsenal.state;

    if (state.active !== activeId) {
      activeId = state.active;
      selectModel(activeId);
      muzzleFlash.visible = false;
      flashLight.intensity = 0;
    }

    state.cooldown = Math.max(0, state.cooldown - dt);
    state.grenadeCooldown = Math.max(0, state.grenadeCooldown - dt);
    state.kick += -state.kick * Math.min(1, dt * 14);

    const movement = Math.min(1, speed / 5.2);
    const swayX = Math.sin(swayTime * 7.2) * 0.0075 * movement;
    const swayY = Math.abs(Math.cos(swayTime * 7.2)) * 0.0052 * movement;
    const idleRotation = Math.sin(swayTime * 3.6);
    swayTime += dt;

    model.position.set(0.24 + swayX, -0.25 + swayY, activeBaseZ + state.kick);
    model.rotation.set(state.kick * 2.2, idleRotation * 0.018 * movement, idleRotation * 0.015 * movement);

    if (state.reloadLeft > 0) {
      const reloadProgress = 1 - Math.min(1, state.reloadLeft / arsenal.current().reload);
      model.rotation.x = -0.55 * reloadProgress;
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      if (state.reloadLeft === 0) finishReload();
    }

    muzzleFlash.visible = state.flash > 0;
    muzzleFlash.material.rotation = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    state.flash = Math.max(0, state.flash - dt);
  }

  return {
    step,

    ready() {
      const state = arsenal.state;
      const ammo = arsenal.currentAmmo();
      return ammo.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },

    pullTrigger() {
      const state = arsenal.state;
      const weapon = arsenal.current();
      state.cooldown = weapon.fireGap;
      state.flash = MUZZLE_TIME;
      state.kick = weapon.fireGap > 0.5 ? 0.1 : 0.055;
    },

    takeRound() {
      const ammo = arsenal.currentAmmo();
      if (ammo.mag <= 0) return false;
      ammo.mag -= 1;
      return true;
    },

    reload() {
      const state = arsenal.state;
      const ammo = arsenal.currentAmmo();
      const weapon = arsenal.current();
      const canReload = state.reloadLeft === 0
        && ammo.mag !== weapon.mag
        && ammo.reserve !== 0;
      if (!canReload) return false;
      state.reloadLeft = weapon.reload;
      return true;
    },

    spread(speed) {
      const weapon = arsenal.current();
      return weapon.spreadStill + Math.min(1, speed / 5.2) * weapon.spreadMoving;
    },

    damage(part) {
      const weapon = arsenal.current();
      return part === 'head' ? weapon.damage * 2 : weapon.damage;
    },
  };
}

function createMuzzleFlashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 252, 224, 0.98)');
  gradient.addColorStop(0.35, 'rgba(255, 234, 160, 0.72)');
  gradient.addColorStop(1, 'rgba(255, 234, 160, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
