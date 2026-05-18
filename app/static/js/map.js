// ── Core: visited store, toggle, stats, list ──────────────────────
// Each map module calls registerMap(config) to plug in.
// Adding a new map = new file + new tab in index.html, nothing else.

const _modules = [];

function registerMap(config) {
  _modules.push(config);
}

// visited keyed by "kind:rawCode" e.g. "state:CA", "park:YOSE"
const visited = new Map();
window.INITIAL_DATA.forEach(item => {
  const rawCode = item.code.includes(':') ? item.code.split(':').slice(1).join(':') : item.code;
  const key = `${item.kind}:${rawCode}`;
  visited.set(key, { ...item, rawCode });
});

function isVisited(kind, rawCode) {
  return visited.has(`${kind}:${rawCode}`);
}

async function toggle(rawCode, name, kind) {
  if (!rawCode) return;
  const key = `${kind}:${rawCode}`;
  if (visited.has(key)) {
    await fetch(`/api/visited/${kind}/${rawCode}`, { method: 'DELETE' });
    visited.delete(key);
    showToast(`Removed: ${name}`, 'remove');
  } else {
    await fetch('/api/visited', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: rawCode, name, kind })
    });
    visited.set(key, { rawCode, name, kind });
    showToast(`Added: ${name}`);
  }
  _modules.forEach(m => m.refresh && m.refresh());
  updateStats();
  updateList();
}

async function toggleFromList(key) {
  const item = visited.get(key);
  if (item) await toggle(item.rawCode, item.name, item.kind);
}

function showToast(msg, type='add') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'remove' ? ' remove' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', 2400);
}

function updateStats() {
  _modules.forEach(m => {
    const count = [...visited.values()].filter(v => v.kind === m.kind).length;
    const el = document.getElementById(`${m.id}-count`);
    if (el) el.textContent = count;
    const listEl = document.getElementById(`list-${m.id}-count`);
    if (listEl) listEl.textContent = `(${count})`;
  });
}

function updateList() {
  _modules.forEach(m => {
    const items = [...visited.values()]
      .filter(v => v.kind === m.kind)
      .sort((a, b) => a.name.localeCompare(b.name));
    const el = document.getElementById(`${m.id}-list`);
    if (!el) return;
    el.innerHTML = items.length
      ? items.map(item => chip(item, `${item.kind}:${item.rawCode}`)).join('')
      : `<p class="empty-msg">No ${m.label.replace(/^\S+\s*/, '').toLowerCase()} visited yet</p>`;
  });
}

function chip(item, key) {
  return `<span class="place-chip" onclick="toggleFromList('${key}')">
    <span class="dot" style="background:${_modules.find(m=>m.kind===item.kind)?.visitedColor||'#fff'}"></span>
    ${item.name}
    <span class="remove">✕</span>
  </span>`;
}

function switchTab(name) {
  const tabEls = document.querySelectorAll('.tab');
  const tabIds = [...tabEls].map(t => t.dataset.tab);
  tabEls.forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle('active', active);
    t.classList.toggle('accent2', active && t.dataset.accent === '2');
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${name}`);
  });
  // Init or resize the matching module's map
  const mod = _modules.find(m => m.id === name);
  if (mod) {
    if (!mod._initialised) {
      setTimeout(() => { mod.init(); mod._initialised = true; }, 50);
    } else if (mod._map) {
      setTimeout(() => mod._map.invalidateSize(), 50);
    }
  }
}

// Initialise on load
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  updateList();
  // Init the first (active) module immediately
  if (_modules.length > 0) {
    _modules[0].init();
    _modules[0]._initialised = true;
  }
});
