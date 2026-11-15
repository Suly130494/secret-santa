import * as THREE from 'three';
import { gsap } from 'gsap';
import { createGlow } from './particles.js';
import { withTimeout } from '../core/timeout.js';

const CW = 1.1;
const CH = 1.6;
const TEX_W = 512;
const TEX_H = 744;
const CONFETTI = 150;
const CONFETTI_COLORS = [0xffd98a, 0xf5c86a, 0xd8263f, 0x2fbf71, 0xffffff, 0x7b5cff];

function canvasTexture(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  draw(canvas.getContext('2d'), TEX_W, TEX_H);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, outer, inner, points = 8) {
  ctx.beginPath();
  for (let k = 0; k < points * 2; k++) {
    const r = k % 2 === 0 ? outer : inner;
    const a = (k / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function goldGradient(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#fff0c4');
  g.addColorStop(0.35, '#f5c86a');
  g.addColorStop(0.7, '#c9962e');
  g.addColorStop(1, '#ffe3a0');
  return g;
}

function backTexture() {
  return canvasTexture((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, '#6b1430');
    g.addColorStop(1, '#2b0613');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // motif losange discret
    ctx.strokeStyle = 'rgba(245, 200, 106, 0.08)';
    ctx.lineWidth = 2;
    for (let k = -h; k < w + h; k += 34) {
      ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k, h); ctx.lineTo(k + h, 0); ctx.stroke();
    }
    const gold = goldGradient(ctx, w, h);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 10;
    roundRectPath(ctx, 22, 22, w - 44, h - 44, 26);
    ctx.stroke();
    ctx.lineWidth = 3;
    roundRectPath(ctx, 42, 42, w - 84, h - 84, 18);
    ctx.stroke();
    // halo + étoile centrale
    const halo = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.42);
    halo.addColorStop(0, 'rgba(255, 217, 138, 0.35)');
    halo.addColorStop(1, 'rgba(255, 217, 138, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = gold;
    star(ctx, w / 2, h / 2, w * 0.22, w * 0.07, 8);
    ctx.fill();
    star(ctx, w / 2, h / 2, w * 0.1, w * 0.035, 4);
    ctx.fillStyle = '#fff6dc';
    ctx.fill();
    // petites étoiles de coin
    [[90, 90], [w - 90, 90], [90, h - 90], [w - 90, h - 90]].forEach(([x, y]) => {
      ctx.fillStyle = gold;
      star(ctx, x, y, 18, 6, 4);
      ctx.fill();
    });
  });
}

function frontTexture(name) {
  return canvasTexture((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(1, '#f2e2c2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 5000; k++) {
      ctx.globalAlpha = Math.random() * 0.08;
      ctx.fillStyle = '#7a5a2a';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
    const gold = goldGradient(ctx, w, h);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 8;
    roundRectPath(ctx, 24, 24, w - 48, h - 48, 24);
    ctx.stroke();
    ctx.lineWidth = 2;
    roundRectPath(ctx, 40, 40, w - 80, h - 80, 16);
    ctx.stroke();
    ctx.fillStyle = gold;
    star(ctx, w / 2, h * 0.3, 34, 11, 8);
    ctx.fill();
    // prénom
    const text = name ?? '';
    let size = 96;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    do {
      ctx.font = `600 ${size}px Cinzel, 'Times New Roman', serif`;
      size -= 4;
    } while (ctx.measureText(text).width > w - 110 && size > 30);
    ctx.fillStyle = '#5a3a0a';
    ctx.fillText(text, w / 2, h * 0.52);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.64);
    ctx.lineTo(w * 0.7, h * 0.64);
    ctx.stroke();
    ctx.fillStyle = gold;
    star(ctx, w / 2, h * 0.64, 10, 4, 4);
    ctx.fill();
  });
}

function cardGeometry() {
  const r = 0.08;
  const s = new THREE.Shape();
  s.moveTo(-CW / 2 + r, -CH / 2);
  s.lineTo(CW / 2 - r, -CH / 2);
  s.quadraticCurveTo(CW / 2, -CH / 2, CW / 2, -CH / 2 + r);
  s.lineTo(CW / 2, CH / 2 - r);
  s.quadraticCurveTo(CW / 2, CH / 2, CW / 2 - r, CH / 2);
  s.lineTo(-CW / 2 + r, CH / 2);
  s.quadraticCurveTo(-CW / 2, CH / 2, -CW / 2, CH / 2 - r);
  s.lineTo(-CW / 2, -CH / 2 + r);
  s.quadraticCurveTo(-CW / 2, -CH / 2, -CW / 2 + r, -CH / 2);
  const geo = new THREE.ShapeGeometry(s, 6);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let k = 0; k < pos.count; k++) uv.setXY(k, pos.getX(k) / CW + 0.5, pos.getY(k) / CH + 0.5);
  return geo;
}

