/* Citebox – application UI and state. Everything lives in the browser:
 * localStorage for instant autosave, plus explicit Save/Open to a file on the device. */
(function () {
  'use strict';
  const { STYLES, TYPES, FIELDS, DATE_FIELDS, ROLE_LABELS, MONTHS, format, inText, sortKey, strip, esc } = window.Cite;
  const KEY = 'citebox:v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const MOD = isMac ? '⌘' : 'Ctrl';

  /* ======================= icons ======================= */
  const P = {
    filePlus: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>', chevRight: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    folderPlus: '<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    share: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    user: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M10 13h4M7 16h10"/>',
    fileImport: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    move: '<path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    style: '<path d="m4 20 4-11 4 11M5.5 16h5"/><path d="M15 19c1.5 1.5 4.5 1 5-2l-3-9-3 7"/>',
    sort: '<path d="m3 16 4 4 4-4M7 20V4M11 4h10M11 8h7M11 12h4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .01-1 1.03V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2h-4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    doc: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    plus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>',
    person: '<circle cx="12" cy="5" r="1.5"/><path d="M9 20l3-6 3 6M6 8l6 1 6-1M12 9v5"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
    warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    word: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 12l1.5 6 2.5-5 2.5 5L16 12"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z"/>',
    note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>',
  };
  const icon = (n, size) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${size ? ` width="${size}" height="${size}"` : ''}>${P[n] || ''}</svg>`;
  const ic = (n) => `<span class="ic">${icon(n)}</span>`;
  function hydrate(root = document) { $$('[data-i]', root).forEach((el) => { el.innerHTML = icon(el.dataset.i); el.removeAttribute('data-i'); el.classList.add('ic'); }); }
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); hydrate(t.content); return t.content.firstElementChild; }

  /* ======================= state ======================= */
  const PROJECT_COLORS = ['#8e6bd8', '#3fae6a', '#26a69a', '#e0675f', '#f0a04b', '#5a8fe6', '#d36fb5', '#8d8f2a'];
  const REF_COLORS = { red: '#e5534b', orange: '#f0883e', yellow: '#e3b341', green: '#3fb950', blue: '#4a84e4', purple: '#a371f7' };
  const FONTS = ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Georgia', 'Garamond', 'Helvetica', 'Verdana'];
  const FONT_STACK = { 'Times New Roman': "'Times New Roman', Tinos, Times, serif", Arial: 'Arial, Helvetica, sans-serif', Calibri: 'Calibri, Carlito, sans-serif', Cambria: 'Cambria, Caladea, Georgia, serif', Georgia: 'Georgia, serif', Garamond: 'Garamond, "EB Garamond", serif', Helvetica: 'Helvetica, Arial, sans-serif', Verdana: 'Verdana, sans-serif' };
  const SORTS = { auto: 'Auto sort', alpha: 'Alphabetical', added: 'Date added', addedRev: 'Newest first', year: 'Year published', type: 'Source type' };
  const MAIN_TABS = ['website', 'book', 'journal'];

  let state;
  const ui = { tab: 'website', moreTab: null, selected: new Set(), undo: [], redo: [], justAdded: new Set(), fileHandle: null, dirty: false, search: '' };

  function newProject(name, folderId = null) {
    return { id: uid(), name: name || 'Untitled project', folderId, color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      style: (state && state.defaultStyle) || 'apa7', font: 'Times New Roman', fontSize: 12, sort: 'auto', locked: false, created: Date.now(), citations: [] };
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    state = Object.assign({ version: 1, theme: document.documentElement.dataset.theme || 'light', sidebarOpen: window.innerWidth > 860, folders: [], projects: [], activeId: null, welcomed: false, savedAt: 0, autoFile: true, defaultStyle: 'apa7' }, s || {});
    if (window.innerWidth <= 860) state.sidebarOpen = false; // overlay sidebar starts closed on small screens
    if (!state.projects.length) { const p = newProject('My project'); state.projects.push(p); }
    if (!project()) state.activeId = state.projects[0].id;
    ui.dirty = !!state.dirtySinceFile;
  }
  function project() { return state.projects.find((p) => p.id === state.activeId) || null; }

  let fileTimer = null;
  function persist() {
    state.savedAt = Date.now();
    ui.dirty = true;
    state.dirtySinceFile = true;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      toast('Browser storage is full. Use Save to keep a copy on your device.', { type: 'err', timeout: 8000 });
    }
    renderStatus();
    // keep a linked device file in sync too
    if (ui.fileHandle && state.autoFile) {
      clearTimeout(fileTimer);
      fileTimer = setTimeout(() => writeLinkedFile(true), 1200);
    }
  }
  function savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  // every data change goes through commit() so it can be undone
  function commit(fn, opts = {}) {
    const p = project();
    if (p && p.locked && !opts.force) { toast('This project is locked. Unlock it to make changes.', { type: 'err' }); return false; }
    const before = JSON.stringify({ projects: state.projects, folders: state.folders, activeId: state.activeId });
    fn();
    ui.undo.push(before);
    if (ui.undo.length > 100) ui.undo.shift();
    ui.redo = [];
    persist();
    render();
    return true;
  }
  function restore(snap) {
    const s = JSON.parse(snap);
    state.projects = s.projects; state.folders = s.folders; state.activeId = s.activeId;
    ui.selected.clear();
    persist(); render();
  }
  const snapshot = () => JSON.stringify({ projects: state.projects, folders: state.folders, activeId: state.activeId });
  function undo() { if (!ui.undo.length) return; ui.redo.push(snapshot()); restore(ui.undo.pop()); toast('Undone'); }
  function redo() { if (!ui.redo.length) return; ui.undo.push(snapshot()); restore(ui.redo.pop()); toast('Redone'); }

  /* ======================= small UI helpers ======================= */
  function toast(msg, opts = {}) {
    const el = h(`<div class="toast ${opts.type === 'err' ? 'err' : ''}">${ic(opts.type === 'err' ? 'warning' : 'check')}<span class="txt"></span></div>`);
    el.querySelector('.txt').textContent = msg;
    if (opts.action) {
      const b = document.createElement('button');
      b.textContent = opts.action.label;
      b.onclick = () => { opts.action.fn(); dismiss(); };
      el.appendChild(b);
    }
    const box = $('#toasts');
    while (box.children.length > 2) box.firstChild.remove();
    box.appendChild(el);
    let gone = false;
    function dismiss() { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 260); }
    setTimeout(dismiss, opts.timeout || 3200);
    return dismiss;
  }

  let openMenuState = null;
  function closeMenu() {
    if (!openMenuState) return;
    openMenuState.el.remove();
    openMenuState.anchor && openMenuState.anchor.classList.remove('menu-open');
    openMenuState.owner && openMenuState.owner.classList.remove('menu-open');
    const cb = openMenuState.onClose;
    openMenuState = null;
    cb && cb();
  }
  /* items: {label, sub, icon, kbd, checked, danger, onClick, keepOpen} | {sep:true} | {header:'..'} | {el: Node} */
  function openMenu(anchor, items, opts = {}) {
    if (openMenuState && openMenuState.anchor === anchor) { closeMenu(); return; }
    closeMenu();
    const el = document.createElement('div');
    el.className = 'menu';
    el.setAttribute('role', 'menu');
    if (opts.minWidth) el.style.minWidth = opts.minWidth + 'px';
    items.filter(Boolean).forEach((it) => {
      if (it.sep) return el.appendChild(h('<div class="menu-sep"></div>'));
      if (it.header) { const d = h('<div class="menu-label"></div>'); d.textContent = it.header; return el.appendChild(d); }
      if (it.el) return el.appendChild(it.el);
      const b = h(`<button class="menu-item${it.checked ? ' checked' : ''}${it.danger ? ' danger' : ''}" role="menuitem">${it.icon ? ic(it.icon) : it.emoji ? `<span style="width:16px;text-align:center">${it.emoji}</span>` : ''}<span class="mi-l"><span class="mi-t"></span>${it.sub ? '<span class="mi-sub"></span>' : ''}</span>${it.kbd ? `<span class="mi-k">${it.kbd}</span>` : ''}${it.checked ? `<span class="mi-k">${icon('check', 14)}</span>` : ''}</button>`);
      b.querySelector('.mi-t').textContent = it.label;
      if (it.sub) b.querySelector('.mi-sub').textContent = it.sub;
      if (it.disabled) b.disabled = true, (b.style.opacity = '.5');
      b.onclick = (e) => { e.stopPropagation(); if (!it.keepOpen) closeMenu(); it.onClick && it.onClick(e); };
      el.appendChild(b);
    });
    document.body.appendChild(el);
    const r = (opts.rect || anchor.getBoundingClientRect());
    const mw = el.offsetWidth, mh = el.offsetHeight;
    let left = opts.alignRight ? r.right - mw : r.left;
    let top = r.bottom + 6;
    if (left + mw > innerWidth - 8) left = innerWidth - mw - 8;
    if (left < 8) left = 8;
    if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    el.style.left = left + 'px'; el.style.top = top + 'px';
    anchor && anchor.classList && anchor.classList.add('menu-open');
    opts.owner && opts.owner.classList.add('menu-open');
    openMenuState = { el, anchor, owner: opts.owner, onClose: opts.onClose };
    const first = el.querySelector('input') || null;
    if (first) setTimeout(() => first.focus(), 0);
    return el;
  }
  document.addEventListener('mousedown', (e) => { if (openMenuState && !openMenuState.el.contains(e.target) && !(openMenuState.anchor && openMenuState.anchor.contains && openMenuState.anchor.contains(e.target))) closeMenu(); }, true);
  window.addEventListener('resize', closeMenu);

  const modals = [];
  function openModal({ title, head, body, foot, size = '', cls = '', onClose, footCls = '' }) {
    closeMenu();
    const wrap = h(`<div class="modal-wrap"><div class="modal ${size} ${cls}" role="dialog" aria-modal="true">
      ${head !== false ? `<div class="modal-head"><h2></h2><button class="icon-btn modal-close" aria-label="Close">${icon('x')}</button></div>` : `<button class="icon-btn modal-close" style="top:22px;z-index:2" aria-label="Close">${icon('x')}</button>`}
      <div class="modal-body"></div>${foot ? `<div class="modal-foot ${footCls}"></div>` : ''}</div></div>`);
    if (head !== false) {
      const h2 = wrap.querySelector('.modal-head h2');
      if (head) h2.replaceWith(head); else h2.textContent = title || '';
    }
    const bodyEl = wrap.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    if (foot) { const f = wrap.querySelector('.modal-foot'); if (typeof foot === 'string') f.innerHTML = foot; else f.appendChild(foot); }
    hydrate(wrap);
    const m = { el: wrap, body: bodyEl, close, onClose };
    let closed = false;
    function close(result) {
      if (closed) return; closed = true;
      wrap.classList.add('closing');
      setTimeout(() => wrap.remove(), 180);
      const k = modals.indexOf(m); if (k >= 0) modals.splice(k, 1);
      onClose && onClose(result);
    }
    wrap.querySelector('.modal-close').onclick = () => close();
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) wrap._down = true; });
    wrap.addEventListener('click', (e) => { if (e.target === wrap && wrap._down) close(); wrap._down = false; });
    $('#layer').appendChild(wrap);
    modals.push(m);
    setTimeout(() => { const f = wrap.querySelector('[autofocus], .modal-body input:not([type=checkbox]), .modal-body textarea'); f && f.focus(); }, 40);
    return m;
  }
  function confirmDialog({ title, message, ok = 'Confirm', danger = false, alt }) {
    return new Promise((resolve) => {
      const foot = h(`<div style="display:flex;gap:8px;width:100%;justify-content:flex-end"><button class="btn btn-ghost" data-r="cancel">Cancel</button>${alt ? `<button class="btn btn-outline" data-r="alt"></button>` : ''}<button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="ok"></button></div>`);
      foot.querySelector('[data-r=ok]').textContent = ok;
      if (alt) foot.querySelector('[data-r=alt]').textContent = alt;
      const body = document.createElement('p');
      body.textContent = message;
      let result = false;
      const m = openModal({ title, body, foot, onClose: () => resolve(result) });
      foot.querySelectorAll('button').forEach((b) => (b.onclick = () => { result = b.dataset.r === 'cancel' ? false : b.dataset.r; m.close(); }));
      setTimeout(() => foot.querySelector('[data-r=ok]').focus(), 50);
    });
  }
  function promptDialog({ title, value = '', label = '', ok = 'Save', placeholder = '' }) {
    return new Promise((resolve) => {
      const body = h(`<div>${label ? `<p></p>` : ''}<input class="inp" autofocus></div>`);
      if (label) body.querySelector('p').textContent = label;
      const inp = body.querySelector('input');
      inp.value = value; inp.placeholder = placeholder;
      const foot = h(`<div style="display:flex;gap:8px;width:100%;justify-content:flex-end"><button class="btn btn-ghost">Cancel</button><button class="btn btn-primary"></button></div>`);
      foot.lastChild.textContent = ok;
      let result = null;
      const m = openModal({ title, body, foot, onClose: () => resolve(result) });
      const done = () => { result = inp.value.trim(); m.close(); };
      foot.firstChild.onclick = () => m.close();
      foot.lastChild.onclick = done;
      inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
      setTimeout(() => inp.select(), 60);
    });
  }

  // tooltips
  (function tooltips() {
    const tip = $('#tooltip');
    let cur = null, timer = null;
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-tip]');
      if (t === cur) return;
      cur = t; clearTimeout(timer); tip.classList.remove('show');
      if (!t || matchMedia('(hover: none)').matches) return;
      timer = setTimeout(() => {
        tip.textContent = t.dataset.tip;
        const r = t.getBoundingClientRect();
        const w = tip.offsetWidth;
        let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
        let top = r.bottom + 8;
        if (top + 30 > innerHeight) top = r.top - 34;
        tip.style.left = left + 'px'; tip.style.top = top + 'px';
        tip.classList.add('show');
      }, 380);
    });
    document.addEventListener('mousedown', () => { clearTimeout(timer); tip.classList.remove('show'); cur = null; });
  })();

  /* ======================= rendering ======================= */
  function render() {
    renderSidebar();
    renderTop();
    renderTabs();
    renderSearch();
    renderToolbar();
    renderList();
    renderStatus();
  }

  function renderSidebar() {
    $('#app').classList.toggle('sb-closed', !state.sidebarOpen);
    $('#themeBtn').innerHTML = icon(state.theme === 'dark' ? 'sun' : 'moon');
    const tree = $('#tree');
    tree.innerHTML = '';
    const q = ui.search.toLowerCase();
    const match = (p) => !q || p.name.toLowerCase().includes(q);
    const projItem = (p) => {
      const el = h(`<div class="tree-item${p.id === state.activeId ? ' active' : ''}" draggable="true" data-id="${p.id}" style="border-left-color:${p.color};--proj-soft:${p.color}2a">
        <span class="doc-ic">${icon('doc')}</span><span class="t-name"></span><span class="t-count">${p.citations.length}</span>
        <button class="icon-btn icon-btn-sm t-more" aria-label="Project options">${icon('more')}</button></div>`);
      el.querySelector('.t-name').textContent = p.name;
      if (p.locked) el.querySelector('.t-name').insertAdjacentHTML('afterend', `<span class="doc-ic" title="Locked">${icon('lock')}</span>`);
      el.onclick = (e) => { if (e.target.closest('.t-more')) return; switchProject(p.id); };
      el.querySelector('.t-more').onclick = (e) => { e.stopPropagation(); projectMenu(p, e.currentTarget, el); };
      el.ondblclick = () => renameProjectInline(p, el);
      el.ondragstart = (e) => { e.dataTransfer.setData('text/x-citebox-project', p.id); e.dataTransfer.effectAllowed = 'move'; };
      return el;
    };
    const roots = state.projects.filter((p) => !p.folderId || !state.folders.find((f) => f.id === p.folderId));
    state.folders.forEach((f) => {
      const kids = state.projects.filter((p) => p.folderId === f.id && match(p));
      if (q && !kids.length && !f.name.toLowerCase().includes(q)) return;
      const open = f.open !== false || !!q;
      const fe = h(`<div class="tree-item folder${open ? '' : ' closed'}" data-folder="${f.id}">
        <span class="chev ic">${icon('chevDown')}</span><span class="doc-ic">${icon('folder')}</span><span class="t-name"></span><span class="t-count">${kids.length}</span>
        <button class="icon-btn icon-btn-sm t-more" aria-label="Folder options">${icon('more')}</button></div>`);
      fe.querySelector('.t-name').textContent = f.name;
      fe.onclick = (e) => { if (e.target.closest('.t-more')) return; f.open = !open; savePrefs(); renderSidebar(); };
      fe.querySelector('.t-more').onclick = (e) => { e.stopPropagation(); folderMenu(f, e.currentTarget, fe); };
      dropTarget(fe, f.id);
      tree.appendChild(fe);
      const ch = h(`<div class="tree-children${open ? '' : ' closed'}"></div>`);
      kids.forEach((p) => ch.appendChild(projItem(p)));
      if (!kids.length) ch.appendChild(h('<div class="tree-empty">Empty folder – drag projects here</div>'));
      tree.appendChild(ch);
    });
    roots.filter(match).forEach((p) => tree.appendChild(projItem(p)));
    if (q && !tree.children.length) tree.appendChild(h('<div class="tree-empty">No matching projects</div>'));
    dropTarget(tree, null);
    // storage summary
    const n = state.projects.reduce((a, p) => a + p.citations.length, 0);
    $('#sbStorage').textContent = `${state.projects.length} project${state.projects.length === 1 ? '' : 's'} · ${n} reference${n === 1 ? '' : 's'} · stored in this browser`;
  }
  function dropTarget(el, folderId) {
    el.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('text/x-citebox-project')) return;
      e.preventDefault(); e.stopPropagation();
      el.classList.add('drop-target');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', (e) => {
      const id = e.dataTransfer.getData('text/x-citebox-project');
      el.classList.remove('drop-target');
      if (!id) return;
      e.preventDefault(); e.stopPropagation();
      const p = state.projects.find((x) => x.id === id);
      if (p && p.folderId !== folderId) commit(() => { p.folderId = folderId; }, { force: true });
    });
  }

  function renderTop() {
    const p = project();
    const crumbs = $('#crumbs');
    crumbs.innerHTML = '';
    const folder = state.folders.find((f) => f.id === p.folderId);
    if (folder) {
      const c = h(`<span class="crumb crumb-folder">${ic('folder')}<span></span></span>`);
      c.querySelector('span:last-child').textContent = folder.name;
      c.onclick = () => { state.sidebarOpen = true; folder.open = true; savePrefs(); renderSidebar(); };
      crumbs.appendChild(c);
      crumbs.appendChild(h(`<span class="crumb-sep">${icon('chevRight', 14)}</span>`));
    }
    const t = h(`<span class="crumb">${ic('doc')}<input class="title-input" aria-label="Project name" maxlength="120"></span>`);
    const inp = t.querySelector('input');
    inp.value = p.name;
    const fit = () => { inp.style.width = Math.min(360, Math.max(60, inp.value.length * 8 + 24)) + 'px'; };
    fit();
    inp.oninput = fit;
    inp.onkeydown = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Escape') inp.value = p.name; inp.blur(); } };
    inp.onblur = () => { const v = inp.value.trim(); if (v && v !== p.name) commit(() => { p.name = v; }, { force: true }); else inp.value = p.name; };
    crumbs.appendChild(t);
    $('#undoBtn').disabled = !ui.undo.length;
    $('#redoBtn').disabled = !ui.redo.length;
    $('#saveBtn').classList.toggle('is-dirty', ui.dirty);
    document.title = `${p.name} – Citebox`;
  }

  function currentType() { return ui.tab; }
  function renderTabs() {
    const tabs = $('#tabs');
    tabs.innerHTML = '';
    const mk = (type, label, extra = '') => {
      const t = TYPES[type];
      const b = h(`<button class="tab${ui.tab === type ? ' active' : ''}" role="tab"><span>${t ? t.emoji : ''}</span><span class="tl"></span>${extra}</button>`);
      b.querySelector('.tl').textContent = label || t.label;
      b.onclick = () => setTab(type);
      return b;
    };
    MAIN_TABS.forEach((t) => tabs.appendChild(mk(t)));
    const pre = mk('preformatted', 'Pre-formatted', `<span class="q" data-tip="Paste a reference that is already formatted, exactly as you want it to appear">${icon('help')}</span>`);
    tabs.appendChild(pre);
    if (ui.moreTab) tabs.appendChild(mk(ui.moreTab, TYPES[ui.moreTab].label));
    const more = h(`<button class="tab" aria-haspopup="menu">${ic('chevDown')}<span>More</span></button>`);
    more.onclick = () => {
      const items = Object.keys(TYPES).filter((k) => !MAIN_TABS.includes(k) && k !== 'preformatted').map((k) => ({ label: TYPES[k].label, emoji: TYPES[k].emoji, checked: ui.tab === k, onClick: () => { ui.moreTab = k; setTab(k); } }));
      openMenu(more, items, { alignRight: true, minWidth: 220 });
    };
    tabs.appendChild(more);
  }
  function setTab(type) {
    ui.tab = type;
    if (!MAIN_TABS.includes(type) && type !== 'preformatted') ui.moreTab = type;
    renderTabs(); renderSearch();
    const f = type === 'preformatted' ? $('#preEditor') : $('#searchInput');
    f.focus();
  }

  const PLACEHOLDERS = {
    website: 'Enter or paste a URL (web page address), or search by title',
    book: 'Search by book title, ISBN or author',
    journal: 'Search by article title, DOI or keywords',
    chapter: 'Search for the book by title or ISBN, then add chapter details',
    video: 'Paste a YouTube, Vimeo or other video URL',
    newspaper: 'Paste the article URL, or cite manually',
    magazine: 'Paste the article URL, or cite manually',
    blog: 'Paste the blog post URL',
    encyclopedia: 'Paste the entry URL, or cite manually',
    conference: 'Search by paper title or DOI',
    report: 'Search by title or DOI, or paste a URL',
    thesis: 'Search by title or DOI, or paste a URL',
    dataset: 'Search by title or DOI',
  };
  function renderSearch() {
    const pre = ui.tab === 'preformatted';
    const inp = $('#searchInput');
    inp.hidden = pre;
    $('#preEditor').hidden = !pre;
    $('#italicBtn').hidden = !pre;
    $('#pasteBtn').hidden = pre;
    $('#manualBtn').hidden = pre;
    $('#importBtn').hidden = pre;
    inp.placeholder = PLACEHOLDERS[ui.tab] || `Paste a URL or search by title – or press the keyboard button to cite a ${TYPES[ui.tab].label.toLowerCase()} manually`;
    $('#searchBtn .lbl').textContent = pre ? 'Add' : 'Search';
    $('#searchBtn').querySelector('.ic').innerHTML = icon(pre ? 'check' : 'search');
    const p = project();
    $('#lockBtn').innerHTML = icon(p.locked ? 'lock' : 'unlock');
    $('#lockBtn').classList.toggle('active', p.locked);
    $('#lockBtn').dataset.tip = p.locked ? 'Project locked – click to unlock' : 'Lock project to prevent changes';
    [inp, $('#searchBtn'), $('#manualBtn'), $('#pasteBtn'), $('#importBtn')].forEach((el) => (el.disabled = p.locked));
    $('#preEditor').contentEditable = String(!p.locked);
  }

  function renderToolbar() {
    const p = project();
    const fs = $('#fontSel');
    if (!fs.options.length) {
      FONTS.forEach((f) => fs.add(new Option(f, f)));
      for (let s = 9; s <= 16; s++) $('#sizeSel').add(new Option(String(s), String(s)));
    }
    fs.value = p.font; $('#sizeSel').value = String(p.fontSize);
    $('#styleLbl').textContent = STYLES[p.style].name.replace(/\(([^)]{20})[^)]*\)/, '($1…)');
    $('#styleBtn').title = STYLES[p.style].name;
    $('#sortLbl').textContent = SORTS[p.sort] || 'Auto sort';
    const n = ui.selected.size;
    $('#tbNormal').hidden = n > 0;
    $('#tbSelected').hidden = n === 0;
    $('#selCount').textContent = `${n} selected`;
    const all = $('#selectAll');
    all.checked = n > 0 && n === p.citations.length;
    all.indeterminate = n > 0 && n < p.citations.length;
    $('#paper').classList.toggle('has-selection', n > 0);
  }

  function sorted(p) {
    const list = p.citations.slice();
    const mode = p.sort === 'auto' ? (STYLES[p.style].numbered ? 'added' : 'alpha') : p.sort;
    const byKey = (a, b) => sortKey(a, p.style).localeCompare(sortKey(b, p.style));
    if (mode === 'alpha') list.sort(byKey);
    else if (mode === 'added') list.sort((a, b) => a.created - b.created);
    else if (mode === 'addedRev') list.sort((a, b) => b.created - a.created);
    else if (mode === 'year') list.sort((a, b) => (parseInt(b.fields.issued && b.fields.issued.y, 10) || 0) - (parseInt(a.fields.issued && a.fields.issued.y, 10) || 0) || byKey(a, b));
    else if (mode === 'type') list.sort((a, b) => TYPES[a.type].label.localeCompare(TYPES[b.type].label) || byKey(a, b));
    return list;
  }
  function missing(c) {
    if (c.type === 'preformatted') return [];
    const t = TYPES[c.type];
    const out = [];
    const f = c.fields || {};
    if (!(c.contributors || []).some((x) => x.family || x.literal || x.given) && !['website', 'encyclopedia', 'film', 'image', 'misc'].includes(c.type)) out.push('author');
    t.important.forEach((k) => {
      const v = f[k];
      const empty = DATE_FIELDS.includes(k) ? !(v && v.y) : !v;
      if (empty) out.push((t.labels[k] || FIELDS[k]).toLowerCase().replace(/ \(.*\)/, ''));
    });
    return out;
  }
  function linkify(html) {
    return html.replace(/(https?:\/\/[^\s<]+[^\s<.,;)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="url">$1</a>');
  }

  function renderList() {
    const p = project();
    const paper = $('#paper');
    const st = STYLES[p.style];
    paper.className = `paper style-${p.style}${st.numbered ? ' numbered' : ''}${p.locked ? ' locked' : ''}${ui.selected.size ? ' has-selection' : ''}`;
    paper.style.setProperty('--ref-font', FONT_STACK[p.font] || p.font);
    paper.style.setProperty('--ref-size', p.fontSize + 'pt');
    $('#paperHeading').textContent = st.heading;
    const ol = $('#refs');
    ol.innerHTML = '';
    const list = sorted(p);
    $('#empty').hidden = list.length > 0;
    $('#paperHeading').hidden = false;
    list.forEach((c, k) => {
      const html = format(c, p.style);
      const num = st.numbered ? `<span class="ref-num">${p.style === 'ieee' ? `[${k + 1}]` : `${k + 1}.`}</span>` : '';
      const li = h(`<li class="ref${ui.selected.has(c.id) ? ' selected' : ''}" data-id="${c.id}">
        <label class="check"><input type="checkbox" ${ui.selected.has(c.id) ? 'checked' : ''} aria-label="Select reference"><span></span></label>
        <div class="ref-body"><div class="ref-text">${num}${linkify(html) || '<span style="color:var(--text-3)">Empty reference</span>'}</div></div>
        <div class="ref-actions">
          <button class="icon-btn edit-only" data-a="edit" data-tip="Edit">${icon('edit')}</button>
          <button class="icon-btn" data-a="copy" data-tip="Copy reference">${icon('copy')}</button>
          <button class="icon-btn" data-a="intext" data-tip="In-text citation">${icon('quote')}</button>
          <button class="icon-btn" data-a="more" data-tip="More">${icon('more')}</button>
        </div></li>`);
      if (c.color && REF_COLORS[c.color]) { li.dataset.color = c.color; li.style.setProperty('--c', REF_COLORS[c.color]); }
      const body = li.querySelector('.ref-body');
      if (c.fields && c.fields.annotation) {
        const a = document.createElement('div'); a.className = 'ref-annot'; a.textContent = c.fields.annotation; body.appendChild(a);
      }
      const miss = missing(c);
      if (miss.length && !p.locked) {
        const w = h(`<div class="ref-warn">${icon('warning', 13)}<span></span></div>`);
        w.querySelector('span').textContent = 'Missing ' + miss.join(', ');
        body.appendChild(w);
      }
      if (ui.justAdded.has(c.id)) li.classList.add('enter');
      li.querySelector('input').onchange = (e) => { e.target.checked ? ui.selected.add(c.id) : ui.selected.delete(c.id); li.classList.toggle('selected', e.target.checked); renderToolbar(); };
      body.onclick = (e) => {
        if (e.target.closest('a')) return;
        if (window.getSelection().toString()) return; // allow selecting text
        if (ui.selected.size) { const cb = li.querySelector('input'); cb.checked = !cb.checked; cb.onchange({ target: cb }); return; }
        if (p.locked) return toast('This project is locked. Unlock it to edit.', { type: 'err' });
        openEditor(c);
      };
      li.querySelector('.ref-actions').onclick = (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'edit') openEditor(c);
        else if (a === 'copy') copyRefs([c]);
        else if (a === 'intext') openInText(c, k + 1);
        else if (a === 'more') refMenu(c, b, li);
      };
      ol.appendChild(li);
    });
    if (ui.justAdded.size) {
      const first = ol.querySelector('.enter');
      if (first) setTimeout(() => first.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
      ui.justAdded.clear();
    }
    // drop selections that no longer exist
    [...ui.selected].forEach((id) => { if (!p.citations.find((c) => c.id === id)) ui.selected.delete(id); });
  }

  function timeAgo(t) {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(t).toLocaleDateString();
  }
  function renderStatus() {
    const p = project();
    const words = p.citations.reduce((a, c) => a + strip(format(c, p.style)).split(/\s+/).filter(Boolean).length, 0);
    $('#wordCount').textContent = `${words} word${words === 1 ? '' : 's'}`;
    $('#savedTxt').textContent = state.savedAt ? `Saved ${timeAgo(state.savedAt)}` : 'Not saved yet';
    $('#savedStat').dataset.tip = 'Autosaved in this browser. Use Save to keep a copy on your device.';
    const fl = $('#fileLink');
    if (ui.fileHandle) {
      fl.innerHTML = `${ic('link')}<span></span> <button>Unlink</button>`;
      fl.querySelector('span:not(.ic)').textContent = `${state.autoFile ? 'Auto-saving to' : 'Linked to'} ${ui.fileHandle.name}${ui.dirty ? ' (unsaved changes)' : ''}`;
      fl.querySelector('button').onclick = unlinkFile;
    } else {
      fl.innerHTML = ui.dirty ? `${ic('warning')}<span>Changes not yet saved to a file on your device</span>` : '';
    }
    $('#saveBtn').classList.toggle('is-dirty', ui.dirty);
  }
  setInterval(() => { if (document.visibilityState === 'visible') $('#savedTxt').textContent = state.savedAt ? `Saved ${timeAgo(state.savedAt)}` : 'Not saved yet'; }, 5000);

  /* ======================= projects & folders ======================= */
  function switchProject(id) {
    if (state.activeId === id) { if (innerWidth <= 860) { state.sidebarOpen = false; renderSidebar(); } return; }
    state.activeId = id;
    ui.selected.clear();
    if (innerWidth <= 860) state.sidebarOpen = false;
    savePrefs();
    render();
    $('#scroll').scrollTop = 0;
  }
  function createProject(folderId = null) {
    const p = newProject('Untitled project', folderId);
    p.style = project() ? project().style : 'apa7';
    commit(() => { state.projects.unshift(p); state.activeId = p.id; ui.selected.clear(); }, { force: true });
    if (folderId) { const f = state.folders.find((x) => x.id === folderId); if (f) f.open = true; }
    setTimeout(() => { const t = $('.title-input'); t && (t.focus(), t.select()); }, 50);
    toast('New project created');
  }
  async function createFolder() {
    const name = await promptDialog({ title: 'New folder', placeholder: 'e.g. Psychology 101', ok: 'Create' });
    if (!name) return;
    commit(() => state.folders.push({ id: uid(), name, open: true }), { force: true });
  }
  function renameProjectInline(p, el) {
    const name = el.querySelector('.t-name');
    const inp = document.createElement('input');
    inp.className = 'title-input';
    inp.style.width = '100%';
    inp.value = p.name;
    name.replaceWith(inp);
    inp.focus(); inp.select();
    const done = (save) => { const v = inp.value.trim(); if (save && v && v !== p.name) commit(() => { p.name = v; }, { force: true }); else renderSidebar(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
    inp.onblur = () => done(true);
    inp.onclick = (e) => e.stopPropagation();
  }
  function projectMenu(p, anchor, row) {
    const folders = state.folders.filter((f) => f.id !== p.folderId);
    openMenu(anchor, [
      { label: 'Rename', icon: 'edit', onClick: () => renameProjectInline(p, row) },
      { label: 'Duplicate', icon: 'copy', onClick: () => duplicateProject(p) },
      { label: 'Export project (.json)', icon: 'download', onClick: () => exportProject(p) },
      { label: p.locked ? 'Unlock project' : 'Lock project', icon: p.locked ? 'unlock' : 'lock', onClick: () => commit(() => { p.locked = !p.locked; }, { force: true }) },
      (folders.length || p.folderId) && { header: 'Move to folder' },
      ...folders.map((f) => ({ label: f.name, icon: 'folder', onClick: () => commit(() => { p.folderId = f.id; f.open = true; }, { force: true }) })),
      p.folderId && { label: 'Remove from folder', icon: 'folderOpen', onClick: () => commit(() => { p.folderId = null; }, { force: true }) },
      { sep: true },
      { label: 'Delete project', icon: 'trash', danger: true, onClick: () => deleteProject(p) },
    ], { owner: row });
  }
  function folderMenu(f, anchor, row) {
    openMenu(anchor, [
      { label: 'New project in folder', icon: 'filePlus', onClick: () => createProject(f.id) },
      { label: 'Rename folder', icon: 'edit', onClick: async () => { const v = await promptDialog({ title: 'Rename folder', value: f.name }); if (v) commit(() => { f.name = v; }, { force: true }); } },
      { sep: true },
      { label: 'Delete folder', icon: 'trash', danger: true, onClick: () => deleteFolder(f) },
    ], { owner: row });
  }
  function duplicateProject(p) {
    const c = clone(p);
    c.id = uid(); c.name = p.name + ' (copy)'; c.created = Date.now(); c.locked = false;
    c.citations.forEach((x) => (x.id = uid()));
    commit(() => { state.projects.splice(state.projects.indexOf(p) + 1, 0, c); state.activeId = c.id; }, { force: true });
    toast('Project duplicated');
  }
  async function deleteProject(p) {
    const ok = await confirmDialog({ title: 'Delete project?', message: `“${p.name}” and its ${p.citations.length} reference${p.citations.length === 1 ? '' : 's'} will be deleted. You can undo this straight after.`, ok: 'Delete', danger: true });
    if (!ok) return;
    commit(() => {
      state.projects = state.projects.filter((x) => x.id !== p.id);
      if (!state.projects.length) state.projects.push(newProject('My project'));
      if (state.activeId === p.id) state.activeId = state.projects[0].id;
    }, { force: true });
    toast('Project deleted', { action: { label: 'Undo', fn: undo }, timeout: 6000 });
  }
  async function deleteFolder(f) {
    const kids = state.projects.filter((p) => p.folderId === f.id);
    let r = 'ok';
    if (kids.length) {
      r = await confirmDialog({ title: 'Delete folder?', message: `“${f.name}” contains ${kids.length} project${kids.length === 1 ? '' : 's'}. Keep them (moved out of the folder) or delete them too?`, ok: 'Delete everything', alt: 'Keep projects', danger: true });
      if (!r) return;
    }
    commit(() => {
      state.folders = state.folders.filter((x) => x.id !== f.id);
      if (r === 'ok') state.projects = state.projects.filter((p) => p.folderId !== f.id);
      else kids.forEach((p) => (p.folderId = null));
      if (!state.projects.length) state.projects.push(newProject('My project'));
      if (!project()) state.activeId = state.projects[0].id;
    }, { force: true });
    toast('Folder deleted', { action: { label: 'Undo', fn: undo }, timeout: 6000 });
  }

  /* ======================= citations ======================= */
  function blankCitation(type) {
    const t = TYPES[type];
    const fields = {};
    t.sections.forEach(([, ks]) => ks.forEach((k) => (fields[k] = DATE_FIELDS.includes(k) ? { y: '', m: '', d: '' } : '')));
    if (t.web || fields.accessed) fields.accessed = window.Lookup.today();
    fields.annotation = '';
    return { id: null, type, fields, contributors: t.roles.length ? [{ role: t.roles[0], given: '', family: '' }] : [] };
  }
  function addCitations(list, opts = {}) {
    const p = opts.project || project();
    const ids = [];
    const ok = commit(() => {
      list.forEach((c, k) => {
        const n = clone(c);
        n.id = uid(); n.created = Date.now() + k;
        delete n.thumb; delete n.partial;
        p.citations.push(n);
        ids.push(n.id);
      });
      if (p === project()) ids.forEach((id) => ui.justAdded.add(id));
    });
    return ok ? ids : [];
  }
  function deleteCitations(ids) {
    const p = project();
    const set = new Set(ids);
    $$('.ref').forEach((li) => set.has(li.dataset.id) && li.classList.add('leaving'));
    setTimeout(() => {
      commit(() => { p.citations = p.citations.filter((c) => !set.has(c.id)); ids.forEach((id) => ui.selected.delete(id)); });
      toast(`${ids.length} reference${ids.length === 1 ? '' : 's'} deleted`, { action: { label: 'Undo', fn: undo }, timeout: 6000 });
    }, 180);
  }
  function refMenu(c, anchor, li) {
    const p = project();
    const sw = h(`<div class="swatches"><button class="swatch none" data-c="" title="No colour"></button>${Object.keys(REF_COLORS).map((k) => `<button class="swatch" data-c="${k}" title="${k}" style="--c:${REF_COLORS[k]}"></button>`).join('')}</div>`);
    sw.onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; closeMenu(); commit(() => { c.color = b.dataset.c || undefined; }); };
    openMenu(anchor, [
      !p.locked && { label: 'Edit', icon: 'edit', onClick: () => openEditor(c) },
      !p.locked && { label: c.fields.annotation ? 'Edit annotation' : 'Add annotation', icon: 'note', onClick: () => openEditor(c, { focus: 'annotation' }) },
      { label: 'Copy reference', icon: 'copy', onClick: () => copyRefs([c]) },
      { label: 'In-text citation', icon: 'quote', onClick: () => openInText(c, sorted(p).indexOf(c) + 1) },
      c.type !== 'preformatted' && { label: 'Copy as BibTeX', icon: 'code', onClick: () => copyText(IO.toBibtex([c]), 'BibTeX copied') },
      !p.locked && { label: 'Duplicate', icon: 'copy', onClick: () => addCitations([c]) },
      { label: 'Move / copy to project…', icon: 'move', onClick: () => moveDialog([c.id]) },
      !p.locked && { header: 'Colour label' },
      !p.locked && { el: sw },
      !p.locked && { sep: true },
      !p.locked && { label: 'Delete', icon: 'trash', danger: true, onClick: () => deleteCitations([c.id]) },
    ], { alignRight: true, owner: li });
  }

  async function copyHtml(html, text, msg) {
    try {
      if (window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      } else await navigator.clipboard.writeText(text);
      toast(msg || 'Copied to clipboard');
    } catch (e) {
      // fallback: select a hidden element and use execCommand
      const d = document.createElement('div');
      d.innerHTML = html; d.style.position = 'fixed'; d.style.left = '-9999px';
      document.body.appendChild(d);
      const r = document.createRange(); r.selectNodeContents(d);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      const ok = document.execCommand('copy');
      s.removeAllRanges(); d.remove();
      toast(ok ? msg || 'Copied to clipboard' : 'Could not copy – please select and copy manually', ok ? {} : { type: 'err' });
    }
  }
  const copyText = (t, msg) => copyHtml(esc(t).replace(/\n/g, '<br>'), t, msg);
  function copyRefs(list) {
    const p = project();
    const all = sorted(p);
    const ordered = all.filter((c) => list.includes(c));
    const st = STYLES[p.style];
    const num = (c) => (st.numbered ? (p.style === 'ieee' ? `[${all.indexOf(c) + 1}] ` : `${all.indexOf(c) + 1}. `) : '');
    const font = FONT_STACK[p.font] || p.font;
    const html = ordered.map((c) => `<p style="font-family:${font.replace(/"/g, "'")};font-size:${p.fontSize}pt;line-height:2;margin:0;padding-left:0.5in;text-indent:-0.5in;">${num(c)}${format(c, p.style)}</p>`).join('');
    const text = ordered.map((c) => num(c) + strip(format(c, p.style))).join('\n');
    copyHtml(html, text, ordered.length > 1 ? `${ordered.length} references copied` : 'Reference copied');
  }

  function openInText(c, n) {
    const p = project();
    const body = h(`<div><p>Use these in the body of your paper. Add a page number for direct quotes.</p>
      <div class="f-row" style="grid-template-columns:110px 1fr"><div class="f-label">Page(s)</div><input class="inp" id="itPage" placeholder="e.g. 42 or 42–45"></div><div id="itRows"></div></div>`);
    const rows = body.querySelector('#itRows');
    const draw = () => {
      const r = inText(c, p.style, { number: n, page: body.querySelector('#itPage').value.trim() });
      rows.innerHTML = '';
      [['Parenthetical', r.parenthetical], ['Narrative', r.narrative], r.note && ['Footnote', r.note]].filter(Boolean).forEach(([lbl, val]) => {
        const row = h(`<div class="intext-row"><span class="lbl"></span><span class="val">${val}</span><button class="btn btn-sm btn-outline">${ic('copy')}Copy</button></div>`);
        row.querySelector('.lbl').textContent = lbl;
        row.querySelector('button').onclick = () => copyHtml(val, strip(val), `${lbl} citation copied`);
        rows.appendChild(row);
      });
    };
    body.querySelector('#itPage').oninput = draw;
    draw();
    openModal({ title: `In-text citation · ${STYLES[p.style].short}`, body, size: 'modal-lg' });
  }

  function moveDialog(ids) {
    const p = project();
    const others = state.projects.filter((x) => x.id !== p.id);
    const body = h(`<div><p>Choose a project. <b>Copy</b> keeps the references here too; <b>Move</b> removes them from this project.</p><div class="results" id="mvList"></div></div>`);
    const listEl = body.querySelector('#mvList');
    const m = openModal({ title: `Move or copy ${ids.length} reference${ids.length === 1 ? '' : 's'}`, body, size: 'modal-lg' });
    const act = (target, move) => {
      const items = p.citations.filter((c) => ids.includes(c.id));
      commit(() => {
        items.forEach((c, k) => { const n = clone(c); n.id = uid(); n.created = Date.now() + k; target.citations.push(n); });
        if (move) { p.citations = p.citations.filter((c) => !ids.includes(c.id)); ids.forEach((id) => ui.selected.delete(id)); }
      }, { force: !move });
      m.close();
      toast(`${items.length} reference${items.length === 1 ? '' : 's'} ${move ? 'moved' : 'copied'} to “${target.name}”`, { action: { label: 'Open', fn: () => switchProject(target.id) } });
    };
    const row = (target, isNew) => {
      const r = h(`<div class="result" style="cursor:default"><div class="result-thumb" style="background:${isNew ? 'var(--bg-3)' : target.color + '33'}">${isNew ? '＋' : '📄'}</div><div class="result-main"><div class="result-title"></div><div class="result-meta"></div></div><button class="btn btn-sm btn-outline" data-m="0">Copy</button><button class="btn btn-sm btn-primary" data-m="1">Move</button></div>`);
      r.querySelector('.result-title').textContent = isNew ? 'New project…' : target.name;
      r.querySelector('.result-meta').textContent = isNew ? 'Create a new project for these references' : `${target.citations.length} references · ${STYLES[target.style].short}`;
      r.querySelectorAll('button').forEach((b) => (b.onclick = async () => {
        let t = target;
        if (isNew) {
          const name = await promptDialog({ title: 'New project', placeholder: 'Project name', ok: 'Create' });
          if (!name) return;
          t = newProject(name); t.style = p.style;
          state.projects.unshift(t);
        }
        act(t, b.dataset.m === '1');
      }));
      listEl.appendChild(r);
    };
    others.forEach((o) => row(o));
    row(null, true);
  }

  /* ======================= citation editor ======================= */
  function openEditor(existing, opts = {}) {
    const p = project();
    if (p.locked) return toast('This project is locked. Unlock it to make changes.', { type: 'err' });
    const isNew = !existing.id || opts.isNew;
    const c = clone(existing);
    c.fields = c.fields || {};
    c.contributors = c.contributors || [];
    if (c.type === 'preformatted') return openPreEditor(existing);

    const head = h(`<button class="type-switch">${isNew ? 'New' : 'Edit'} <span class="tl"></span>${ic('chevDown')}</button>`);
    const setHead = () => { head.querySelector('.tl').textContent = TYPES[c.type].label; };
    setHead();
    head.onclick = () => openMenu(head, Object.keys(TYPES).filter((k) => k !== 'preformatted').map((k) => ({
      label: TYPES[k].label, emoji: TYPES[k].emoji, checked: k === c.type,
      onClick: () => { readForm(); c.type = k; ensureRoles(); setHead(); drawForm(); },
    })), { minWidth: 220 });

    const body = h('<div class="cform"></div>');
    const foot = h(`<div style="display:contents"><div class="preview"><span class="preview-tag">PREVIEW</span><div class="pv"></div></div>
      ${isNew ? '' : `<button class="icon-btn" data-a="del" data-tip="Delete reference" style="color:var(--danger)">${icon('trash')}</button>`}
      <button class="btn btn-ghost" data-a="cancel">Cancel</button><button class="btn btn-primary" data-a="save">${isNew ? 'Add' : 'Save'}</button></div>`);
    const m = openModal({ head, body, foot, size: 'modal-xl', footCls: 'with-preview' });

    function ensureRoles() {
      const roles = TYPES[c.type].roles;
      c.contributors.forEach((x) => { if (!roles.includes(x.role)) x.role = roles[0] || 'author'; });
      if (!c.contributors.length && roles.length) c.contributors.push({ role: roles[0], given: '', family: '' });
      DATE_FIELDS.forEach((k) => { if (!c.fields[k]) c.fields[k] = { y: '', m: '', d: '' }; });
      if (TYPES[c.type].web && !(c.fields.accessed && c.fields.accessed.y)) c.fields.accessed = window.Lookup.today();
    }
    function readForm() {
      $$('[data-k]', body).forEach((el) => {
        const k = el.dataset.k;
        if (el.dataset.part) { c.fields[k] = c.fields[k] || {}; c.fields[k][el.dataset.part] = el.value.trim(); }
        else c.fields[k] = el.value;
      });
      c.contributors = $$('.person', body).map((row) => {
        const role = row.dataset.role;
        if (row.classList.contains('org')) return { role, literal: row.querySelector('[data-n=literal]').value.trim() };
        return { role, given: row.querySelector('[data-n=given]').value.trim(), family: row.querySelector('[data-n=family]').value.trim() };
      });
    }
    function preview() {
      readForm();
      const html = format(c, p.style);
      foot.querySelector('.pv').innerHTML = html || '<span style="color:var(--text-3)">Start typing to see your reference…</span>';
    }
    function personRow(x, idx) {
      const t = TYPES[c.type];
      const org = !!x.literal || x.org;
      const row = h(`<div class="person${org ? ' org' : ''}" data-role="${x.role}" data-idx="${idx}">
        ${org ? '<input class="inp" data-n="literal" placeholder="Organisation / group name">' : '<input class="inp important" data-n="given" placeholder="First name"><input class="inp important" data-n="family" placeholder="Last name">'}
        <button class="icon-btn" data-a="org" data-tip="${org ? 'Switch to a person' : 'Switch to an organisation'}">${icon(org ? 'person' : 'building')}</button>
        <button class="icon-btn del" data-a="del" data-tip="Remove">${icon('trash')}</button>
        <span class="handle ic" draggable="true" data-tip="Drag to reorder">${icon('grip')}</span></div>`);
      if (org) row.querySelector('[data-n=literal]').value = x.literal || '';
      else { row.querySelector('[data-n=given]').value = x.given || ''; row.querySelector('[data-n=family]').value = x.family || ''; }
      row.querySelector('[data-a=org]').onclick = () => {
        readForm();
        const cur = c.contributors[idx];
        if (cur.literal != null) c.contributors[idx] = { role: cur.role, given: '', family: cur.literal || '' };
        else c.contributors[idx] = { role: cur.role, literal: [cur.given, cur.family].filter(Boolean).join(' '), org: true };
        drawForm();
      };
      row.querySelector('[data-a=del]').onclick = () => { readForm(); c.contributors.splice(idx, 1); drawForm(); };
      // drag to reorder
      const handle = row.querySelector('.handle');
      handle.ondragstart = (e) => { e.dataTransfer.setData('text/x-person', String(idx)); row.classList.add('dragging'); };
      handle.ondragend = () => row.classList.remove('dragging');
      row.ondragover = (e) => { if (e.dataTransfer.types.includes('text/x-person')) e.preventDefault(); };
      row.ondrop = (e) => {
        const from = parseInt(e.dataTransfer.getData('text/x-person'), 10);
        if (isNaN(from) || from === idx) return;
        e.preventDefault();
        readForm();
        const [moved] = c.contributors.splice(from, 1);
        c.contributors.splice(idx, 0, moved);
        drawForm();
      };
      if (!t.roles.includes(x.role)) row.dataset.role = t.roles[0];
      return row;
    }
    function drawForm() {
      const t = TYPES[c.type];
      body.innerHTML = '';
      if (t.roles.length) {
        body.appendChild(h('<div class="f-section">Contributors</div>'));
        const byRole = {};
        c.contributors.forEach((x, idx) => (byRole[x.role] = byRole[x.role] || []).push([x, idx]));
        Object.keys(byRole).sort((a, b) => t.roles.indexOf(a) - t.roles.indexOf(b)).forEach((role) => {
          byRole[role].forEach(([x, idx], k) => {
            const label = role === t.roles[0] && t.labels.author ? t.labels.author : ROLE_LABELS[role];
            const r = h(`<div class="f-row"><div class="f-label">${k === 0 ? `<span></span>` : ''}</div><div class="f-ctl"></div></div>`);
            if (k === 0) r.querySelector('.f-label span').textContent = label;
            r.querySelector('.f-ctl').appendChild(personRow(x, idx));
            body.appendChild(r);
          });
        });
        const add = h('<div class="f-row"><div></div><div class="add-row"></div></div>');
        t.roles.forEach((role, k) => {
          const has = c.contributors.some((x) => x.role === role);
          const lbl = (k === 0 && t.labels.author ? t.labels.author : ROLE_LABELS[role]).toLowerCase();
          const b = h(`<button class="btn btn-sm">${ic('plus')}<span class="txt"></span></button>`);
          b.querySelector('.txt').textContent = has ? `Add another ${lbl}` : `Add ${lbl}`;
          b.onclick = () => { readForm(); c.contributors.push({ role, given: '', family: '' }); drawForm(); const rows = $$('.person', body); const last = rows.filter((r) => r.dataset.role === role).pop(); last && last.querySelector('input').focus(); };
          add.querySelector('.add-row').appendChild(b);
        });
        body.appendChild(add);
      }
      t.sections.forEach(([sec, keys]) => {
        body.appendChild(h(`<div class="f-section">${esc(sec)}</div>`));
        keys.forEach((k) => {
          const label = t.labels[k] || FIELDS[k];
          const important = t.important.includes(k);
          const r = h(`<div class="f-row"><label class="f-label"><span></span></label><div class="f-ctl"></div></div>`);
          r.querySelector('.f-label span').textContent = label;
          const ctl = r.querySelector('.f-ctl');
          if (DATE_FIELDS.includes(k)) {
            const v = c.fields[k] || {};
            const d = h(`<div class="date-row"><input class="inp${important ? ' important' : ''}" data-k="${k}" data-part="y" placeholder="YYYY" inputmode="numeric" maxlength="4"><input class="inp" data-k="${k}" data-part="m" placeholder="MM" inputmode="numeric" maxlength="2"><input class="inp" data-k="${k}" data-part="d" placeholder="DD" inputmode="numeric" maxlength="2"><button class="btn">Today</button></div>`);
            d.children[0].value = v.y || ''; d.children[1].value = v.m || ''; d.children[2].value = v.d || '';
            d.querySelector('button').onclick = () => { const t2 = window.Lookup.today(); d.children[0].value = t2.y; d.children[1].value = t2.m; d.children[2].value = t2.d; preview(); };
            ctl.appendChild(d);
          } else {
            const inp = h(`<input class="inp${important ? ' important' : ''}" data-k="${k}" placeholder=" ">`);
            inp.value = c.fields[k] || '';
            if (k === 'url') inp.type = 'url';
            if (k === 'doi') inp.placeholder = '10.xxxx/xxxxx';
            if (k === 'pages') inp.placeholder = 'e.g. 77–101';
            if (k === 'edition') inp.placeholder = c.type === 'software' || c.type === 'dataset' ? 'e.g. 2.1' : 'e.g. 2';
            ctl.appendChild(inp);
          }
          body.appendChild(r);
        });
      });
      body.appendChild(h('<div class="f-section">Annotation</div>'));
      const ar = h('<div class="f-row"><label class="f-label"><span>Annotation</span></label><div class="f-ctl"><textarea class="inp" data-k="annotation" placeholder="Optional notes that appear under this reference (for annotated bibliographies)"></textarea></div></div>');
      ar.querySelector('textarea').value = c.fields.annotation || '';
      body.appendChild(ar);
      hydrate(body);
      preview();
    }
    body.addEventListener('input', preview);
    ensureRoles();
    drawForm();
    if (opts.focus) setTimeout(() => { const el = body.querySelector(`[data-k="${opts.focus}"]`); el && (el.scrollIntoView({ block: 'center' }), el.focus()); }, 80);
    else setTimeout(() => { const el = body.querySelector('input'); el && el.focus(); }, 60);

    foot.querySelector('[data-a=cancel]').onclick = () => m.close();
    const del = foot.querySelector('[data-a=del]');
    if (del) del.onclick = () => { m.close(); deleteCitations([existing.id]); };
    const save = () => {
      readForm();
      c.contributors = c.contributors.filter((x) => x.literal || x.given || x.family).map((x) => { delete x.org; return x; });
      if (isNew) {
        addCitations([c]);
        toast('Reference added');
      } else {
        commit(() => {
          const target = p.citations.find((x) => x.id === existing.id);
          Object.assign(target, { type: c.type, fields: c.fields, contributors: c.contributors });
          ui.justAdded.add(target.id);
        });
      }
      m.close();
    };
    foot.querySelector('[data-a=save]').onclick = save;
    body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); } });
    if (opts.partial) toast('Some details could not be found automatically – please check the highlighted fields.', { timeout: 5000 });
  }

  function openPreEditor(existing) {
    const body = h(`<div><p>Edit the reference exactly as you want it to appear. Select text and press ${MOD}+I for italics.</p>
      <div class="inp pre-edit" contenteditable="true" style="height:auto;min-height:90px;padding:10px;font:15px/1.6 var(--serif)"></div>
      <div class="f-section">Annotation</div><textarea class="inp" placeholder="Optional notes"></textarea></div>`);
    const ed = body.querySelector('.pre-edit');
    ed.innerHTML = window.Cite.sanitizeRich(existing.fields.html);
    body.querySelector('textarea').value = existing.fields.annotation || '';
    const foot = h(`<div style="display:flex;gap:8px;width:100%;justify-content:flex-end"><button class="btn btn-ghost">Cancel</button><button class="btn btn-primary">Save</button></div>`);
    const m = openModal({ title: 'Edit pre-formatted reference', body, foot, size: 'modal-lg' });
    foot.firstChild.onclick = () => m.close();
    foot.lastChild.onclick = () => {
      const html = window.Cite.sanitizeRich(ed.innerHTML);
      if (!strip(html).trim()) return toast('The reference is empty', { type: 'err' });
      commit(() => { const t = project().citations.find((x) => x.id === existing.id); t.fields.html = html; t.fields.annotation = body.querySelector('textarea').value; ui.justAdded.add(t.id); });
      m.close();
    };
    setTimeout(() => ed.focus(), 60);
  }

  /* ======================= search ======================= */
  async function doSearch(qOverride) {
    const p = project();
    if (p.locked) return toast('This project is locked. Unlock it to add references.', { type: 'err' });
    if (ui.tab === 'preformatted') {
      const ed = $('#preEditor');
      const html = window.Cite.sanitizeRich(ed.innerHTML);
      if (!strip(html).trim()) { ed.focus(); return toast('Type or paste a formatted reference first', { type: 'err' }); }
      // allow several references at once, one per line
      const parts = ed.innerText.includes('\n') ? splitLines(ed) : [html];
      addCitations(parts.map((x) => ({ type: 'preformatted', fields: { html: x, annotation: '' }, contributors: [] })));
      ed.innerHTML = '';
      toast(parts.length > 1 ? `${parts.length} references added` : 'Reference added');
      return;
    }
    const q = (qOverride != null ? qOverride : $('#searchInput').value).trim();
    if (!q) { openEditor(blankCitation(ui.tab), { isNew: true }); return; }
    const kind = window.Lookup.detect(q).kind;
    const row = $('#searchRow');
    if (kind === 'text') return openResults(q);
    row.classList.add('searching');
    $('#searchBtn').disabled = true;
    try {
      const r = await window.Lookup.lookup(q, ui.tab);
      if (r.direct) {
        const d = r.direct;
        if (TYPES[ui.tab] && ui.tab !== 'website' && d.type === 'website') d.type = ui.tab;
        if (TYPES[d.type].web && !(d.fields.accessed && d.fields.accessed.y)) d.fields.accessed = window.Lookup.today();
        openEditor(d, { isNew: true, partial: d.partial });
        $('#searchInput').value = '';
      }
    } catch (e) {
      console.warn(e);
      toast(kind === 'doi' ? 'That DOI could not be found. You can enter the details manually.' : 'Could not fetch details. You can enter them manually.', { type: 'err', action: { label: 'Cite manually', fn: () => manualFrom(q, kind) }, timeout: 7000 });
    } finally {
      row.classList.remove('searching');
      $('#searchBtn').disabled = false;
    }
  }
  function splitLines(ed) {
    // split contenteditable content into separate references per line, keeping italics
    const html = ed.innerHTML.replace(/<div>/gi, '<br>').replace(/<\/div>/gi, '').replace(/<p>/gi, '<br>').replace(/<\/p>/gi, '');
    return html.split(/<br\s*\/?>/i).map((x) => window.Cite.sanitizeRich(x)).filter((x) => strip(x).trim());
  }
  function manualFrom(q, kind) {
    const c = blankCitation(ui.tab === 'preformatted' ? 'website' : ui.tab);
    if (kind === 'url') c.fields.url = q;
    else if (kind === 'doi') c.fields.doi = q;
    else if (kind === 'isbn') c.fields.isbn = q;
    else c.fields.title = q;
    openEditor(c, { isNew: true });
  }

  function openResults(q) {
    const body = h(`<div><div class="results" id="resList">${'<div class="skeleton"></div>'.repeat(4)}</div></div>`);
    const foot = h(`<div style="display:flex;gap:8px;width:100%;align-items:center"><span style="font-size:13px;color:var(--text-3)">Can’t find it?</span><button class="btn btn-outline btn-sm">${ic('keyboard')}Cite manually</button><div class="grow"></div><span style="font-size:12px;color:var(--text-3)">Results from Crossref, Google Books &amp; Open Library</span></div>`);
    const m = openModal({ title: `Search results for “${q.length > 40 ? q.slice(0, 40) + '…' : q}”`, body, foot, size: 'modal-xl' });
    foot.querySelector('button').onclick = () => { m.close(); manualFrom(q, 'text'); };
    const listEl = body.querySelector('#resList');
    window.Lookup.lookup(q, ui.tab).then((r) => {
      const res = (r.results || (r.direct ? [r.direct] : [])).filter((x) => x.fields && x.fields.title);
      listEl.innerHTML = '';
      if (!res.length) {
        listEl.innerHTML = `<div class="empty" style="padding:30px 0"><h3>No results found</h3><p>Try different keywords, a DOI or ISBN – or cite it manually.</p></div>`;
        return;
      }
      res.forEach((d, k) => {
        const authors = (d.contributors || []).filter((x) => x.role === 'author').map((x) => x.literal || [x.given, x.family].filter(Boolean).join(' '));
        const meta = [authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' et al.' : ''), d.fields.containerTitle, d.fields.publisher, d.fields.issued && d.fields.issued.y].filter(Boolean).join(' · ');
        const el = h(`<div class="result" style="animation-delay:${k * 35}ms"><div class="result-thumb">${TYPES[d.type].emoji}</div><div class="result-main"><div class="result-kind"></div><div class="result-title"></div><div class="result-meta"></div></div><button class="btn btn-green btn-sm">Cite</button></div>`);
        if (d.thumb) { const th = el.querySelector('.result-thumb'); th.textContent = ''; th.style.backgroundImage = `url("${d.thumb.replace(/^http:/, 'https:').replace(/"/g, '')}")`; }
        el.querySelector('.result-kind').textContent = TYPES[d.type].label;
        el.querySelector('.result-title').textContent = d.fields.title;
        el.querySelector('.result-meta').textContent = meta;
        el.onclick = () => { m.close(); $('#searchInput').value = ''; openEditor(d, { isNew: true }); };
        listEl.appendChild(el);
      });
    }).catch((e) => {
      console.warn(e);
      listEl.innerHTML = `<div class="empty" style="padding:30px 0"><h3>Search is unavailable</h3><p>Check your internet connection, or cite the source manually.</p></div>`;
    });
  }

  /* ======================= style & sort pickers ======================= */
  const SAMPLE = { type: 'journal', contributors: [{ role: 'author', given: 'Virginia', family: 'Braun' }, { role: 'author', given: 'Victoria', family: 'Clarke' }], fields: { title: 'Using thematic analysis in psychology', containerTitle: 'Qualitative Research in Psychology', volume: '3', issue: '2', pages: '77–101', issued: { y: '2006' }, doi: '10.1191/1478088706qp063oa' } };
  function openStylePicker() {
    const p = project();
    const body = h(`<div><input class="menu-search" placeholder="Search citation styles…" autofocus><div class="style-list"></div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:13px;color:var(--text-2)"><input type="checkbox" id="defStyle"> Use as the default for new projects</label></div>`);
    const list = body.querySelector('.style-list');
    const m = openModal({ title: 'Citation style', body, size: 'modal-xl' });
    const draw = (q = '') => {
      list.innerHTML = '';
      Object.keys(STYLES).filter((k) => STYLES[k].name.toLowerCase().includes(q.toLowerCase())).forEach((k) => {
        const b = h(`<button class="style-opt${k === p.style ? ' checked' : ''}"><div style="flex:1"><div class="so-name"></div><div class="so-ex">${format(SAMPLE, k)}</div></div>${k === p.style ? ic('check') : ''}</button>`);
        b.querySelector('.so-name').textContent = STYLES[k].name;
        b.onclick = () => {
          if (body.querySelector('#defStyle').checked) state.defaultStyle = k;
          commit(() => { p.style = k; }, { force: true });
          m.close();
          toast(`Style changed to ${STYLES[k].short}`);
        };
        list.appendChild(b);
      });
    };
    body.querySelector('input').oninput = (e) => draw(e.target.value);
    draw();
  }
  function openSortMenu() {
    const p = project();
    openMenu($('#sortBtn'), Object.keys(SORTS).map((k) => ({ label: SORTS[k], sub: k === 'auto' ? (STYLES[p.style].numbered ? 'Order added (numbered style)' : 'Alphabetical (author–date style)') : '', checked: p.sort === k, onClick: () => commit(() => { p.sort = k; }, { force: true }) })), { alignRight: true });
  }

  /* ======================= downloads & sharing ======================= */
  function exportList(kind, onlySelected) {
    const p = project();
    let cites = sorted(p);
    if (onlySelected) cites = cites.filter((c) => ui.selected.has(c.id));
    if (!cites.length) return toast('There are no references to export yet', { type: 'err' });
    const name = IO.safeName(p.name);
    switch (kind) {
      case 'word': IO.download(name + '.doc', '﻿' + IO.toWord(p, cites), 'application/msword'); break;
      case 'txt': IO.download(name + '.txt', IO.toText(p, cites)); break;
      case 'html': IO.download(name + '.html', IO.toHtml(p, cites), 'text/html;charset=utf-8'); break;
      case 'bib': IO.download(name + '.bib', IO.toBibtex(cites)); break;
      case 'ris': IO.download(name + '.ris', IO.toRis(cites), 'application/x-research-info-systems'); break;
      case 'copy': return copyRefs(cites);
      case 'print': return window.print();
      default:
    }
    toast('Download started');
  }
  function downloadMenu(anchor, onlySelected) {
    openMenu(anchor, [
      { header: onlySelected ? `Export ${ui.selected.size} selected` : 'Download reference list' },
      { label: 'Word document', sub: '.doc – opens in Word, Pages & Google Docs', icon: 'word', onClick: () => exportList('word', onlySelected) },
      { label: 'Copy to clipboard', sub: 'Paste straight into your document', icon: 'copy', onClick: () => exportList('copy', onlySelected) },
      { label: 'Print or save as PDF', icon: 'print', onClick: () => exportList('print', onlySelected) },
      { label: 'Plain text', sub: '.txt', icon: 'doc', onClick: () => exportList('txt', onlySelected) },
      { label: 'Web page', sub: '.html', icon: 'code', onClick: () => exportList('html', onlySelected) },
      { sep: true },
      { header: 'For reference managers' },
      { label: 'BibTeX', sub: '.bib – LaTeX, Overleaf, Zotero', icon: 'code', onClick: () => exportList('bib', onlySelected) },
      { label: 'RIS', sub: '.ris – EndNote, Mendeley, Zotero', icon: 'code', onClick: () => exportList('ris', onlySelected) },
    ], { alignRight: true, minWidth: 280 });
  }
  function exportProject(p) {
    const data = { app: 'citebox', kind: 'project', version: 1, exported: new Date().toISOString(), project: p };
    IO.download(IO.safeName(p.name) + '.citebox.json', JSON.stringify(data, null, 2), 'application/json');
    toast('Project exported');
  }
  async function shareLink() {
    const p = project();
    const data = { name: p.name, style: p.style, font: p.font, fontSize: p.fontSize, sort: p.sort, citations: p.citations.map(({ id, created, ...rest }) => rest) };
    const packed = await IO.pack(data);
    const url = `${location.origin}${location.pathname}#import=${packed}`;
    const body = h(`<div><p>Anyone who opens this link gets their own copy of “<b></b>” in their browser. Nothing is uploaded – the references are stored inside the link itself.</p>
      <div style="display:flex;gap:8px"><input class="inp" readonly><button class="btn btn-primary">${ic('copy')}Copy</button></div>
      <p style="margin-top:12px;font-size:12.5px">${url.length > 8000 ? '⚠️ This project is large, so the link is very long. Some apps may cut it off – exporting a project file is more reliable.' : 'Tip: links stay valid forever, but later edits are not included – share again after making changes.'}</p></div>`);
    body.querySelector('b').textContent = p.name;
    const inp = body.querySelector('input');
    inp.value = url;
    const foot = h(`<div style="display:flex;gap:8px;width:100%"><button class="btn btn-outline">${ic('download')}Export project file instead</button></div>`);
    const m = openModal({ title: 'Share project', body, foot, size: 'modal-lg' });
    body.querySelector('button').onclick = () => copyText(url, 'Share link copied');
    foot.querySelector('button').onclick = () => { m.close(); exportProject(p); };
    setTimeout(() => inp.select(), 80);
  }
  async function checkShareHash() {
    const m = location.hash.match(/^#import=(.+)$/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    try {
      const data = await IO.unpack(m[1]);
      const ok = await confirmDialog({ title: 'Import shared project?', message: `“${data.name}” with ${data.citations.length} reference${data.citations.length === 1 ? '' : 's'} was shared with you. Add it to your projects?`, ok: 'Add project' });
      if (!ok) return;
      const p = newProject(data.name);
      Object.assign(p, { style: data.style || 'apa7', font: data.font || p.font, fontSize: data.fontSize || 12, sort: data.sort || 'auto' });
      p.citations = (data.citations || []).map((c, k) => ({ ...c, id: uid(), created: Date.now() + k }));
      commit(() => { state.projects.unshift(p); state.activeId = p.id; }, { force: true });
      toast('Shared project added');
    } catch (e) {
      toast('That share link is damaged or incomplete', { type: 'err' });
    }
  }

  /* ======================= device save / open ======================= */
  function backupData() {
    const { projects, folders, defaultStyle } = state;
    return JSON.stringify({ app: 'citebox', kind: 'library', version: 1, exported: new Date().toISOString(), folders, projects, defaultStyle }, null, 2);
  }
  function markSaved() {
    ui.dirty = false;
    state.dirtySinceFile = false;
    savePrefs();
    renderStatus(); renderTop();
  }
  async function writeLinkedFile(silent) {
    if (!ui.fileHandle) return false;
    try {
      if (silent && ui.fileHandle.queryPermission && (await ui.fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') return false;
      await IO.saveWithPicker(null, backupData(), ui.fileHandle);
      markSaved();
      return true;
    } catch (e) {
      if (!silent) toast('Could not write to ' + ui.fileHandle.name + ': ' + e.message, { type: 'err' });
      return false;
    }
  }
  async function saveToDevice(forceNew) {
    const name = `citebox-library-${new Date().toISOString().slice(0, 10)}.json`;
    if (IO.fsSupported) {
      try {
        if (ui.fileHandle && !forceNew) {
          if (await writeLinkedFile(false)) toast(`Saved to ${ui.fileHandle.name}`);
          return;
        }
        const handle = await IO.saveWithPicker('citebox-library.json', backupData());
        ui.fileHandle = handle;
        await IO.kv.set('fileHandle', handle);
        markSaved();
        toast(`Saved to ${handle.name}. Future changes will save there automatically.`, { timeout: 5000 });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.warn(e);
      }
    }
    IO.download(name, backupData(), 'application/json');
    markSaved();
    toast('Backup downloaded. Open it later with “Open from device”.', { timeout: 5000 });
  }
  async function unlinkFile() {
    ui.fileHandle = null;
    await IO.kv.del('fileHandle');
    renderStatus();
    toast('File unlinked. Your data is still stored in this browser.');
  }
  async function openFromDevice() {
    let file = null;
    if (IO.fsSupported && window.showOpenFilePicker) {
      try { file = await IO.openWithPicker(); } catch (e) { if (e.name === 'AbortError') return; }
    }
    if (!file) file = await IO.pickFile('.json,.bib,.ris,.txt');
    if (file) importText(file.name, file.text, file.handle);
  }
  async function importText(name, text, handle) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      let data;
      try { data = JSON.parse(trimmed); } catch (e) { return toast('That file is not valid JSON', { type: 'err' }); }
      if (data.app === 'citebox' && data.kind === 'library') {
        const n = data.projects.reduce((a, p) => a + p.citations.length, 0);
        const r = await confirmDialog({ title: 'Open library', message: `“${name}” has ${data.projects.length} project${data.projects.length === 1 ? '' : 's'} and ${n} reference${n === 1 ? '' : 's'}. Replace what is in this browser, or add the projects alongside your current ones?`, ok: 'Replace current', alt: 'Add alongside', danger: false });
        if (!r) return;
        commit(() => {
          if (r === 'ok') {
            state.projects = data.projects; state.folders = data.folders || [];
            if (data.defaultStyle) state.defaultStyle = data.defaultStyle;
            state.activeId = state.projects[0] && state.projects[0].id;
            if (!state.projects.length) { state.projects.push(newProject('My project')); state.activeId = state.projects[0].id; }
          } else {
            const fmap = {};
            (data.folders || []).forEach((f) => { const nf = { ...f, id: uid() }; fmap[f.id] = nf.id; state.folders.push(nf); });
            data.projects.forEach((p) => state.projects.push({ ...p, id: uid(), folderId: p.folderId ? fmap[p.folderId] || null : null }));
          }
        }, { force: true });
        if (r === 'ok' && handle) { ui.fileHandle = handle; await IO.kv.set('fileHandle', handle); markSaved(); }
        toast(r === 'ok' ? 'Library opened' : 'Projects added');
        return;
      }
      if (data.app === 'citebox' && data.kind === 'project') {
        const p = { ...newProject(), ...data.project, id: uid(), folderId: null };
        commit(() => { state.projects.unshift(p); state.activeId = p.id; }, { force: true });
        return toast(`Project “${p.name}” imported`);
      }
      return toast('This JSON file is not a Citebox backup', { type: 'err' });
    }
    let list = [];
    if (/^\s*@\w+\s*\{/m.test(trimmed)) list = IO.parseBibtex(trimmed);
    else if (/^TY\s{2}-/m.test(trimmed)) list = IO.parseRis(trimmed);
    if (!list.length) {
      // plain text: one pre-formatted reference per non-empty line
      const lines = trimmed.split(/\r?\n\s*\r?\n|\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return toast('Nothing to import in that file', { type: 'err' });
      list = lines.map((l) => ({ type: 'preformatted', contributors: [], fields: { html: esc(l), annotation: '' } }));
    }
    const ids = addCitations(list);
    if (ids.length) toast(`${ids.length} reference${ids.length === 1 ? '' : 's'} imported from ${name}`);
  }
  function dataMenu(anchor) {
    openMenu(anchor, [
      { header: 'Your data stays on this device' },
      { label: ui.fileHandle ? `Save to ${ui.fileHandle.name}` : 'Save to device…', sub: IO.fsSupported ? 'Saves everything to a file you choose' : 'Downloads a backup file', icon: 'save', kbd: `${MOD}+S`, onClick: () => saveToDevice() },
      ui.fileHandle && { label: 'Save as a new file…', icon: 'save', onClick: () => saveToDevice(true) },
      { label: 'Open from device…', sub: 'Citebox backup, BibTeX, RIS or text', icon: 'folderOpen', kbd: `${MOD}+O`, onClick: openFromDevice },
      IO.fsSupported && ui.fileHandle && { label: 'Auto-save to linked file', icon: 'refresh', checked: state.autoFile, onClick: () => { state.autoFile = !state.autoFile; savePrefs(); renderStatus(); if (state.autoFile) writeLinkedFile(false); } },
      { label: 'Download backup copy (.json)', icon: 'download', onClick: () => { IO.download(`citebox-library-${new Date().toISOString().slice(0, 10)}.json`, backupData(), 'application/json'); markSaved(); } },
      { sep: true },
      { label: 'Keyboard shortcuts & help', icon: 'help', onClick: openHelp },
      { label: 'Show welcome screen', icon: 'note', onClick: openWelcome },
      { sep: true },
      { label: 'Delete all data in this browser', icon: 'trash', danger: true, onClick: clearAll },
    ], { alignRight: true, minWidth: 290 });
  }
  async function clearAll() {
    const ok = await confirmDialog({ title: 'Delete all data?', message: 'Every project and reference stored in this browser will be removed. Save a copy to your device first if you might need it. This cannot be undone after you reload the page.', ok: 'Delete everything', danger: true });
    if (!ok) return;
    commit(() => { state.projects = [newProject('My project')]; state.folders = []; state.activeId = state.projects[0].id; }, { force: true });
    toast('All data deleted', { action: { label: 'Undo', fn: undo }, timeout: 8000 });
  }

  /* ======================= welcome & help ======================= */
  const ART = `<svg class="welcome-art" viewBox="0 0 240 130" fill="none" aria-hidden="true">
    <ellipse cx="120" cy="124" rx="96" ry="6" fill="currentColor" opacity=".08"/>
    <rect x="58" y="96" width="124" height="22" rx="3" fill="#4a84e4"/><rect x="58" y="96" width="124" height="5" fill="#fff" opacity=".25"/>
    <rect x="66" y="74" width="110" height="22" rx="3" fill="#e0675f"/><rect x="160" y="74" width="5" height="22" fill="#fff" opacity=".35"/>
    <rect x="54" y="52" width="118" height="22" rx="3" fill="#3fae6a"/><rect x="62" y="60" width="60" height="5" rx="2" fill="#fff" opacity=".45"/>
    <rect x="72" y="30" width="96" height="22" rx="3" fill="#f0a04b"/><rect x="150" y="30" width="6" height="22" fill="#fff" opacity=".35"/>
    <circle cx="200" cy="78" r="22" fill="#26a69a"/><path d="M186 70c6 2 8 8 14 6s6-10 12-8M184 86c8-3 12 4 20 0" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/><rect x="196" y="100" width="8" height="18" fill="#8d8f9a"/>
    <path d="M30 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#e3b341"/><path d="M214 18l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#a371f7"/>
    <circle cx="40" cy="96" r="5" fill="#4a84e4" opacity=".5"/></svg>`;
  function openWelcome() {
    const p = project();
    const body = h(`<div>${ART}
      <h1>Build your reference list and bibliography <mark>in seconds</mark></h1>
      <div class="dots"><span></span><span></span><span></span></div>
      <div class="style-pills"><span class="lbl">STYLES:</span></div>
      <div class="mini-cite"><div class="tabs-row"><span class="cite-a">Cite a:</span><div class="tabs"></div></div>
        <div class="search-row"><div class="search-field"><input type="text" placeholder="Paste a URL, DOI or ISBN, or search by title"></div><button class="btn btn-green">${ic('search')}Cite</button></div></div>
      <p class="welcome-note">Free and private: everything is saved in your browser, and the <b>Save</b> button keeps a copy on your device.</p></div>`);
    const pills = body.querySelector('.style-pills');
    ['ama', 'apa7', 'chicago', 'harvard', 'ieee', 'mla9', 'vancouver'].forEach((k) => {
      const b = h(`<button class="pill${p.style === k ? ' on' : ''}"></button>`);
      b.textContent = STYLES[k].short;
      b.onclick = () => { p.style = k; state.defaultStyle = k; persist(); render(); $$('.pill', pills).forEach((x) => x.classList.toggle('on', x === b)); };
      pills.appendChild(b);
    });
    let wtab = 'website';
    const tabs = body.querySelector('.tabs');
    const drawTabs = () => {
      tabs.innerHTML = '';
      MAIN_TABS.forEach((t) => { const b = h(`<button class="tab${wtab === t ? ' active' : ''}">${TYPES[t].emoji} ${TYPES[t].label}</button>`); b.onclick = () => { wtab = t; drawTabs(); inp.focus(); }; tabs.appendChild(b); });
    };
    const inp = body.querySelector('input');
    drawTabs();
    const m = openModal({ head: false, body, cls: 'welcome', onClose: () => { state.welcomed = true; savePrefs(); } });
    const go = () => { const q = inp.value.trim(); m.close(); setTab(wtab); if (q) { $('#searchInput').value = q; doSearch(q); } };
    body.querySelector('.btn-green').onclick = go;
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }
  function openHelp() {
    const body = h(`<div><div class="kbd-list">
      <span><kbd>${MOD}</kbd> <kbd>S</kbd></span><span>Save everything to a file on your device</span>
      <span><kbd>${MOD}</kbd> <kbd>O</kbd></span><span>Open a backup, BibTeX or RIS file</span>
      <span><kbd>${MOD}</kbd> <kbd>Z</kbd></span><span>Undo</span>
      <span><kbd>${MOD}</kbd> <kbd>Shift</kbd> <kbd>Z</kbd></span><span>Redo</span>
      <span><kbd>/</kbd></span><span>Jump to the search bar</span>
      <span><kbd>${MOD}</kbd> <kbd>A</kbd></span><span>Select all references (when not typing)</span>
      <span><kbd>Delete</kbd></span><span>Delete selected references</span>
      <span><kbd>Esc</kbd></span><span>Close dialogs / clear selection</span>
      <span><kbd>${MOD}</kbd> <kbd>Enter</kbd></span><span>Save the reference you are editing</span></div>
      <div class="f-section" style="margin-top:18px">Where is my data?</div>
      <p>Citebox has no server or account. Your projects are saved automatically in this browser’s storage on this device. Browser storage can be wiped if you clear site data, so use <b>Save</b> to keep a copy as a file. ${IO.fsSupported ? 'In this browser, Save links to the file and keeps it updated as you work.' : 'In this browser, Save downloads a backup file – open it again with “Open from device”.'}</p>
      <p>To move your references to another computer, save to a file and open it there, or use <b>Share</b> to create a link.</p>
      <div class="f-section">Automatic lookup</div>
      <p>Searches use free public services: Crossref (articles and DOIs), Google Books and Open Library (books and ISBNs), and Microlink (web pages). Only what you type in the search box is sent to them.</p></div>`);
    openModal({ title: 'Help & keyboard shortcuts', body, size: 'modal-lg' });
  }

  /* ======================= wiring ======================= */
  function bind() {
    $('#sidebarBtn').onclick = () => { state.sidebarOpen = !state.sidebarOpen; savePrefs(); renderSidebar(); };
    $('#scrim').onclick = () => { state.sidebarOpen = false; savePrefs(); renderSidebar(); };
    $('#themeBtn').onclick = () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = state.theme;
      savePrefs(); renderSidebar();
    };
    $('#newProjectBtn').onclick = () => createProject();
    $('#newMenuBtn').onclick = (e) => openMenu(e.currentTarget, [
      { label: 'New project', icon: 'filePlus', onClick: () => createProject() },
      { label: 'New folder', icon: 'folderPlus', onClick: createFolder },
      { sep: true },
      { label: 'Import file as new project…', icon: 'fileImport', onClick: async () => { const f = await IO.pickFile(); if (!f) return; if (!f.text.trim().startsWith('{')) { createProject(); } importText(f.name, f.text); } },
    ]);
    $('#projSearchBtn').onclick = () => { const w = $('#projSearchWrap'); w.hidden = !w.hidden; if (!w.hidden) $('#projSearch').focus(); else { ui.search = ''; $('#projSearch').value = ''; renderSidebar(); } };
    $('#projSearch').oninput = (e) => { ui.search = e.target.value; renderSidebar(); };
    $('#sbSaveBtn').onclick = () => saveToDevice();
    $('#sbOpenBtn').onclick = openFromDevice;
    $('#undoBtn').onclick = undo;
    $('#redoBtn').onclick = redo;
    $('#saveBtn').onclick = () => saveToDevice();
    $('#shareBtn').onclick = (e) => openMenu(e.currentTarget, [
      { label: 'Copy share link', sub: 'Anyone with the link gets a copy', icon: 'link', onClick: shareLink },
      { label: 'Export project file', sub: '.json – open it with “Open from device”', icon: 'download', onClick: () => exportProject(project()) },
      { label: 'Copy whole reference list', icon: 'copy', onClick: () => exportList('copy') },
    ], { alignRight: true, minWidth: 260 });
    $('#downloadBtn').onclick = (e) => downloadMenu(e.currentTarget);
    $('#dataBtn').onclick = (e) => dataMenu(e.currentTarget);

    $('#searchInput').onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
    $('#searchBtn').onclick = () => doSearch();
    $('#manualBtn').onclick = () => { const q = $('#searchInput').value.trim(); if (q) manualFrom(q, window.Lookup.detect(q).kind); else openEditor(blankCitation(ui.tab), { isNew: true }); };
    $('#pasteBtn').onclick = async () => {
      try {
        const t = (await navigator.clipboard.readText()).trim();
        if (!t) return toast('Your clipboard is empty', { type: 'err' });
        $('#searchInput').value = t;
        doSearch(t);
      } catch (e) { $('#searchInput').focus(); toast(`Press ${MOD}+V to paste`, {}); }
    };
    $('#importBtn').onclick = openFromDevice;
    $('#italicBtn').onmousedown = (e) => { e.preventDefault(); document.execCommand('italic'); };
    $('#preEditor').onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) { e.preventDefault(); doSearch(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); document.execCommand('italic'); }
    };
    $('#preEditor').onpaste = (e) => {
      // keep italics from rich paste, drop everything else
      const html = e.clipboardData.getData('text/html');
      e.preventDefault();
      const clean = html ? window.Cite.sanitizeRich(html) : esc(e.clipboardData.getData('text/plain')).replace(/\r?\n/g, '<br>');
      document.execCommand('insertHTML', false, clean);
    };
    $('#lockBtn').onclick = () => { const p = project(); commit(() => { p.locked = !p.locked; }, { force: true }); toast(p.locked ? 'Project locked' : 'Project unlocked'); };

    $('#fontSel').onchange = (e) => commit(() => { project().font = e.target.value; }, { force: true });
    $('#sizeSel').onchange = (e) => commit(() => { project().fontSize = parseInt(e.target.value, 10); }, { force: true });
    $('#styleBtn').onclick = openStylePicker;
    $('#sortBtn').onclick = openSortMenu;
    $('#selectAll').onchange = (e) => {
      const p = project();
      ui.selected = new Set(e.target.checked ? p.citations.map((c) => c.id) : []);
      renderList(); renderToolbar();
    };
    $('#selCopy').onclick = () => copyRefs(project().citations.filter((c) => ui.selected.has(c.id)));
    $('#selMove').onclick = () => moveDialog([...ui.selected]);
    $('#selExport').onclick = (e) => downloadMenu(e.currentTarget, true);
    $('#selDelete').onclick = () => deleteCitations([...ui.selected]);
    $('#helpBtn').onclick = openHelp;

    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      const k = e.key.toLowerCase();
      if (mod && k === 's') { e.preventDefault(); saveToDevice(); return; }
      if (mod && k === 'o') { e.preventDefault(); openFromDevice(); return; }
      if (e.key === 'Escape') {
        if (openMenuState) return closeMenu();
        if (modals.length) return modals[modals.length - 1].close();
        if (ui.selected.size) { ui.selected.clear(); renderList(); renderToolbar(); }
        return;
      }
      if (modals.length || typing) return;
      if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((mod && k === 'z' && e.shiftKey) || (mod && k === 'y')) { e.preventDefault(); redo(); }
      else if (mod && k === 'a') { e.preventDefault(); ui.selected = new Set(project().citations.map((c) => c.id)); renderList(); renderToolbar(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selected.size) { e.preventDefault(); deleteCitations([...ui.selected]); }
      else if (e.key === '/') { e.preventDefault(); (ui.tab === 'preformatted' ? $('#preEditor') : $('#searchInput')).focus(); }
    });

    // drag & drop files anywhere to import
    let depth = 0;
    const app = $('#app');
    window.addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('Files')) { depth++; app.classList.add('dragover'); } });
    window.addEventListener('dragleave', (e) => { if (e.dataTransfer.types.includes('Files') && --depth <= 0) { depth = 0; app.classList.remove('dragover'); } });
    window.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
    window.addEventListener('drop', async (e) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault(); depth = 0; app.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      importText(f.name, await f.text());
    });

    // other tabs of the app editing the same storage
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const s = JSON.parse(e.newValue);
        state.projects = s.projects; state.folders = s.folders;
        if (!project()) state.activeId = state.projects[0].id;
        render();
      } catch (err) { /* ignore */ }
    });
    window.addEventListener('beforeunload', () => { if (ui.fileHandle && state.autoFile && ui.dirty) writeLinkedFile(true); });
  }

  /* ======================= boot ======================= */
  const MSGS = ['Sharpening pencils…', 'Polishing hanging indents…', 'Italicising the important bits…', 'Alphabetising the alphabet…', 'Dusting off the bibliography…'];
  async function boot() {
    $('#splashMsg').textContent = MSGS[Math.floor(Math.random() * MSGS.length)];
    load();
    hydrate();
    bind();
    render();
    // empty-state art
    $('.empty-art').innerHTML = ART.replace('class="welcome-art"', 'width="120" height="90"');
    try {
      const handle = await IO.kv.get('fileHandle');
      if (handle) { ui.fileHandle = handle; renderStatus(); }
    } catch (e) { /* ignore */ }
    requestAnimationFrame(() => requestAnimationFrame(() => $('#app').classList.remove('preload')));
    setTimeout(() => {
      $('#splash').classList.add('out');
      setTimeout(() => $('#splash').remove(), 400);
      if (location.hash.startsWith('#import=')) checkShareHash();
      else if (!state.welcomed) openWelcome();
    }, 900);
  }
  boot();
})();
