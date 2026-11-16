import * as THREE from 'three';
import { gsap } from 'gsap';

const MOON_Z = -26;
const SLEIGH_Z = -20;

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Demi-largeur et demi-hauteur visibles à la profondeur z. */
function visibleHalf(stage, z) {
  const hh = Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)) * (stage.camera.position.z - z);
  return { hw: hh * stage.camera.aspect, hh };
}

/** Grande lune pâle avec halo, en haut à droite du ciel. */
export function createMoon(stage) {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    const halo = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2);
    halo.addColorStop(0, 'rgba(255, 244, 214, 0.55)');
    halo.addColorStop(0.45, 'rgba(255, 236, 190, 0.12)');
    halo.addColorStop(1, 'rgba(255, 236, 190, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    const disc = ctx.createRadialGradient(w * 0.45, h * 0.42, 8, w / 2, h / 2, w * 0.2);
    disc.addColorStop(0, '#fffaf0');
    disc.addColorStop(1, '#f1dfb4');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // quelques cratères discrets
    [[0.44, 0.45, 0.035], [0.55, 0.52, 0.025], [0.5, 0.4, 0.018], [0.42, 0.56, 0.02]].forEach(([x, y, r]) => {
      ctx.fillStyle = 'rgba(200, 175, 130, 0.35)';
      ctx.beginPath();
      ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
  mat.color.setScalar(1.15);
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  moon.renderOrder = -1;
  stage.scene.add(moon);
  const state = { opacity: 0 };
  stage.onFrame(() => {
    const { hw, hh } = visibleHalf(stage, MOON_Z);
    const size = Math.min(hw, hh) * 0.95;
    moon.position.set(hw * 0.42, hh * 0.58, MOON_Z);
    moon.scale.setScalar(size);
    mat.opacity = state.opacity;
  });
  return { state, get position() { return moon.position; } };
}

function drawReindeer(ctx, x, y, s, legPhase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 12, -0.08, 0, Math.PI * 2); // corps
  ctx.fill();
  ctx.beginPath(); // cou + tête
  ctx.moveTo(22, -6);
  ctx.quadraticCurveTo(34, -18, 42, -28);
  ctx.lineTo(50, -24);
  ctx.quadraticCurveTo(40, -10, 30, 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(50, -29, 10, 5.5, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath(); // bois
  ctx.moveTo(44, -33); ctx.lineTo(36, -52); ctx.lineTo(28, -58);
  ctx.moveTo(38, -47); ctx.lineTo(46, -56);
  ctx.moveTo(33, -54); ctx.lineTo(34, -63);
  ctx.moveTo(48, -33); ctx.lineTo(44, -50); ctx.lineTo(50, -58);
  ctx.stroke();
  ctx.lineWidth = 4.5; // pattes en plein galop
  const a = Math.sin(legPhase) * 6;
  ctx.beginPath();
  ctx.moveTo(22, 6); ctx.lineTo(40 + a, 16); ctx.lineTo(52 + a, 14);
  ctx.moveTo(16, 8); ctx.lineTo(34 - a, 20); ctx.lineTo(44 - a, 22);
  ctx.moveTo(-24, 6); ctx.lineTo(-42 - a, 14); ctx.lineTo(-54 - a, 12);
  ctx.moveTo(-18, 8); ctx.lineTo(-36 + a, 18); ctx.lineTo(-48 + a, 20);
  ctx.stroke();
  ctx.beginPath(); // queue
  ctx.moveTo(-33, -4); ctx.lineTo(-42, -10);
  ctx.stroke();
  ctx.restore();
}

function drawSleigh(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // patin
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(40, 196);
  ctx.lineTo(236, 196);
  ctx.quadraticCurveTo(270, 194, 266, 166);
  ctx.quadraticCurveTo(262, 150, 248, 156);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(80, 196); ctx.lineTo(86, 180);
  ctx.moveTo(190, 196); ctx.lineTo(184, 180);
  ctx.stroke();
  // caisse
  ctx.beginPath();
  ctx.moveTo(60, 182);
  ctx.lineTo(214, 182);
  ctx.quadraticCurveTo(244, 180, 246, 150);
  ctx.lineTo(228, 144);
  ctx.lineTo(206, 158);
  ctx.lineTo(86, 158);
  ctx.quadraticCurveTo(60, 150, 54, 112);
  ctx.lineTo(40, 118);
  ctx.quadraticCurveTo(42, 172, 60, 182);
  ctx.closePath();
  ctx.fill();
  // hotte de cadeaux
  ctx.beginPath();
  ctx.ellipse(96, 132, 26, 30, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Père Noël : corps, tête, bonnet
  ctx.beginPath();
  ctx.ellipse(152, 128, 26, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(160, 92, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(146, 86);
  ctx.quadraticCurveTo(160, 64, 186, 66);
  ctx.lineTo(176, 84);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(188, 66, 6, 0, Math.PI * 2);
  ctx.fill();
  // bras tenant les rênes
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(166, 120);
  ctx.lineTo(196, 128);
  ctx.stroke();
}

/** Traîneau du Père Noël et ses rennes, en silhouette avec un liseré doré. */
export function createSleigh(stage, dust) {
  const W = 1280;
  const H = 300;
  const tex = canvasTexture(W, H, (ctx) => {
    ctx.shadowColor = 'rgba(255, 210, 130, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#0b0f26';
    ctx.strokeStyle = '#0b0f26';
    drawSleigh(ctx);
    // rênes
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(196, 128);
    ctx.quadraticCurveTo(500, 150, 1140, 118);
    ctx.stroke();
    [[380, 150, 0.95, 0], [560, 138, 0.95, 1.4], [740, 128, 0.95, 2.6], [920, 120, 0.95, 3.9], [1100, 112, 0.95, 5.1]]
      .forEach(([x, y, s, p]) => drawReindeer(ctx, x, y, s, p));
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), mat);
  mesh.renderOrder = 1;
  mesh.visible = false;
  stage.scene.add(mesh);
  const trail = new THREE.Vector3();

  return {
    /** Traverse le ciel en arc devant la lune. */
    fly(seconds = 2.8) {
      const { hw, hh } = visibleHalf(stage, SLEIGH_Z);
      const width = Math.max(hw * 1.25, 9);
      mesh.scale.setScalar(width);
      mesh.visible = true;
      const p = { t: 0 };
      return new Promise((resolve) => {
        gsap.timeline({ onComplete: () => { mesh.visible = false; resolve(); } })
          .to(mat, { opacity: 1, duration: 0.4 }, 0)
          .to(p, {
            t: 1,
            duration: seconds,
            ease: 'none',
            onUpdate: () => {
              const x = -hw - width / 2 + p.t * (2 * hw + width);
              const y = hh * 0.62 - Math.sin(p.t * Math.PI) * hh * 0.08 + Math.sin(p.t * 14) * 0.08;
              mesh.position.set(x, y, SLEIGH_Z);
              mesh.rotation.z = Math.cos(p.t * Math.PI) * 0.06;
              trail.set(x - width * 0.44, y - width * 0.05, SLEIGH_Z);
              dust.emit(trail, 3, 0.25);
            },
          }, 0)
          .to(mat, { opacity: 0, duration: 0.4 }, seconds - 0.4);
      });
    },
  };
}

function hollyLeafShape() {
  const s = new THREE.Shape();
  const pts = 7;
  s.moveTo(0, 0);
  for (let k = 1; k <= pts; k++) {
    const x = (k / pts) * 1;
    const bump = k % 2 === 1 ? 0.22 : 0.15;
    s.quadraticCurveTo(x - 0.07, bump * 0.4, x, bump * (k === pts ? 0 : 1));
  }
  for (let k = pts - 1; k >= 0; k--) {
    const x = (k / pts) * 1;
    const bump = k % 2 === 1 ? -0.22 : -0.15;
    s.quadraticCurveTo(x + 0.07, bump * 0.4, x, k === 0 ? 0 : bump);
  }
  return s;
}

/** Brin de houx : deux feuilles et trois baies. */
export function createHolly(materialsOut = []) {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f7a43, roughness: 0.45, metalness: 0.1, transparent: true, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  const berryMat = new THREE.MeshStandardMaterial({ color: 0xd42a3a, roughness: 0.3, metalness: 0, transparent: true, emissive: 0x5a0010, emissiveIntensity: 0.4 });
  materialsOut.push(leafMat, berryMat);
  const leafGeo = new THREE.ShapeGeometry(hollyLeafShape(), 6);
  [[0.35, 0.18], [Math.PI - 0.35, 0.18], [-Math.PI / 2 + 0.2, 0.0]].slice(0, 2).forEach(([rot]) => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.rotation.z = rot;
    leaf.scale.setScalar(0.42);
    group.add(leaf);
  });
  const berryGeo = new THREE.SphereGeometry(0.055, 16, 12);
  [[0, 0.02], [0.07, -0.05], [-0.07, -0.05]].forEach(([x, y]) => {
    const b = new THREE.Mesh(berryGeo, berryMat);
    b.position.set(x, y, 0.04);
    group.add(b);
  });
  return group;
}
