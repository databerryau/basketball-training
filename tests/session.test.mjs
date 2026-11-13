// The session builder and Start session, checked against SPEC.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, makeStorage, makeClock, read } from './harness.mjs';

const APP = ['assets/js/court.js', 'assets/js/drills.js', 'assets/js/help.js', 'assets/js/gameday.js', 'assets/js/app.js'];
const DRILL_SLOTS = ['warmup', 'skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'game'];
const DAY = 24 * 60 * 60 * 1000;
// Names as they appear in the page's HTML, and as a regular expression.
const esc = t => t.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
const rx = t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function open({ storage = makeStorage(), clock = makeClock(), confirm } = {}) {
  const asked = [];
  const page = loadPage(APP, { storage, clock, confirm: msg => { asked.push(msg); return confirm ? confirm(msg) : true; } });
  page.asked = asked;
  page.session = () => storage.get('ebt.session.v1');
  page.plan = () => page.el('#session').innerHTML;
  return page;
}
// Tap Start session, start the timer, then close it part-way: that session
// has been run (and can still be picked up again).
function runIt(page) {
  page.click({ action: 'run' });
  page.click({ action: 'startstop' });
  page.click({ action: 'exit' });
}
// Run the whole session to the "Great session!" screen and tap Done.
function finishIt(page) {
  page.click({ action: 'run' });
  page.click({ action: 'startstop' });
  for (let i = 0; i < 10; i++) page.click({ action: 'next' });
  page.click({ action: 'exit' });
}

const lib = loadPage(['assets/js/drills.js', 'assets/js/help.js']);
const DRILLS = lib.data('DRILLS');
const THEMES = lib.data('THEMES');
const FOCUS_ORDER = lib.data('FOCUS_ORDER');
const byId = Object.fromEntries(DRILLS.map(d => [d.id, d]));

// SPEC 3.3: the rules every session follows.
function checkSession(s) {
  assert.ok(THEMES[s.focus], `unknown focus ${s.focus}`);
  assert.deepEqual(Object.keys(s.slots).sort(), [...DRILL_SLOTS].sort());
  const d = Object.fromEntries(DRILL_SLOTS.map(k => [k, byId[s.slots[k]]]));
  DRILL_SLOTS.forEach(k => assert.ok(d[k], `${k} is not a drill: ${s.slots[k]}`));
  assert.equal(d.warmup.slot, 'warmup');
  assert.equal(d.game.slot, 'game');
  assert.equal(d.game.theme, s.focus, 'the team game matches today\'s focus');
  ['skill1', 'skill2', 'skill3', 'skill4', 'skill5'].forEach(k => assert.equal(d[k].slot, 'skill', k));
  assert.equal(d.skill1.theme, s.focus, 'Skill 1 is on today\'s focus');
  assert.equal(d.skill5.theme, s.focus, 'Skill 5 is on today\'s focus');
  const others = FOCUS_ORDER.filter(t => t !== s.focus);
  assert.deepEqual(['skill2', 'skill3', 'skill4'].map(k => d[k].theme).sort(), others.sort(), 'Skills 2-4 cover the other three skills');
  if (s.focus !== 'score') assert.equal(d.skill2.theme, 'score', 'Skill 2 is shooting or layups');
  const ids = Object.values(s.slots);
  assert.equal(new Set(ids).size, ids.length, `no drill twice in one session: ${ids}`);
}

/* ---------- the drill library (SPEC 4) ---------- */

test('the drill library matches the table in SPEC 4.1', () => {
  const spec = read('SPEC.md');
  const table = spec.slice(spec.indexOf('### 4.1'), spec.indexOf('Every drill must work'));
  const nameToTheme = Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [t.name, k]));
  const want = {};
  for (const line of table.split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 5 || !['Warm-up game', 'Skill', 'Team game'].includes(cells[1])) continue;
    const slot = { 'Warm-up game': 'warmup', Skill: 'skill', 'Team game': 'game' }[cells[1]];
    const key = slot === 'warmup' ? 'warmup' : `${slot}:${nameToTheme[cells[2]]}`;
    want[key] = cells[3].split(' · ').sort();
  }
  const have = {};
  DRILLS.forEach(d => { (have[d.slot === 'warmup' ? 'warmup' : `${d.slot}:${d.theme}`] ||= []).push(d.name); });
  Object.values(have).forEach(v => v.sort());
  assert.deepEqual(have, want);
  // 6 warm-ups, 7 drills for each skill, 2 team games for each focus
  assert.equal(have.warmup.length, 6);
  FOCUS_ORDER.forEach(t => { assert.equal(have[`skill:${t}`].length, 7, t); assert.equal(have[`game:${t}`].length, 2, t); });
});

