import { routeFor } from './core/route.js';
import { createStore } from './core/storage.js';
import { mountTemplate } from './ui/dom.js';
import { mountFestive } from './ui/festive.js';

const app = document.getElementById('app');
const store = createStore();
const route = routeFor(location.hash);
const baseUrl = location.href.split('#')[0].split('?')[0];

document.body.dataset.view = route.view;
mountFestive({ forest: route.view !== 'admin' });
// Un nouveau « # » = une autre vue : on repart d'une page propre.
window.addEventListener('hashchange', () => location.reload());

async function start() {
  switch (route.view) {
    case 'admin': {
      const { startAdmin } = await import('./admin/admin.js');
      startAdmin({ root: app, store, baseUrl });
      break;
    }
    case 'player': {
      const { bootPlayer } = await import('./player/boot.js');
      await bootPlayer({ root: app, route, store });
      break;
    }
    case 'broken':
      mountTemplate(app, 'tpl-broken');
      break;
    default:
      mountTemplate(app, 'tpl-landing');
  }
}

start().catch((err) => {
  console.error(err);
  mountTemplate(app, 'tpl-broken');
});
