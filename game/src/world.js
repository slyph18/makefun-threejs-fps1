// Steel Corridor has two outer lanes and a central connector. Every cover box blocks
// movement and bullets, while gaps intentionally preserve peeks and flanking routes.

import * as THREE from 'three';
import { PALETTE } from './palette.js';

const SKY_TOP = '#7c94b8';
const SKY_MIDDLE = '#a8b6bd';
const SKY_BOTTOM = '#5e6672';
const SKY_COLOR = '#7e8794';

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const materials = {};

  function createCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }

  function canvasTexture(draw, repeatX = 1, repeatY = 1, size = 128) {
    const canvas = createCanvas(size);
    const context = canvas.getContext('2d');
    draw(context);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }

  function speckle(context, color, count, size = 1) {
    context.fillStyle = color;
    for (let index = 0; index < count; index += 1) {
      context.fillRect((index * 41) % 127, (index * 73) % 127, size, size);
    }
  }

  function speckle256(context, color, count, size = 1) {
    context.fillStyle = color;
    for (let index = 0; index < count; index += 1) {
      context.fillRect((index * 83) % 253, (index * 151) % 251, size, size);
    }
  }

  function setSky() {
    const skyCanvas = createCanvas(256);
    const context = skyCanvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, SKY_TOP);
    gradient.addColorStop(0.58, SKY_MIDDLE);
    gradient.addColorStop(1, SKY_BOTTOM);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);

    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTexture;
    scene.fog = new THREE.Fog(new THREE.Color(SKY_COLOR), 22, 82);
  }

  function drawFloor(context) {
    context.fillStyle = '#83755f';
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = 'rgba(42, 45, 48, 0.20)';
    context.fillRect(0, 0, 128, 128);
    context.fillRect(128, 128, 128, 128);
    context.fillStyle = 'rgba(255, 244, 224, 0.05)';
    context.fillRect(0, 0, 256, 256);

    context.strokeStyle = 'rgba(31, 34, 37, 0.82)';
    context.lineWidth = 5;
    context.strokeRect(2, 2, 252, 252);
    context.strokeStyle = 'rgba(255, 240, 214, 0.09)';
    context.lineWidth = 1;
    context.strokeRect(7, 7, 242, 242);

    for (let index = 0; index < 150; index += 1) {
      const x = (index * 97) % 253;
      const y = (index * 157) % 251;
      const size = 1 + ((index * 29) % 3);
      context.fillStyle = index % 3 ? 'rgba(39, 43, 47, 0.11)' : 'rgba(238, 230, 210, 0.07)';
      context.fillRect(x, y, size, size);
    }

    context.fillStyle = 'rgba(30, 32, 35, 0.14)';
    context.beginPath();
    context.ellipse(52, 172, 26, 14, 0.3, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(186, 74, 20, 11, -0.2, 0, Math.PI * 2);
    context.fill();
  }

  function drawWall(context) {
    context.fillStyle = '#333b44';
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = 'rgba(16, 20, 24, 0.50)';
    context.fillRect(0, 106, 128, 22);
    context.fillStyle = 'rgba(187, 201, 215, 0.16)';
    context.fillRect(0, 104, 128, 3);
    context.fillStyle = 'rgba(255, 246, 227, 0.08)';
    context.fillRect(0, 22, 128, 2);
    context.fillStyle = 'rgba(12, 16, 19, 0.58)';
    context.fillRect(31, 0, 3, 106);
    context.fillRect(95, 0, 3, 106);
    context.fillRect(0, 52, 128, 3);
    speckle(context, 'rgba(10, 14, 17, 0.20)', 34, 2);
    speckle(context, 'rgba(224, 234, 245, 0.06)', 18, 2);
  }

  function drawConcrete(context) {
    context.fillStyle = PALETTE.concrete;
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = 'rgba(61, 68, 76, 0.18)';
    context.fillRect(0, 0, 128, 8);
    context.fillRect(62, 0, 3, 128);
    speckle(context, 'rgba(61, 68, 76, 0.18)', 52, 2);
    speckle(context, 'rgba(246, 244, 239, 0.09)', 30, 2);
  }

  function drawRamp(context) {
    context.fillStyle = PALETTE.concrete;
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = 'rgba(57, 67, 77, 0.55)';
    context.fillRect(0, 0, 128, 10);
    context.fillRect(0, 118, 128, 10);
    context.fillStyle = 'rgba(246, 244, 239, 0.14)';
    context.fillRect(0, 10, 128, 2);
    context.fillRect(0, 116, 128, 2);
    speckle(context, 'rgba(61, 68, 76, 0.20)', 48, 2);
  }

  function drawCrateSide(context) {
    context.fillStyle = '#7a6645';
    context.fillRect(0, 0, 256, 256);
    for (let index = 0; index < 45; index += 1) {
      const y = (index * 11 + ((index * 37) % 7)) % 256;
      context.strokeStyle = index % 2 ? 'rgba(39, 29, 18, 0.16)' : 'rgba(233, 218, 181, 0.09)';
      context.lineWidth = 1 + (index % 3);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(256, y + ((index % 5) - 2) * 3);
      context.stroke();
    }

    context.fillStyle = 'rgba(25, 18, 11, 0.84)';
    context.fillRect(0, 0, 256, 16);
    context.fillRect(0, 240, 256, 16);
    context.fillRect(0, 0, 16, 256);
    context.fillRect(240, 0, 16, 256);
    context.fillStyle = 'rgba(226, 211, 172, 0.22)';
    context.fillRect(16, 16, 224, 3);
    context.fillRect(16, 16, 3, 224);
    context.fillRect(123, 0, 10, 256);
    speckle256(context, 'rgba(30, 22, 14, 0.15)', 90, 2);
  }

  function drawCrateTop(context) {
    context.fillStyle = '#8b7350';
    context.fillRect(0, 0, 256, 256);
    for (let index = 0; index < 38; index += 1) {
      const y = (index * 13 + ((index * 47) % 9)) % 256;
      context.strokeStyle = index % 2 ? 'rgba(44, 33, 21, 0.14)' : 'rgba(233, 218, 181, 0.08)';
      context.lineWidth = 1 + (index % 2);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(256, y + ((index % 4) - 1) * 4);
      context.stroke();
    }

    context.strokeStyle = 'rgba(255, 241, 213, 0.20)';
    context.lineWidth = 8;
    context.strokeRect(15, 15, 226, 226);
    context.strokeStyle = 'rgba(29, 22, 14, 0.68)';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(32, 224);
    context.lineTo(224, 32);
    context.stroke();
    speckle256(context, 'rgba(31, 24, 15, 0.12)', 70, 2);
  }

  function createMaterials() {
    const floorTexture = canvasTexture(drawFloor, 8, 8, 256);
    floorTexture.anisotropy = 4;
    const crateSide = canvasTexture(drawCrateSide, 1, 1, 256);
    const crateTop = canvasTexture(drawCrateTop, 1, 1, 256);

    materials.floor = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.84,
      metalness: 0.05,
      vertexColors: true,
    });
    materials.wall = new THREE.MeshStandardMaterial({ map: canvasTexture(drawWall, 8, 1), roughness: 0.76, metalness: 0.06 });
    materials.divider = new THREE.MeshStandardMaterial({ map: canvasTexture(drawConcrete, 2, 2), roughness: 0.82, metalness: 0.03 });
    materials.ramp = new THREE.MeshStandardMaterial({ map: canvasTexture(drawRamp, 2, 2), roughness: 0.88, metalness: 0.02 });
    materials.crateSide = new THREE.MeshStandardMaterial({ map: crateSide, roughness: 0.70, metalness: 0.03 });
    materials.crateTop = new THREE.MeshStandardMaterial({ map: crateTop, roughness: 0.63, metalness: 0.03 });
    materials.crate = [
      materials.crateSide,
      materials.crateSide,
      materials.crateTop,
      materials.crateSide,
      materials.crateSide,
      materials.crateSide,
    ];

    for (const name of ['accent', 'ink', 'muted']) {
      materials[name] = new THREE.MeshStandardMaterial({
        color: new THREE.Color(PALETTE[name]),
        roughness: name === 'accent' || name === 'ink' ? 0.55 : 0.82,
        metalness: 0.03,
      });
    }
  }

  setSky();
  createMaterials();

  const colliders = [];
  const shootables = [];

  function box(width, height, depth, x, y, z, materialName) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials[materialName]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  function createRoom() {
    const floorMesh = box(24.4, 0.4, 24.4, 0, -0.2, 0, 'floor');
    const floorColors = [];
    const floorPosition = floorMesh.geometry.attributes.position;
    for (let index = 0; index < floorPosition.count; index += 1) {
      const vertexX = floorPosition.getX(index);
      const vertexZ = floorPosition.getZ(index);
      const corner = (Math.abs(vertexX) + Math.abs(vertexZ)) / 24.4;
      const tint = 0.46 + 0.54 * Math.min(1, 1 - corner * 0.8);
      floorColors.push(tint, tint * 1.04, tint * 0.99);
    }
    floorMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(floorColors, 3));

    box(0.4, 4.6, 24.4, -12.2, 2.3, 0, 'wall');
    box(0.4, 4.6, 24.4, 12.2, 2.3, 0, 'wall');
    box(24.4, 4.6, 0.4, 0, 2.3, -12.2, 'wall');
    box(24.4, 4.6, 0.4, 0, 2.3, 12.2, 'wall');
  }

  function createRoutesAndCover() {
    box(0.5, 2.8, 7.0, -4.7, 1.4, -5.0, 'divider');
    box(0.5, 2.8, 7.0, 4.7, 1.4, -5.0, 'divider');
    box(0.5, 2.8, 6.0, -4.7, 1.4, 6.0, 'divider');
    box(0.5, 2.8, 6.0, 4.7, 1.4, 6.0, 'divider');
    box(3.0, 2.6, 0.5, 0, 1.3, -3.2, 'divider');
    box(3.0, 2.6, 0.5, 0, 1.3, 3.2, 'divider');

    box(1.7, 1.1, 1.7, -7.2, 0.55, -0.7, 'crate');
    box(1.7, 1.1, 1.7, 7.2, 0.55, -0.7, 'crate');
    box(1.8, 0.75, 1.8, -3.9, 0.375, 0.7, 'crate');
    box(1.8, 0.75, 1.8, 3.9, 0.375, -0.7, 'crate');
    box(1.5, 1.0, 1.5, -8.2, 0.5, -9.2, 'crate');
    box(1.5, 1.0, 1.5, 8.8, 0.5, -8.0, 'crate');
    box(1.5, 1.0, 1.5, -6.5, 0.5, 8.7, 'crate');
    box(1.5, 1.0, 1.5, 6.5, 0.5, 8.7, 'crate');
    box(1.7, 1.1, 1.7, -1.2, 0.55, -5.9, 'crate');
    box(1.7, 1.1, 1.7, 1.2, 0.55, 5.9, 'crate');
  }

  function createPlatforms() {
    const platforms = [
      { x: -9.0, z: 7.0, rampDirection: -1 },
      { x: 9.0, z: -7.0, rampDirection: 1 },
    ];

    for (const platform of platforms) {
      box(5.2, 0.9, 4.2, platform.x, 0.45, platform.z, 'ramp');
      for (let step = 0; step < 4; step += 1) {
        const height = 0.28 + step * 0.22;
        const z = platform.z + platform.rampDirection * (2.1 + 0.55 + step * 0.62);
        box(3.4, height, 0.62, platform.x, height / 2, z, 'ramp');
      }

      for (let edge = 0; edge < 2; edge += 1) {
        const edgeMark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 4.0), materials.ink);
        edgeMark.position.set(platform.x + (edge === 0 ? -2.55 : 2.55), 0.912, platform.z);
        group.add(edgeMark);
      }
    }
  }

  function createBombsite() {
    const center = { x: -7.6, z: -6.2, radius: 3.4 };
    const texture = canvasTexture((context) => {
      context.clearRect(0, 0, 256, 256);
      context.fillStyle = 'rgba(255, 119, 29, 0.14)';
      context.fillRect(8, 8, 240, 240);
      context.fillStyle = 'rgba(255, 119, 29, 0.98)';
      context.fillRect(4, 4, 248, 22);
      context.fillRect(4, 230, 248, 22);
      context.fillRect(4, 4, 22, 248);
      context.fillRect(230, 4, 22, 248);
      context.fillStyle = 'rgba(25, 26, 24, 0.90)';
      for (let index = 0; index < 256; index += 32) {
        context.fillRect(index, 4, 16, 22);
        context.fillRect(index, 230, 16, 22);
      }
      context.fillStyle = 'rgba(255, 119, 29, 0.98)';
      context.font = 'bold 168px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('A', 128, 136);
    }, 1, 1, 256);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(center.radius * 2, center.radius * 2),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(center.x, 0.045, center.z);
    plate.renderOrder = 2;
    group.add(plate);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(center.radius * 2.2, center.radius * 2.2),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color('#ff771d'),
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(center.x, 0.041, center.z);
    glow.renderOrder = 1;
    group.add(glow);
  }

  function createGrid() {
    const gridSize = 1.5;
    const gridHalf = 11.25;
    const positions = [];
    for (let value = -gridHalf; value <= gridHalf + 0.001; value += gridSize) {
      positions.push(-gridHalf, 0.02, value, gridHalf, 0.02, value);
      positions.push(value, 0.02, -gridHalf, value, 0.02, gridHalf);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const grid = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: new THREE.Color(PALETTE.hairline),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }));
    grid.renderOrder = 1;
    group.add(grid);
  }

  function createPoster(label, subline, x, z, rotationY, width, height, accent = false) {
    const canvas = createCanvas(256);
    const context = canvas.getContext('2d');
    context.fillStyle = '#22282e';
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = '#e7e2d3';
    context.font = 'bold 46px system-ui, sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(label, 20, 40);
    context.fillStyle = 'rgba(231, 226, 211, 0.62)';
    context.font = '22px system-ui, sans-serif';
    context.fillText(subline, 20, 102);
    context.fillStyle = 'rgba(231, 226, 211, 0.22)';
    context.fillRect(20, 146, 216, 14);
    context.fillRect(20, 176, 152, 14);
    context.fillRect(20, 206, 188, 14);
    if (accent) {
      context.fillStyle = '#ff771d';
      context.fillRect(20, 128, 216, 8);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.78, metalness: 0.02 }),
    );
    poster.position.set(x, 2.1, z);
    poster.rotation.y = rotationY;
    group.add(poster);
  }

  function createPosters() {
    createPoster('SECTOR A', 'ENTRY / LEFT LANE', -11.8, -3.2, Math.PI / 2, 2.4, 2.4, true);
    createPoster('SECTOR B', 'RALLY / RIGHT LANE', 11.8, 3.2, -Math.PI / 2, 2.4, 2.4, true);
    createPoster('SHIFT 04', 'SUPPLY ROUTE', 2.0, 11.8, Math.PI, 2.0, 2.0);
    createPoster('⟶ KEEP CLEAR', 'EQUIPMENT ACCESS', -11.8, 6.8, Math.PI / 2, 2.0, 2.0);
  }

  function createLights() {
    scene.add(new THREE.AmbientLight(new THREE.Color(PALETTE.ink), 0.13));
    scene.add(new THREE.HemisphereLight(new THREE.Color('#a5b0ba'), new THREE.Color('#8b8579'), 0.74));

    const key = new THREE.DirectionalLight(new THREE.Color('#fff3dd'), 3.4);
    key.position.set(16, 13, -11);
    key.target.position.set(0, 0, -3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.camera.far = 48;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.03;
    scene.add(key, key.target);

    const fill = new THREE.DirectionalLight(new THREE.Color('#d8e4ef'), 1.5);
    fill.position.set(-13, 6, 8);
    fill.target.position.set(4, 0, -1);
    scene.add(fill, fill.target);
  }

  createRoom();
  createRoutesAndCover();
  createPlatforms();
  createBombsite();
  createGrid();
  createPosters();
  createLights();

  return {
    colliders,
    shootables,
    group,
    cover: [
      [-7.2, -0.7],
      [7.2, -0.7],
      [-3.9, 0.7],
      [3.9, -0.7],
      [-8.2, -9.2],
      [8.8, -8.0],
      [-6.5, 8.7],
      [6.5, 8.7],
      [-1.2, -5.9],
      [1.2, 5.9],
    ],
  };
}