test('every drill has a name, 3-5 steps, 2-3 cues, equipment and a valid animation', () => {
  assert.equal(new Set(DRILLS.map(d => d.id)).size, DRILLS.length, 'ids are unique');
  for (const d of DRILLS) {
    const where = d.id;
    assert.ok(typeof d.name === 'string' && d.name.length, where);
    assert.ok(['warmup', 'skill', 'game'].includes(d.slot), where);
    if (d.slot !== 'warmup') assert.ok(FOCUS_ORDER.includes(d.theme), where);
    assert.ok(d.steps.length >= 3 && d.steps.length <= 5, `${where}: ${d.steps.length} steps`);
    assert.ok(d.say.length >= 2 && d.say.length <= 3, `${where}: ${d.say.length} cues`);
    [...d.steps, ...d.say].forEach(t => assert.ok(typeof t === 'string' && t.trim(), where));
    assert.ok(d.need && typeof d.need === 'object', where);
    assert.ok([undefined, 'each', 'some'].includes(d.need.balls), where);
    assert.ok(d.need.cones === undefined || (Number.isInteger(d.need.cones) && d.need.cones > 0), where);
    checkAnim(d.anim, where);
  }
});

// The animation format described at the top of court.js.
function checkAnim(a, where) {
  assert.ok(a && Array.isArray(a.p) && a.p.length, `${where}: players`);
  assert.ok(a.dur === undefined || a.dur > 0, `${where}: dur`);
  const inCourt = (x, y) => x >= -30 && x <= 530 && y >= -30 && y <= 515;
  const times = (list, label) => {
    list.forEach(([t]) => assert.ok(t >= 0 && t <= 1, `${where}: ${label} time ${t}`));
    for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][0], `${where}: ${label} times go forward`);
  };
  a.p.forEach((p, i) => {
    const label = `player ${i}`;
    assert.ok(p.team === undefined || ['a', 'd', 'c', 'w'].includes(p.team), `${where}: ${label} team`);
    if (p.guard != null) {
      assert.ok(Number.isInteger(p.guard) && p.guard !== i && a.p[p.guard], `${where}: ${label} guards a real player`);
    } else {
      assert.ok(Array.isArray(p.k), `${where}: ${label} has a position`);
    }
    if (p.k) {
      const k = typeof p.k[0] === 'number' ? [[0, ...p.k]] : p.k;
      times(k, label);
      k.forEach(([, x, y]) => assert.ok(inCourt(x, y), `${where}: ${label} at ${x},${y} is off the court`));
    }
    if (p.hands) p.hands.forEach(([t, h]) => assert.ok(t >= 0 && t <= 1 && ['R', 'L'].includes(h), `${where}: ${label} hands`));
    if (p.hold) p.hold.forEach(([t0, t1]) => assert.ok(t0 >= 0 && t0 <= t1 && t1 <= 1, `${where}: ${label} hold`));
  });
  (a.balls || []).forEach((ball, j) => {
    times(ball, `ball ${j}`);
    ball.forEach(([, ref]) => assert.ok(
      ref === 'hoop' || (Number.isInteger(ref) && a.p[ref]) || (Array.isArray(ref) && inCourt(ref[0], ref[1])),
      `${where}: ball ${j} goes to ${JSON.stringify(ref)}`));
  });
  (a.cones || []).forEach(([x, y]) => assert.ok(inCourt(x, y), `${where}: cone at ${x},${y}`));
  (a.cap || []).forEach(([t0, t1, txt]) => assert.ok(t0 >= 0 && t0 < t1 && t1 <= 1 && typeof txt === 'string' && txt, `${where}: caption ${txt}`));
  assert.ok(a.poster === undefined || (a.poster >= 0 && a.poster <= 1), `${where}: poster`);
}

/* ---------- making a session (SPEC 3, 9) ---------- */

