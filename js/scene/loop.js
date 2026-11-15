/**
 * Boucle d'animation à un seul rappel en attente : la masquer puis la réafficher
 * (aller sur WhatsApp et revenir) ne crée jamais de deuxième boucle.
 */
export function createLoop(step, { raf = (cb) => requestAnimationFrame(cb), caf = (id) => cancelAnimationFrame(id) } = {}) {
  let id = 0;
  const tick = (t) => {
    id = raf(tick);
    step(t);
  };
  return {
    start() { if (!id) id = raf(tick); },
    stop() {
      if (id) caf(id);
      id = 0;
    },
    get running() { return id !== 0; },
  };
}