/**
 * Pioche : les cartes surgissent, tourbillonnent, se mélangent, puis la carte tirée se retourne.
 */
export async function createCards(stage, dust, { onCue } = {}) {
  try { await withTimeout(document.fonts.load("600 80px 'Cinzel'"), 3000); } catch { /* police de repli */ }
  const geo = cardGeometry();
  const back = backTexture();
  back.anisotropy = stage.renderer.capabilities.getMaxAnisotropy();
  const genericFront = frontTexture('✦');

  const group = new THREE.Group();
  stage.scene.add(group);
  const halo = createGlow(0xffcf86, 1.1);
  halo.material.depthTest = true;
  halo.renderOrder = 0;
  halo.visible = false;
  stage.scene.add(halo);
  let cards = [];
  let anchor = null;
  let landed = null;
  let vortex = null;
  const tmp = new THREE.Vector3();

  // Confettis (un seul InstancedMesh réutilisé)
  const confettiMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.07, 0.12),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false }),
    CONFETTI,
  );
  confettiMesh.frustumCulled = false;
  confettiMesh.visible = false;
  const color = new THREE.Color();
  for (let k = 0; k < CONFETTI; k++) confettiMesh.setColorAt(k, color.set(CONFETTI_COLORS[k % CONFETTI_COLORS.length]).multiplyScalar(1.3));
  stage.scene.add(confettiMesh);
  const conf = Array.from({ length: CONFETTI }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }));
  let confettiTime = 0;
  const dummy = new THREE.Object3D();

  function makeCard(name, isTarget) {
    const frontMat = new THREE.MeshStandardMaterial({ map: isTarget ? frontTexture(name) : genericFront, color: 0xeee4d2, roughness: 0.75, metalness: 0, envMapIntensity: 0.3, transparent: true, emissive: 0xffc870, emissiveIntensity: 0 });
    const backMat = new THREE.MeshStandardMaterial({ map: back, roughness: 0.45, metalness: 0.15, envMapIntensity: 0.8, transparent: true, emissive: 0xffc870, emissiveIntensity: 0 });
    const g = new THREE.Group();
    const backMesh = new THREE.Mesh(geo, backMat);
    backMesh.position.z = 0.004;
    const frontMesh = new THREE.Mesh(geo, frontMat);
    frontMesh.rotation.y = Math.PI;
    frontMesh.position.z = -0.004;
    g.add(backMesh, frontMesh);
    group.add(g);
    return { group: g, frontMat, backMat, isTarget, angle: 0, offset: 0, mode: 'vortex' };
  }

  function disposeCards() {
    cards.forEach((c) => {
      group.remove(c.group);
      if (c.frontMat.map !== genericFront) c.frontMat.map.dispose();
      c.frontMat.dispose();
      c.backMat.dispose();
    });
    cards = [];
    landed = null;
  }

  function anchorTarget() {
    const a = stage.anchorToWorld(anchor);
    return { pos: a.center, scale: a.width / CW };
  }

  function burstConfetti(origin) {
    confettiMesh.visible = true;
    confettiTime = 0;
    conf.forEach((c) => {
      c.p.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 4;
      c.v.set(Math.cos(a) * s * 0.8, 2.5 + Math.random() * 4, (Math.random() - 0.2) * 2.5);
      c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      c.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      c.life = 0;
    });
  }

  stage.onFrame((dt, t) => {
    // Tourbillon
    if (vortex) {
      vortex.time += dt;
      cards.forEach((c, i) => {
        if (c.mode !== 'vortex') return;
        c.angle += vortex.speed * dt;
        const a = c.angle + c.offset;
        const R = vortex.radius;
        c.group.position.set(
          vortex.center.x + Math.cos(a) * R,
          vortex.center.y + Math.sin(a) * R * 0.32 + vortex.lift * Math.sin(t * 2 + i),
          vortex.center.z + Math.sin(a) * R * 0.7,
        );
        c.group.rotation.set(Math.sin(a) * 0.15, -Math.cos(a) * 0.5 * Math.min(1, vortex.speed / 4), Math.sin(a + t) * 0.12);
        if (vortex.speed > 2.5 && Math.random() < vortex.speed / 12) dust.emit(c.group.position, 1, 0.3);
      });
    }
    // Carte posée : suit son ancre DOM, flotte doucement
    if (landed && landed.mode === 'landed' && anchor) {
      const { pos, scale } = anchorTarget();
      landed.group.position.set(pos.x, pos.y + Math.sin(t * 1.3) * 0.04, pos.z);
      landed.group.scale.setScalar(scale);
      landed.group.rotation.set(Math.sin(t * 0.9) * 0.04, Math.PI + Math.sin(t * 0.6) * 0.08, 0);
      halo.visible = true;
      halo.position.set(pos.x, pos.y, pos.z - 0.3);
      halo.scale.set(CW * scale * 2.6, CH * scale * 2.1, 1);
      halo.material.opacity = 0.55 + Math.sin(t * 1.5) * 0.1;
    } else {
      halo.visible = false;
    }
    // Confettis
    if (confettiMesh.visible) {
      confettiTime += dt;
      conf.forEach((c, k) => {
        c.v.y -= 4.2 * dt;
        c.v.multiplyScalar(Math.pow(0.55, dt));
        c.p.addScaledVector(c.v, dt);
        c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
        dummy.position.copy(c.p);
        dummy.rotation.copy(c.r);
        dummy.scale.setScalar(Math.max(0, 1 - confettiTime / 3.2));
        dummy.updateMatrix();
        confettiMesh.setMatrixAt(k, dummy.matrix);
      });
      confettiMesh.instanceMatrix.needsUpdate = true;
      if (confettiTime > 3.2) confettiMesh.visible = false;
    }
  });

  return {
    run({ names, target, anchor: el, reducedMotion = false }) {
      disposeCards();
      anchor = el;
      const list = [...names].sort(() => Math.random() - 0.5);
      cards = list.map((n) => makeCard(n, n === target));
      const chosen = cards.find((c) => c.isTarget) ?? cards[0];
      const N = cards.length;
      const center = new THREE.Vector3(0, 0.25, 0);
      // Le tourbillon s'adapte à la largeur visible (écrans en portrait)
      const halfWidth = stage.pxToWorld(stage.size.width) / 2;
      const R = Math.min(2.0, halfWidth * 0.68);
      const S = Math.min(1, halfWidth / 1.8);
      vortex = { speed: 0.6, radius: 0.01, lift: 0, center, time: 0 };
      cards.forEach((c, i) => {
        c.angle = (i / N) * Math.PI * 2;
        c.group.scale.setScalar(0.001);
      });
      const cam = stage.camera;

      return new Promise((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve });
        if (reducedMotion) {
          tl.to(vortex, { radius: R * 0.8, duration: 0.5, ease: 'power2.out' }, 0)
            .to(cards.map((c) => c.group.scale), { x: S, y: S, z: S, duration: 0.5 }, 0);
        } else {
          tl.call(() => { dust.burst(center, { count: 260, speed: 2.4 }); onCue?.('whoosh'); }, null, 0)
            .to(cards.map((c) => c.group.scale), { x: S, y: S, z: S, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.1 }, 0)
            .to(vortex, { radius: R, duration: 1.0, ease: 'power2.out' }, 0)
            .to(vortex, { speed: 9, duration: 3.0, ease: 'power2.in' }, 1.0)
            .to(vortex, { lift: 0.25, duration: 2, ease: 'sine.inOut' }, 1.0)
            .to(cam.position, { z: 7.2, duration: 3.0, ease: 'sine.inOut' }, 1.0)
            .call(() => onCue?.('shimmer'), null, 2.0)
            // mélange : les cartes échangent leurs places
            .to(vortex, { radius: R * 0.6, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 4.0)
            .to(cards, { offset: () => (Math.random() - 0.5) * Math.PI, duration: 1.2, ease: 'sine.inOut' }, 4.0)
            .to(vortex, { speed: 0.3, lift: 0, duration: 1.0, ease: 'power3.out' }, 5.2)
            .to(cam.position, { z: 8, duration: 1.0, ease: 'power2.inOut' }, 5.2);
        }
        const landAt = reducedMotion ? 0.6 : 5.4;
        tl.call(() => {
          chosen.mode = 'landing';
          const { pos, scale } = anchorTarget();
          const from = chosen.group.position.clone();
          const arc = { t: 0 };
          gsap.to(arc, {
            t: 1,
            duration: reducedMotion ? 0.5 : 1.0,
            ease: 'power3.inOut',
            onUpdate: () => {
              const goal = anchorTarget();
              chosen.group.position.lerpVectors(from, goal.pos, arc.t);
              chosen.group.position.z += Math.sin(arc.t * Math.PI) * 1.2;
            },
          });
          gsap.to(chosen.group.scale, { x: scale, y: scale, z: scale, duration: reducedMotion ? 0.5 : 1.0, ease: 'power3.inOut' });
          gsap.to(chosen.group.rotation, { x: 0, y: 0, z: 0, duration: reducedMotion ? 0.5 : 1.0, ease: 'power3.inOut' });
          cards.filter((c) => c !== chosen).forEach((c, i) => {
            c.mode = 'leaving';
            const dir = c.group.position.clone().sub(center).setZ(0).normalize();
            gsap.to(c.group.position, { x: `+=${dir.x * 4}`, y: `+=${dir.y * 3 + (i % 2 ? 1 : -1)}`, z: -3, duration: 1.0, ease: 'power2.in' });
            gsap.to([c.frontMat, c.backMat], { opacity: 0, duration: 0.8, ease: 'power1.in' });
          });
        }, null, landAt);
        const flipAt = landAt + (reducedMotion ? 0.6 : 1.2);
        tl.to([chosen.backMat, chosen.frontMat], { emissiveIntensity: 0.55, duration: 0.4, ease: 'power2.in' }, flipAt - 0.4)
          .to(chosen.group.rotation, { y: Math.PI, duration: reducedMotion ? 0.4 : 0.9, ease: 'back.out(1.4)' }, flipAt)
          .call(() => {
            onCue?.('flip');
            const p = chosen.group.getWorldPosition(tmp).clone();
            dust.burst(p, { count: 600, speed: 4.2, life: 1.8, size: 3.5 });
            if (!reducedMotion) burstConfetti(p);
            stage.bloomPulse(1.8, 1.1);
          }, null, flipAt + 0.15)
          .to([chosen.backMat, chosen.frontMat], { emissiveIntensity: 0.08, duration: 1.0, ease: 'power2.out' }, flipAt + 0.3)
          .call(() => {
            cards.filter((c) => c !== chosen).forEach((c) => { c.group.visible = false; });
            vortex = null;
            landed = chosen;
            chosen.mode = 'landed';
          }, null, flipAt + (reducedMotion ? 0.5 : 1.0));
      });
    },

    showIdle(target, el) {
      disposeCards();
      vortex = null;
      anchor = el;
      const c = makeCard(target, true);
      cards = [c];
      c.frontMat.emissiveIntensity = 0.08;
      c.mode = 'landed';
      landed = c;
      const { pos, scale } = anchorTarget();
      c.group.position.copy(pos);
      c.group.scale.setScalar(scale);
      c.group.rotation.set(0, Math.PI, 0);
      gsap.from(c.group.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.9, ease: 'back.out(1.6)' });
      dust.burst(pos, { count: 200, speed: 2.2, life: 1.4 });
    },

    reset() {
      gsap.killTweensOf(stage.camera.position);
      stage.camera.position.z = 8;
      disposeCards();
      vortex = null;
      confettiMesh.visible = false;
    },
  };
}
