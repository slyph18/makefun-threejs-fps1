// One reusable effects pool. Nothing here allocates after startup; tracers and puffs
// borrow fixed meshes so sustained fire does not create garbage each frame.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const TRACER_COUNT = 24;
const PUFF_COUNT = 20;
const TRACER_TIME = 0.08;
const PUFF_TIME = 0.26;

export function createEffects(scene) {
  const tracerGeometry = new THREE.BoxGeometry(1, 1, 1);
  const tracerMeshes = [];
  for (let index = 0; index < TRACER_COUNT; index += 1) {
    const mesh = new THREE.Mesh(
      tracerGeometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.tracer),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    );
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    tracerMeshes.push({ mesh, life: 0 });
  }

  const puffGeometry = new THREE.SphereGeometry(0.1, 8, 6);
  const puffMeshes = [];
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
    puffMeshes.push({ mesh, life: 0 });
  }

  let tracerCursor = 0;
  let puffCursor = 0;
  const tracerMidpoint = new THREE.Vector3();

  function addTracer(origin, target) {
    const tracer = tracerMeshes[tracerCursor];
    tracerCursor = (tracerCursor + 1) % TRACER_COUNT;
    tracerMidpoint.addVectors(origin, target).multiplyScalar(0.5);
    tracer.mesh.position.copy(tracerMidpoint);
    tracer.mesh.lookAt(target);
    tracer.mesh.scale.set(0.013, 0.013, origin.distanceTo(target) || 0.001);
    tracer.mesh.material.color.set(PALETTE.tracer);
    tracer.mesh.material.opacity = 0.95;
    tracer.mesh.visible = true;
    tracer.life = TRACER_TIME;
  }

  function addPuff(position) {
    const puff = puffMeshes[puffCursor];
    puffCursor = (puffCursor + 1) % PUFF_COUNT;
    puff.mesh.position.copy(position);
    puff.mesh.visible = true;
    puff.mesh.scale.setScalar(0.24);
    puff.mesh.material.opacity = 0.62;
    puff.life = PUFF_TIME;
  }

  function step(dt) {
    for (const tracer of tracerMeshes) {
      if (tracer.life <= 0) continue;
      tracer.life -= dt;
      tracer.mesh.material.opacity = 0.95 * Math.max(0, tracer.life / TRACER_TIME);
      if (tracer.life <= 0) tracer.mesh.visible = false;
    }
    for (const puff of puffMeshes) {
      if (puff.life <= 0) continue;
      puff.life -= dt;
      const blend = 1 - Math.max(0, puff.life / PUFF_TIME);
      puff.mesh.scale.setScalar(0.24 + blend * 0.86);
      puff.mesh.material.opacity = 0.62 * (1 - blend);
      if (puff.life <= 0) puff.mesh.visible = false;
    }
  }

  return { addTracer, addPuff, step };
}