test('the start page shows one big button and a 3-step how it works', () => {
  const page = open();
  const html = page.plan();
  assert.equal((html.match(/data-action="generate"/g) || []).length, 1);
  assert.match(html, /Make today's session/);
  const how = /<ol class="how">([\s\S]*?)<\/ol>/.exec(html);
  assert.ok(how, 'has a how it works list');
  assert.equal((how[1].match(/<li>/g) || []).length, 3);
});

test('one tap makes a 60-minute, ten-part session with a clear focus', () => {
  const page = open();
  page.click({ action: 'generate' });
  assert.equal(page.asked.length, 0, 'the first session doesn\'t ask "Are you sure?"');
  const html = page.plan();
  const parts = [...html.matchAll(/<span class="part-slot">[^<]*?([A-Z][\w -]+) · (\d+) min<\/span>/g)].map(m => [m[1], +m[2]]);
  assert.deepEqual(parts, [
    ['Warm-up game', 6], ['Skill 1', 7], ['Skill 2', 7], ['Drink break', 1], ['Skill 3', 7],
    ['Skill 4', 7], ['Drink break', 1], ['Skill 5', 7], ['Team game', 12], ['Huddle', 5]]);
  assert.equal(parts.reduce((n, [, m]) => n + m, 0), 60);
  assert.match(html, /<span class="part-time" aria-hidden="true">55–60<\/span>/);
  const s = page.session();
  checkSession(s);
  assert.equal(s.focus, 'sense', 'the first session ever is Spread out & get open');
  assert.match(html, new RegExp(`Today's focus[\\s\\S]*${rx(THEMES.sense.name)}[\\s\\S]*Fixes: <b>${rx(THEMES.sense.fixes.toLowerCase())}`));
});

test('the focus rotates once each session is run, and every session follows the rules', () => {
  const page = open();
  const seen = [];
  for (let i = 0; i < 60; i++) {
    page.click({ action: 'generate' });
    const s = page.session();
    checkSession(s);
    seen.push(s.focus);
    if (i % 2) runIt(page); else finishIt(page);
    assert.equal(page.session().used, true);
  }
  seen.forEach((f, i) => assert.equal(f, FOCUS_ORDER[i % 4], `session ${i + 1}`));
});

test('back-to-back sessions share no drills', () => {
  const page = open();
  page.click({ action: 'generate' });
  for (let i = 0; i < 80; i++) {
    const last = page.session();
    runIt(page);
    page.click({ action: 'generate' });
    const now = page.session();
    const shared = Object.values(now.slots).filter(id => Object.values(last.slots).includes(id));
    assert.deepEqual(shared, [], `session ${i + 2} repeats drills from the one before`);
  }
});

test('replacing a session that wasn\'t run keeps the focus and picks different drills', () => {
  const page = open();
  page.click({ action: 'generate' });
  runIt(page);
  for (let i = 0; i < 50; i++) {
    const lastRun = page.session();
    page.click({ action: 'generate' });             // today's session (focus moves on)
    const first = page.session();
    const asked = page.asked.length;
    page.click({ action: 'generate' });             // changed their mind before training
    assert.equal(page.asked.length, asked + 1, 'asks "Are you sure?"');
    assert.match(page.asked.at(-1), /same focus/);
    const second = page.session();
    checkSession(second);
    assert.equal(second.focus, first.focus, 'the focus doesn\'t move on');
    const avoid = [...Object.values(first.slots), ...Object.values(lastRun.slots)];
    assert.deepEqual(Object.values(second.slots).filter(id => avoid.includes(id)), [], 'all new drills');
    runIt(page);
  }
});

test('saying no to "Are you sure?" keeps the session', () => {
  const page = open({ confirm: () => false });
  page.click({ action: 'generate' });
  const before = page.session();
  page.click({ action: 'generate' });
  assert.equal(page.asked.length, 1);
  assert.deepEqual(page.session(), before);
});

test('a session made 2 or more days ago counts as run when it\'s replaced', () => {
  const clock = makeClock();
  const page = open({ clock });
  page.click({ action: 'generate' });
  assert.equal(page.session().focus, 'sense');
  clock.advance(2 * DAY - 60000);
  page.click({ action: 'generate' });
  assert.equal(page.session().focus, 'sense', 'not yet two days');
  clock.advance(2 * DAY);
  page.click({ action: 'generate' });
  assert.match(page.asked.at(-1), /focus moves on/);
  assert.equal(page.session().focus, 'ball');
});

test('picking a focus makes a plan on it straight away, and the rotation carries on from there', () => {
  const page = open();
  page.click({ action: 'generate' });
  page.click({ focus: 'defence' });
  assert.equal(page.asked.length, 0, 'no "Are you sure?"');
  checkSession(page.session());
  assert.equal(page.session().focus, 'defence');
  runIt(page);
  page.click({ action: 'generate' });
  assert.equal(page.session().focus, 'sense', 'after Stop them scoring comes Spread out & get open');
  page.click({ focus: 'score' });
  runIt(page);
  page.click({ action: 'generate' });
  assert.equal(page.session().focus, 'defence');
});

/* ---------- swap (SPEC 3.4) ---------- */

test('swap keeps each slot\'s rules and cycles through every option before repeating', () => {
  for (let trial = 0; trial < 20; trial++) {
    const page = open();
    page.click({ action: 'generate' });
    for (let r = 0; r < trial % 4; r++) { runIt(page); page.click({ action: 'generate' }); }
    for (const slot of DRILL_SLOTS) {
      const s0 = page.session();
      const others = DRILL_SLOTS.filter(k => k !== slot).map(k => s0.slots[k]);
      const cur = byId[s0.slots[slot]];
      // What fits this slot: the same skill (or the focus), or any warm-up / team game.
      const options = DRILLS.filter(d => d.slot === cur.slot && (cur.slot !== 'skill' || d.theme === cur.theme) && !others.includes(d.id));
      const got = [cur.id];
      for (let i = 0; i < options.length - 1; i++) {
        page.click({ swap: slot });
        const s = page.session();
        checkSessionAfterSwap(s, s0, slot);
        got.push(s.slots[slot]);
      }
      assert.equal(new Set(got).size, options.length, `${slot}: no repeats until every option has had a turn`);
      page.click({ swap: slot });
      assert.notEqual(page.session().slots[slot], got.at(-1), `${slot}: a swap always changes the drill`);
    }
  }
});

// A swap changes that one slot, and the session still follows the rules
// (the team game is only checked for being a team game: see below).
function checkSessionAfterSwap(s, before, slot) {
  DRILL_SLOTS.filter(k => k !== slot).forEach(k => assert.equal(s.slots[k], before.slots[k], `swapping ${slot} changed ${k}`));
  if (slot === 'game') {
    assert.equal(byId[s.slots.game].slot, 'game');
    const ids = Object.values(s.slots);
    assert.equal(new Set(ids).size, ids.length);
  } else checkSession(s);
}

/* ---------- remembering (SPEC 3.5) ---------- */

test('the session is still there after closing and reopening the page', () => {
  const storage = makeStorage();
  const clock = makeClock();
  const a = open({ storage, clock });
  a.click({ action: 'generate' });
  a.click({ swap: 'skill3' });
  const s = a.session();
  clock.advance(DAY);
  const b = open({ storage, clock });
  assert.deepEqual(b.session(), s);
  const html = b.plan();
  DRILL_SLOTS.forEach(k => assert.ok(html.includes(esc(byId[s.slots[k]].name)), `${k} is on the plan`));
});

test('once run, the plan shows it as the last session with a big button for the next one', () => {
  const page = open();
  page.click({ action: 'generate' });
  finishIt(page);
  const html = page.plan();
  assert.match(html, /Last session/);
  assert.match(html, /data-action="generate">Make the next session/);
  assert.match(html, new RegExp(`Next focus: <b><span aria-hidden="true">[^<]+</span> ${rx(THEMES.ball.name)}`));
  assert.match(html, /Run this session again/);
  page.click({ action: 'generate' });
  assert.equal(page.asked.length, 0, 'no "Are you sure?" after a session was run');
});

test('a plan saved by an older version gets every part filled by today\'s rules', () => {
  const storage = makeStorage({
    'ebt.session.v1': { v: 1, created: Date.UTC(2026, 9, 20), focus: 'ball', slots: { warmup: 'dribble-tag', skill1: 'cone-weave', skill2: 'cone-weave', skill3: 'layup-lines', game: 'rotating-3v3' }, seen: {} },
  });
  const page = open({ storage });
  const s = page.session();
  checkSession(s);
  assert.equal(s.slots.warmup, 'dribble-tag', 'what still fits is kept');
  assert.equal(s.slots.skill1, 'cone-weave');
});

test('the page still works when nothing can be saved (private browsing)', () => {
  const page = loadPage(APP);
  page.ctx.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  page.click({ action: 'generate' });
  assert.match(page.el('#session').innerHTML, /Today's focus/);
});

/* ---------- Start session (SPEC 5) ---------- */

test('Start session runs every part with a timer and Next, then names the next focus', () => {
  const clock = makeClock();
  const page = open({ clock });
  page.click({ action: 'generate' });
  page.click({ action: 'run' });
  assert.match(page.el('#run').innerHTML, /Part 1 of 10/);
  assert.equal(page.el('#timer').textContent, '6:00');
  page.click({ action: 'startstop' });
  clock.advance(6 * 60 * 1000 + 23000);
  page.tick();
  assert.equal(page.el('#timer').textContent, '+0:23', 'overtime counts up');
  assert.match(page.el('#timerMsg').textContent, /Time's up! Tap Next/);
  const mins = [6, 7, 7, 1, 7, 7, 1, 7, 12, 5];
  for (let i = 1; i < 10; i++) {
    page.click({ action: 'next' });
    assert.match(page.el('#run').innerHTML, new RegExp(`Part ${i + 1} of 10`));
    assert.equal(page.el('#timer').textContent, `${mins[i]}:00`, 'the next part starts straight away');
  }
  page.click({ action: 'back' });
  assert.match(page.el('#run').innerHTML, /Part 9 of 10/);
  page.click({ action: 'next' });
  page.click({ action: 'next' });
  assert.match(page.el('#run').innerHTML, /Great session![\s\S]*Look after the ball/);
});

test('reloading during Start session carries on at the same part, with the timer where it should be', () => {
  const storage = makeStorage();
  const clock = makeClock();
  const a = open({ storage, clock });
  a.click({ action: 'generate' });
  a.click({ action: 'run' });
  a.click({ action: 'startstop' });
  a.click({ action: 'next' });
  a.click({ action: 'next' });
  a.click({ action: 'next' });                       // part 4: the first drink, 1 minute
  clock.advance(20000);
  const b = open({ storage, clock });                // the phone reloaded the page
  assert.match(b.el('#run').innerHTML, /Part 4 of 10/);
  assert.equal(b.el('#timer').textContent, '0:40');
  clock.advance(45000);
  b.tick();
  assert.equal(b.el('#timer').textContent, '+0:05');
  b.click({ action: 'startstop' });                  // paused, then the page reloads
  clock.advance(60000);
  const c = open({ storage, clock });
  assert.equal(c.el('#timer').textContent, '+0:05', 'a paused timer stays paused');
  clock.advance(2 * 60 * 60 * 1000 + 1000);
  const d = open({ storage, clock });
  assert.equal(d.el('#run').innerHTML, '', 'a run nobody tapped for 2 hours is over');
});

/* ---------- words the coach reads (SPEC 6, 7) ---------- */

test('Coach help has its four sections', () => {
  assert.deepEqual(lib.data('HELP').map(s => s.title), ['New coach basics', 'Rules made simple', 'Basketball words', 'Game day']);
});

test('the coach reads "player" and "they", never "girl" or "she"', () => {
  // court.js is left out: its words are comments for whoever edits the animations.
  for (const f of ['index.html', 'manifest.webmanifest', 'assets/js/app.js', 'assets/js/gameday.js', 'assets/js/drills.js', 'assets/js/help.js']) {
    const hits = read(f).match(/\b(girls?|she|her|hers|herself)\b/gi);
    assert.equal(hits, null, `${f} says ${hits}`);
  }
});

/* ---------- offline copy (SPEC 8) ---------- */

test('sw.js keeps a copy of every file the app needs', () => {
  const sw = read('sw.js');
  const list = JSON.parse(`[${/const APP_FILES = \[([\s\S]*?)\];/.exec(sw)[1].replace(/'/g, '"').replace(/,\s*$/, '')}]`);
  const html = read('index.html');
  const linked = [...html.matchAll(/(?:src|href)="((?:assets\/|manifest)[^"]+)"/g)].map(m => m[1]);
  linked.forEach(f => assert.ok(list.includes(f), `${f} is linked from index.html but not in sw.js`));
  const manifest = JSON.parse(read('manifest.webmanifest'));
  manifest.icons.forEach(i => assert.ok(list.includes(i.src), `${i.src} is in the manifest but not in sw.js`));
  list.filter(f => f !== './').forEach(f => assert.doesNotThrow(() => read(f), `${f} is in sw.js but missing`));
  assert.match(sw, /const VERSION = 'basketball-training-v\d+';/);
});
