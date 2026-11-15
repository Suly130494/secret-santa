/** Petit créateur d'éléments DOM, sans innerHTML (pas d'injection via les prénoms). */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key.startsWith('aria-') || key === 'for' || key === 'role' || !(key in el)) el.setAttribute(key, value === true ? '' : value);
    else el[key] = value;
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child.nodeType ? child : String(child));
  }
  return el;
}

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Clone un <template id="…"> dans `root`. */
export function mountTemplate(root, id) {
  root.replaceChildren(document.getElementById(id).content.cloneNode(true));
  return root;
}
