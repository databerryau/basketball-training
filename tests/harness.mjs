// Loads the app's real scripts into a sandbox with a pretend page, phone
// storage and clock, so the tests drive them through the same taps the coach
// makes. No browser and no dependencies: just `node --test`.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// localStorage that outlives a "page" (a new sandbox on the same storage is a reload).
export function makeStorage(seed = {}) {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    map: m,
    get: k => (m.has(k) ? JSON.parse(m.get(k)) : null),
    set: (k, v) => m.set(k, JSON.stringify(v)),
  };
}

// A clock the tests move by hand.
export function makeClock(start = Date.UTC(2026, 10, 14, 0, 0, 0)) {
  return { now: start, advance(ms) { this.now += ms; } };
}

const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// Something the coach taps: `closest('[data-x]')` finds it when it has data-x.
export function target(dataset) {
  const el = {
    dataset, disabled: false, setAttribute() {},
    closest(sel) {
      const m = /^\[data-([a-z-]+)\]$/.exec(sel);
      return m && camel(m[1]) in dataset ? el : null;
    },
  };
  return el;
}

function fakeElement() {
  const classes = new Set();
  return {
    innerHTML: '', textContent: '', hidden: false, scrollTop: 0, dataset: {}, attrs: {},
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle: (c, on) => { const want = on === undefined ? !classes.has(c) : !!on; if (want) classes.add(c); else classes.delete(c); return want; },
      contains: c => classes.has(c),
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    addEventListener() {}, focus() {},
    querySelector: () => fakeElement(), querySelectorAll: () => [], closest: () => null,
  };
}

// One page load. `files` run in order, like the <script> tags in index.html.
export function loadPage(files, { storage = makeStorage(), clock = makeClock(), confirm = () => true } = {}) {
  const listeners = {};
  const intervals = new Map();
  let nextId = 1;
  const els = new Map();
  const runView = fakeElement();
  runView.hidden = true;                    // Start session is closed when the page opens
  els.set('#run', runView);
  const document = {
    body: fakeElement(),
    querySelector: sel => { if (!els.has(sel)) els.set(sel, fakeElement()); return els.get(sel); },
    querySelectorAll: () => [],
    addEventListener: (type, fn) => { (listeners['doc:' + type] ||= []).push(fn); },
    visibilityState: 'visible',
  };
  const localStorage = {
    getItem: k => (storage.map.has(k) ? storage.map.get(k) : null),
    setItem: (k, v) => storage.map.set(k, String(v)),
    removeItem: k => storage.map.delete(k),
  };
  const sandbox = {
    console, URLSearchParams, document, localStorage,
    navigator: { userAgent: 'node-test', platform: 'test', maxTouchPoints: 0 },
    location: { hash: '', hostname: 'localhost', search: '' },
    history: { replaceState() {} },
    matchMedia: () => ({ matches: false }),
    scrollTo() {},
    confirm: (...a) => confirm(...a),
    addEventListener: (type, fn) => { (listeners['win:' + type] ||= []).push(fn); },
    setInterval: fn => { const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id),
    setTimeout: () => 0, clearTimeout() {},
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  // Both Date.now() and new Date() read the pretend clock.
  vm.runInContext(`globalThis.Date = class extends Date {
    constructor(...a) { if (a.length) super(...a); else super(__clock.now); }
    static now() { return __clock.now; }
  };`, Object.assign(ctx, { __clock: clock }));
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return {
    ctx, storage, clock, el: sel => document.querySelector(sel),
    get: expr => vm.runInContext(expr, ctx),
    // A plain copy (objects from the sandbox fail strict deepEqual against ours).
    data: expr => JSON.parse(JSON.stringify(vm.runInContext(expr, ctx))),
    // A tap anywhere on the page (app.js listens on the whole document).
    click: dataset => (listeners['doc:click'] || []).forEach(fn => fn({ target: target(dataset) })),
    // What setInterval would do next: each running timer fires once.
    tick: () => [...intervals.values()].forEach(fn => fn()),
  };
}

// The Game day screen on its own, with a root that knows which live numbers it shows.
export function loadGameDay(opts = {}) {
  const page = loadPage(['assets/js/gameday.js'], opts);
  const live = new Map();
  const handlers = {};
  const root = {
    innerHTML: '',
    addEventListener: (type, fn) => { handlers[type] = fn; },
    closest: () => null,
    querySelector(sel) {
      const id = /^#(\w+)$/.exec(sel);
      if (!id || !this.innerHTML.includes(`id="${id[1]}"`)) return null;
      if (!live.has(sel)) live.set(sel, { textContent: '', focus() {} });
      return live.get(sel);
    },
    querySelectorAll(sel) {
      if (sel !== '[data-min]') return [];
      return [...this.innerHTML.matchAll(/data-min="([^"]+)"/g)].map(m => {
        const key = 'min:' + m[1];
        if (!live.has(key)) live.set(key, { dataset: { min: m[1] }, textContent: '' });
        return live.get(key);
      });
    },
  };
  const GameDay = page.get('GameDay');
  GameDay.init(root);
  return {
    ...page, root, GameDay,
    tap: (gd, extra = {}) => handlers.click({ target: target({ gd, ...extra }) }),
    game: () => page.storage.get('ebt.game.v1'),
    render: () => GameDay.show(),
    // The numbers the 4-times-a-second update last wrote.
    shown: () => ({
      clock: root.querySelector('#gdClock') && root.querySelector('#gdClock').textContent,
      next: root.querySelector('#gdNext') && root.querySelector('#gdNext').textContent,
      mins: Object.fromEntries(root.querySelectorAll('[data-min]').map(n => [n.dataset.min, n.textContent])),
    }),
  };
}

export const secs = mmss => { const [m, s] = mmss.split(':').map(Number); return m * 60 + s; };
