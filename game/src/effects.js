// A reusable effects pool. Tracers and impact puffs borrow a fixed set of meshes, so
// sustained fire does not allocate scene objects or generate garbage during gameplay.

import * as THREE from 'three';
import { PALETTE } from './palette.js';

const TRACER_COUNT = 24;
const PUFF_COUNT = 20;
const TRACER_TIME = 0.08;
const PUFF_TIME = 0.26;
const TRACER_OPACITY = 0.95;
const PUFF_OPACITY = 0.62;
const PUFF_START_SIZE = 0.24;
const PUFF_END_SIZE = 1.1;

export function createEffects(scene) {
  const tracerGeometry = new THREE.BoxGeometry(1, 1, 1);
  const tracers = [];

  for (let index = 0; index < TRACER_COUNT; index += 1) {
    const mesh = new THREE.Mesh(
      tracerGeometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.tracer),
        transparent: true,
        opacity: TRACER_OPACITY,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    );
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    tracers.push({ mesh, life: 0 });
  }

  const puffGeometry = new THREE.SphereGeometry(0.1, 8, 6);
  const puffs = [];

  for (let index = 0; index < PUFF_COUNT; index += 1) {
    const mesh = new THREE.Mesh(
      puffGeometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.muted),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    puffs.push({ mesh, life: 0 });
  }

  let tracerCursor = 0;
  let puffCursor = 0;
  const tracerMidpoint = new THREE.Vector3();

  function nextTracer() {
    const tracer = tracers[tracerCursor];
    tracerCursor = (tracerCursor + 1) % TRACER_COUNT;
    return tracer;
  }

  function nextPuff() {
    const puff = puffs[puffCursor];
    puffCursor = (puffCursor + 1) % PUFF_COUNT;
    return puff;
  }

  function addTracer(origin, target) {
    const tracer = nextTracer();
    tracerMidpoint.addVectors(origin, target).multiplyScalar(0.5);
    tracer.mesh.position.copy(tracerMidpoint);
    tracer.mesh.lookAt(target);
    tracer.mesh.scale.set(0.013, 0.013, origin.distanceTo(target) || 0.001);
    tracer.mesh.material.color.set(PALETTE.tracer);
    tracer.mesh.material.opacity = TRACER_OPACITY;
    tracer.mesh.visible = true;
    tracer.life = TRACER_TIME;
  }

  function addPuff(position) {
    const puff = nextPuff();
    puff.mesh.position.copy(position);
    puff.mesh.visible = true;
    puff.mesh.scale.setScalar(PUFF_START_SIZE);
    puff.mesh.material.opacity = PUFF_OPACITY;
    puff.life = PUFF_TIME;
  }

  function updateTracers(dt) {
    for (const tracer of tracers) {
      if (tracer.life <= 0) continue;

      tracer.life -= dt;
      tracer.mesh.material.opacity = TRACER_OPACITY * Math.max(0, tracer.life / TRACER_TIME);
      if (tracer.life <= 0) {
        tracer.mesh.visible = false;
      }
    }
  }

  function updatePuffs(dt) {
    for (const puff of puffs) {
      if (puff.life <= 0) continue;

      puff.life -= dt;
      const elapsed = 1 - Math.max(0, puff.life / PUFF_TIME);
      puff.mesh.scale.setScalar(PUFF_START_SIZE + elapsed * (PUFF_END_SIZE - PUFF_START_SIZE));
      puff.mesh.material.opacity = PUFF_OPACITY * (1 - elapsed);
      if (puff.life <= 0) {
        puff.mesh.visible = false;
      }
    }
  }

  return {
    addTracer,
    addPuff,
    step(dt) {
      updateTracers(dt);
      updatePuffs(dt);
    },
  };
}
