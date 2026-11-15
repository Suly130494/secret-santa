import * as THREE from 'three';
import { gsap } from 'gsap';
import { createGlow } from './particles.js';

const W = 3.2;
const H = 2.1;
const D = 0.05;
const FLAP = H * 0.6;
const FRONT = D / 2 + 0.012;

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function grain(ctx, w, h, amount, alpha) {
  for (let k = 0; k < amount; k++) {
    ctx.globalAlpha = Math.random() * alpha;
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#7a5a2a';
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

/** Remet les UV d'une géométrie plane dans [0, 1] selon sa boîte englobante. */
function normalizeUVs(geo) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let k = 0; k < pos.count; k++) {
    uv.setXY(k, (pos.getX(k) - min.x) / (max.x - min.x), (pos.getY(k) - min.y) / (max.y - min.y));
  }
  uv.needsUpdate = true;
}

function paperTexture() {
  return canvasTexture(1024, 672, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fbf1db');
    g.addColorStop(1, '#ead6ae');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 9000, 0.12);
    // plis de la poche
    ctx.strokeStyle = 'rgba(150, 110, 50, 0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, h - 10);
    ctx.lineTo(w / 2, h * 0.5);
    ctx.lineTo(w - 10, h - 10);
    ctx.stroke();
    // filets dorés
    ctx.strokeStyle = '#c9962e';
    ctx.lineWidth = 6;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.strokeStyle = 'rgba(201, 150, 46, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, w - 72, h - 72);
  });
}

function flapTexture() {
  return canvasTexture(1024, Math.round((1024 * FLAP) / W), (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f1e0bc');
    g.addColorStop(1, '#f8ecd4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 5000, 0.12);
    // UV v=1 en haut (bord du pli), v=0 à la pointe : le canvas est retourné par flipY
    ctx.strokeStyle = '#c9962e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(18, 8);
    ctx.lineTo(w / 2, h - 16);
    ctx.lineTo(w - 18, 8);
    ctx.stroke();
  });
}

function sealCapTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.42, h * 0.38, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#e23a52');
    g.addColorStop(0.6, '#b3122e');
    g.addColorStop(1, '#6e0718');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // anneau en creux
    ctx.strokeStyle = 'rgba(60, 0, 10, 0.55)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 150, 160, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2 - 3, h / 2 - 3, w * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    // étoile à 8 branches dorée
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const r = k % 2 === 0 ? w * 0.27 : w * 0.1;
      const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    const sg = ctx.createLinearGradient(-w * 0.2, -h * 0.2, w * 0.2, h * 0.2);
    sg.addColorStop(0, '#ffe7a8');
    sg.addColorStop(1, '#c9962e');
    ctx.fillStyle = sg;
    ctx.shadowColor = 'rgba(40, 0, 5, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.restore();
  });
}

/** Bord irrégulier façon cire écrasée. */
function waxify(geo, radius) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    const r = Math.hypot(v.x, v.z);
    if (r > radius * 0.9) {
      const a = Math.atan2(v.z, v.x);
      const bump = 1 + 0.06 * Math.sin(a * 7) + 0.04 * Math.sin(a * 13 + 1.3);
      v.x *= bump;
      v.z *= bump;
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
}

/**
 * Enveloppe 3D scellée : apparition, secousse (mauvais mot), sceau qui se brise.
 */
export function createEnvelope(stage, dust, { onCue, reducedMotion = false } = {}) {
  const root = new THREE.Group();
  root.visible = false;
  stage.scene.add(root);
  const float = new THREE.Group();
  const shake = new THREE.Group();
  root.add(float);
  float.add(shake);

  const materials = [];
  const mat = (params, Ctor = THREE.MeshStandardMaterial) => {
    const m = new Ctor({ transparent: true, ...params });
    materials.push(m);
    return m;
  };

  // Corps
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(W, H, 0.09), { depth: D, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 6 });
  bodyGeo.translate(0, 0, -D / 2);
  normalizeUVs(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, mat({ map: paperTexture(), roughness: 0.9, metalness: 0, envMapIntensity: 0.22 }));
  shake.add(body);

  // Rabat (pivot sur le bord haut)
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-W / 2 + 0.04, 0);
  flapShape.lineTo(W / 2 - 0.04, 0);
  flapShape.lineTo(0.12, -FLAP + 0.06);
  flapShape.quadraticCurveTo(0, -FLAP - 0.02, -0.12, -FLAP + 0.06);
  flapShape.closePath();
  const flapGeo = new THREE.ShapeGeometry(flapShape, 8);
  normalizeUVs(flapGeo);
  const flapMat = mat({ map: flapTexture(), roughness: 0.78, metalness: 0, envMapIntensity: 0.35, side: THREE.DoubleSide });
  const flap = new THREE.Mesh(flapGeo, flapMat);
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, H / 2 - 0.02, FRONT);
  flapPivot.add(flap);
  shake.add(flapPivot);

  // Sceau de cire
  const SEAL_R = 0.36;
  const sealY = H / 2 - FLAP + 0.1;
  const sealSide = mat({ color: 0x8a0d24, roughness: 0.5, metalness: 0, envMapIntensity: 0.25, emissive: 0x000000 }, THREE.MeshPhysicalMaterial);
  sealSide.clearcoat = 0.25;
  sealSide.clearcoatRoughness = 0.4;
  const sealCap = mat({ map: sealCapTexture(), roughness: 0.48, metalness: 0, envMapIntensity: 0.22, emissive: 0x000000 }, THREE.MeshPhysicalMaterial);
  sealCap.clearcoat = 0.3;
  sealCap.clearcoatRoughness = 0.35;
  const sealGeo = new THREE.CylinderGeometry(SEAL_R, SEAL_R * 1.04, 0.09, 64, 1);
  waxify(sealGeo, SEAL_R);
  const seal = new THREE.Mesh(sealGeo, [sealSide, sealCap, sealCap]);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, sealY, FRONT + 0.05);
  shake.add(seal);

  const halves = [0, Math.PI].map((start) => {
    const g = new THREE.CylinderGeometry(SEAL_R, SEAL_R * 1.04, 0.09, 32, 1, false, start, Math.PI);
    const m = new THREE.Mesh(g, [sealSide, sealCap, sealCap]);
    m.rotation.x = Math.PI / 2;
    m.position.copy(seal.position);
    m.visible = false;
    shake.add(m);
    return m;
  });

  // Lumière intérieure
  const innerLight = new THREE.PointLight(0xffc977, 0, 6, 1.5);
  innerLight.position.set(0, H / 2 - 0.2, 0.6);
  shake.add(innerLight);
  const innerGlow = createGlow(0xffd59a, 2.6);
  innerGlow.position.set(0, H / 2 - 0.05, FRONT + 0.02);
  innerGlow.scale.setScalar(0.001);
  shake.add(innerGlow);

  let anchor = null;
  let broken = false;
  const tmp = new THREE.Vector3();

  stage.onFrame((dt, t) => {
    if (!root.visible) return;
    if (anchor) {
      const a = stage.anchorToWorld(anchor);
      if (a.width > 0) {
        root.position.copy(a.center);
        root.scale.setScalar(a.width / W);
      }
    }
    if (!broken) {
      float.position.y = Math.sin(t * 1.2) * 0.06;
      float.rotation.z = Math.sin(t * 0.7) * 0.025;
      float.rotation.x = Math.sin(t * 0.9) * 0.05;
      float.rotation.y = Math.sin(t * 0.5) * 0.06;
    }
  });

  const sealWorld = () => seal.getWorldPosition(tmp).clone();

  return {
    show(el) {
      anchor = el;
      broken = false;
      root.visible = true;
      materials.forEach((m) => { m.opacity = 1; });
      flapPivot.rotation.x = 0;
      seal.visible = true;
      halves.forEach((h) => { h.visible = false; });
      const a = stage.anchorToWorld(el);
      dust.setAmbient(140, a.center, new THREE.Vector3(a.width * 0.75, a.width * 0.55, 1.2));
      if (reducedMotion) return;
      gsap.fromTo(shake.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'back.out(1.6)' });
      gsap.fromTo(shake.position, { y: -0.8 }, { y: 0, duration: 1.2, ease: 'power3.out' });
      gsap.fromTo(shake.rotation, { y: -0.6 }, { y: 0, duration: 1.4, ease: 'power3.out' });
      setTimeout(() => dust.burst(sealWorld(), { count: 160, speed: 2.2, life: 1.2 }), 500);
    },

    shake() {
      onCue?.('error');
      return new Promise((resolve) => {
        sealCap.emissive.set(0xff2a3a);
        sealSide.emissive.set(0xff2a3a);
        gsap.timeline({ onComplete: resolve })
          .to(shake.rotation, { keyframes: { z: [-0.12, 0.1, -0.07, 0.04, 0] }, duration: 0.6, ease: 'none' }, 0)
          .fromTo([sealCap, sealSide], { emissiveIntensity: 0 }, { emissiveIntensity: 1.2, duration: 0.15, yoyo: true, repeat: 1 }, 0);
      });
    },

    breakSeal() {
      broken = true;
      const speed = reducedMotion ? 0.4 : 1;
      return new Promise((resolve) => {
        sealCap.emissive.set(0xffb347);
        sealSide.emissive.set(0xffb347);
        const tl = gsap.timeline({
          onComplete: () => {
            root.visible = false;
            anchor = null;
            dust.setAmbient(120, new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(3.4, 2.6, 1.6));
            resolve();
          },
        });
        tl.timeScale(1 / speed);
        tl.to([sealCap, sealSide], { emissiveIntensity: 2.2, duration: 0.4, ease: 'power2.in' }, 0)
          .to(seal.rotation, { keyframes: { z: [0.06, -0.06, 0.05, -0.04, 0] }, duration: 0.4 }, 0)
          .call(() => {
            onCue?.('crack');
            const p = sealWorld();
            seal.visible = false;
            halves.forEach((h) => { h.visible = true; h.position.copy(seal.position); h.rotation.set(Math.PI / 2, 0, 0); h.scale.setScalar(1); });
            dust.burst(p, { count: 420, speed: 3.6, life: 1.6, size: 3.5 });
            stage.bloomPulse(1.6, 0.9);
          }, null, 0.4)
          .to(halves[0].position, { x: -1.1, y: sealY - 0.9, z: 1.2, duration: 1.0, ease: 'power2.out' }, 0.4)
          .to(halves[1].position, { x: 1.1, y: sealY - 0.9, z: 1.2, duration: 1.0, ease: 'power2.out' }, 0.4)
          .to(halves[0].rotation, { y: -2.2, z: 1.4, duration: 1.0, ease: 'power2.out' }, 0.4)
          .to(halves[1].rotation, { y: 2.2, z: -1.4, duration: 1.0, ease: 'power2.out' }, 0.4)
          .to([halves[0].scale, halves[1].scale], { x: 0.001, y: 0.001, z: 0.001, duration: 0.5, ease: 'power2.in' }, 0.9)
          .to(flapPivot.rotation, { x: -2.75, duration: 0.9, ease: 'power3.inOut' }, 0.6)
          .to(innerLight, { intensity: 2.5, duration: 0.6, ease: 'power2.out' }, 0.8)
          .to(innerGlow.scale, { x: 2.6, y: 1.8, duration: 0.8, ease: 'power2.out' }, 0.8)
          .call(() => {
            for (let k = 0; k < 7; k++) {
              const x = (k / 6 - 0.5) * W;
              dust.burst(tmp.set(x, (Math.random() - 0.5) * H, 0.1).applyMatrix4(shake.matrixWorld).clone(), { count: 70, speed: 1.6, life: 1.4 });
            }
          }, null, 1.45)
          .to(materials, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 1.45)
          .to(shake.scale, { x: 0.86, y: 0.86, z: 0.86, duration: 0.8, ease: 'power1.in' }, 1.45)
          .to(innerGlow.material, { opacity: 0, duration: 0.7 }, 1.5)
          .to(innerLight, { intensity: 0, duration: 0.6 }, 1.5)
          .set(innerGlow.material, { opacity: 1 })
          .set(innerGlow.scale, { x: 0.001, y: 0.001 })
          .set([sealCap.emissive, sealSide.emissive], { r: 0, g: 0, b: 0 });
      });
    },
  };
}
