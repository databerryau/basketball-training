// Game day, checked against GAMEDAY.md by playing whole games on a pretend
// clock and tapping what the coach would tap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGameDay, makeStorage, makeClock, secs } from './harness.mjs';

const NAMES = ['Ava', 'Mia', 'Zoe', 'Lily', 'Ella', 'Ruby', 'Isla', 'Chloe', 'Grace', 'Sienna', 'Harper', 'Willow'];
const squadOf = n => NAMES.slice(0, n).map((name, i) => ({ id: `p${i}`, name, num: '', colour: i }));
const LENGTHS = [[2, 18], [2, 20], [4, 8], [4, 10]];

// GAMEDAY 3.2 and 4.2, worked out from the spec rather than the app's code:
// each quarter or half is split into equal stints, as close as possible to
// "sub about every", and the time shares out evenly when the turns on court
// (stints × 5) divide by the number of players.
const stints = (mins, every) => Math.max(1, Math.round(mins / every));
const evenTime = (n, periods, mins, every) => (periods * stints(mins, every) * 5) % n === 0;

// A seeded random number generator, so a failure can be replayed.
function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

// Ticks the squad who're here and taps Start game.
function newGame({ n, periods = 2, mins = 18, every = 6, mode = 'even', here, clock = makeClock() }) {
  const squad = squadOf(n);
  const storage = makeStorage({
    'ebt.squad.v1': squad,
    'ebt.gameprefs.v1': { periods, mins, mode, subEvery: every, here: here || squad.map(p => p.id) },
  });
  const gd = loadGameDay({ storage, clock });
  gd.tap('start');
  return gd;
}

// Seconds into the current quarter or half, by the app's own timer.
const periodElapsed = (g, now) => Math.min(g.periodSecs, g.elapsed + (g.running ? (now - g.runStart) / 1000 : 0));

// Plays to the end. `whistle()` is how many seconds the coach waits for a
// whistle before tapping Done; `every(gd)` runs after each second.
function play(gd, { whistle = () => 0, every, at = {} } = {}) {
  let doneAt = null;
  const dues = [];
  for (let i = 0; i < 20000; i++) {
    const g = gd.game();
    if (g.finished) return { g, dues };
    const t = Math.round((g.period - 1) * g.periodSecs + periodElapsed(g, gd.clock.now));
    if (at[t]) { const f = at[t]; delete at[t]; f(gd, g); continue; }
    if (g.atBreak) {
      if (g.due) { dues.push({ ...g.due, t, played: g.played, onCourt: g.onCourt, atBreak: true }); gd.tap('done'); }
      gd.tap('startstop');
      continue;
    }
    if (g.due) {
      if (doneAt == null) {
        dues.push({ ...g.due, t, played: g.played, onCourt: g.onCourt, atBreak: false });
        doneAt = gd.clock.now + whistle() * 1000;
      }
      if (gd.clock.now >= doneAt) { gd.tap('done'); doneAt = null; continue; }
    }
    gd.clock.advance(1000);
    gd.tick();
    if (every) every(gd);
  }
  throw new Error('the game never finished');
}

const spread = g => {
  const mins = g.players.map(p => g.played[p.id] || 0);
  return Math.max(...mins) - Math.min(...mins);
};

/* ---------- setup (GAMEDAY 3.2) ---------- */

test('setup says how often subs happen, as in the GAMEDAY 4.2 table', () => {
  const cases = [
    [2, 18, 6, 'Subs every 6 minutes: 2 in each half, plus half time.'],
    [2, 18, 5, 'Subs every 4½ minutes: 3 in each half, plus half time.'],
    [4, 10, 5, 'Subs every 5 minutes: 1 in each quarter, plus each break.'],
    [4, 8, 6, 'Subs at each break only.'],
    [4, 8, 4, 'Subs every 4 minutes: 1 in each quarter, plus each break.'],
  ];
  for (const [periods, mins, every, text] of cases) {
    const storage = makeStorage({ 'ebt.squad.v1': squadOf(8), 'ebt.gameprefs.v1': { periods, mins, mode: 'even', subEvery: every } });
    const gd = loadGameDay({ storage });
    assert.ok(gd.root.innerHTML.includes(text), `${periods} × ${mins}, every ${every}: wanted "${text}"`);
  }
});

test('setup says whether the time shares out evenly, and offers the nearest interval that does', () => {
  const setup = (n, every) => {
    const storage = makeStorage({ 'ebt.squad.v1': squadOf(n), 'ebt.gameprefs.v1': { periods: 2, mins: 18, mode: 'even', subEvery: every } });
    return loadGameDay({ storage });
  };
  assert.match(setup(8, 5).root.innerHTML, /✓ With 8 players, everyone gets the same time: 22\.5 minutes each\./);
  const uneven = setup(8, 6);
  assert.match(uneven.root.innerHTML, /doesn't share out exactly/);
  assert.match(uneven.root.innerHTML, /data-gd="every-set" data-e="5">Sub every 5 min instead \(even time\)/);
  uneven.tap('every-set', { e: '5' });
  assert.match(uneven.root.innerHTML, /✓ With 8 players/);
  assert.match(setup(5, 6).root.innerHTML, /Everyone's on court the whole game/);
});

test('the app picks a starting five, and Start game puts them on court', () => {
  const gd = newGame({ n: 9 });
  const g = gd.game();
  assert.equal(g.onCourt.length, 5);
  assert.equal(new Set(g.onCourt).size, 5);
  assert.equal(g.running, true);
});

/* ---------- even split (GAMEDAY 4.2) ---------- */

test('even split: subs come at the breaks and at equal stints, and the fewest minutes go on', () => {
  for (const [periods, mins] of LENGTHS) {
    for (let every = 2; every <= 12; every++) {
      for (let n = 6; n <= 10; n++) {
        const gd = newGame({ n, periods, mins, every });
        const { g, dues } = play(gd);
        const iv = mins * 60 / stints(mins, every);
        const label = `${n} players, ${periods} × ${mins}, sub every ${every}`;
        // when: at every break, and every stint inside each quarter or half
        const mid = dues.filter(d => !d.atBreak).map(d => d.t);
        const want = [];
        for (let p = 0; p < periods; p++) for (let k = 1; k < stints(mins, every); k++) want.push(p * mins * 60 + Math.round(k * iv));
        assert.deepEqual(mid, want, `${label}: mid-period subs`);
        assert.equal(dues.filter(d => d.atBreak).length, periods - 1, `${label}: a sub at every break`);
        // who: as many off as on, from the right lists, fewest minutes on
        for (const d of dues) {
          assert.equal(d.off.length, d.on.length, label);
          d.off.forEach(id => assert.ok(d.onCourt.includes(id), `${label}: ${id} goes off but isn't on`));
          d.on.forEach(id => assert.ok(!d.onCourt.includes(id), `${label}: ${id} goes on but is already on`));
          const court = d.onCourt.filter(id => !d.off.includes(id)).concat(d.on);
          const bench = g.players.map(p => p.id).filter(id => !court.includes(id));
          const most = Math.max(...court.map(id => d.played[id] || 0));
          const least = Math.min(...bench.map(id => d.played[id] || 0));
          assert.ok(most <= least, `${label} at ${d.t}s: someone with more minutes goes on (${most}s) ahead of someone with fewer (${least}s)`);
        }
        // fair minutes (Done tapped straight away)
        const total = periods * mins * 60;
        assert.equal(Object.values(g.played).reduce((a, b) => a + b, 0), total * 5, `${label}: 5 on court the whole game`);
        // Sub moments fall on whole seconds, so stints of 171.4 s take turns
        // at 171 and 172: then "exactly" means within a second per stint.
        const slack = Number.isInteger(iv) ? 0 : periods * stints(mins, every);
        if (evenTime(n, periods, mins, every)) assert.ok(spread(g) <= slack, `${label}: setup said even, but ${spread(g)}s between most and least`);
        else assert.ok(spread(g) <= iv, `${label}: within one stint (${spread(g)}s apart, stint ${iv}s)`);
      }
    }
  }
});

// Bug found by these tests (fixed 13 Nov 2026): with 2 × 20 subbing every 3,
// a stint is 171.4 s, which rounds down to 171. After the subs at 171 s the
// next sub moment came out as 171 again, so Subs due popped up a second later.
test('subs made by hand at a sub moment don\'t bring Subs due straight back', () => {
  const clock = makeClock();
  const gd = newGame({ n: 8, periods: 2, mins: 20, every: 3, clock });
  for (let i = 0; i < 171; i++) { clock.advance(1000); gd.tick(); }
  const due = gd.game().due;
  assert.ok(due, 'subs due at 2:51');
  for (let i = 0; i < 10; i++) { clock.advance(1000); gd.tick(); }
  due.off.forEach((id, i) => { gd.tap('tap', { id }); gd.tap('tap', { id: due.on[i] }); });
  assert.equal(gd.game().due, null);
  for (let i = 0; i < 150; i++) {
    clock.advance(1000); gd.tick();
    assert.equal(gd.game().due, null, `no new subs ${i + 1}s later`);
  }
  assert.equal(gd.shown().next, 'Next subs in 0:12');   // the next one, at 5:43
});

test('even split: waiting up to 30 seconds for a whistle keeps everyone within about 2 minutes', () => {
  const r = rng(42);
  let worst = 0;
  for (let i = 0; i < 300; i++) {
    const [periods, mins] = LENGTHS[i % 4];
    const n = 6 + Math.floor(r() * 5);
    const every = 2 + Math.floor(r() * 11);
    const gd = newGame({ n, periods, mins, every });
    const { g } = play(gd, { whistle: () => Math.floor(r() * 31) });
    const label = `${n} players, ${periods} × ${mins}, sub every ${every}`;
    const iv = mins * 60 / stints(mins, every);
    if (evenTime(n, periods, mins, every)) {
      assert.ok(spread(g) <= 120, `${label}: ${spread(g)}s between most and least`);
      worst = Math.max(worst, spread(g));
    } else assert.ok(spread(g) <= iv + 120, `${label}: ${spread(g)}s apart, stint ${iv}s`);
  }
  assert.ok(worst > 0, 'the whistle waits made a difference somewhere');
});

test('fewer than 6 players: nobody sits, so there are no subs', () => {
  const gd = newGame({ n: 5 });
  const { g, dues } = play(gd);
  assert.equal(dues.length, 0);
  g.players.forEach(p => assert.equal(g.played[p.id], 36 * 60));
});

/* ---------- the clock (GAMEDAY 4.1) ---------- */

test('the clock, "Next subs in" and every player\'s minutes tick over together', () => {
  const clock = makeClock();
  const gd = newGame({ n: 8, every: 6, clock });
  const starters = gd.game().onCourt;
  const bench = gd.game().players.map(p => p.id).filter(id => !starters.includes(id));
  // Odd steps, so the screen is drawn at every part of a second.
  const steps = [130, 370, 250, 410, 90, 600, 220, 330];
  let ms = 0;
  for (let i = 0; ms < 359000; i++) {
    const step = steps[i % steps.length];
    clock.advance(step);
    ms += step;
    gd.tick();
    const s = gd.shown();
    const done = Math.floor(ms / 1000);
    assert.equal(secs(s.clock), 18 * 60 - done, `clock at ${ms}ms`);
    assert.equal(s.next, `Next subs in ${fmt(360 - done)}`, `next subs at ${ms}ms`);
    starters.forEach(id => assert.equal(secs(s.mins[id]), done, `${id}'s minutes at ${ms}ms`));
    bench.forEach(id => assert.equal(s.mins[id], '0:00'));
  }
  // The coach nudges the clock: the players on court move with it.
  gd.tap('adjust-toggle');
  gd.tap('adjust', { s: '30' });
  gd.tick();
  let s = gd.shown();
  assert.equal(secs(s.clock), 18 * 60 - 389);
  starters.forEach(id => assert.equal(secs(s.mins[id]), 389));
  bench.forEach(id => assert.equal(s.mins[id], '0:00'));
  gd.tap('adjust', { s: '-10' });
  gd.tick();
  s = gd.shown();
  assert.equal(secs(s.clock), 18 * 60 - 379);
  starters.forEach(id => assert.equal(secs(s.mins[id]), 379));
});

const fmt = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

test('minutes count from Done, not from when Subs due shows', () => {
  const clock = makeClock();
  const gd = newGame({ n: 8, every: 6, clock });
  for (let i = 0; i < 360; i++) { clock.advance(1000); gd.tick(); }
  const due = gd.game().due;
  assert.ok(due && due.on.length, 'subs due at 6:00');
  for (let i = 0; i < 25; i++) { clock.advance(1000); gd.tick(); }   // waiting for a whistle
  assert.match(gd.root.innerHTML, /Subs due now/);
  gd.tap('done');
  const g = gd.game();
  due.on.forEach(id => assert.equal(g.played[id] || 0, 0, 'still 0 when they go on'));
  due.off.forEach(id => assert.equal(g.played[id], 385, 'played until Done'));
  for (let i = 0; i < 10; i++) { clock.advance(1000); gd.tick(); }
  due.on.forEach(id => assert.equal(gd.shown().mins[id], '0:10'));
});

test('the timer stops at the end of each period and waits for Start', () => {
  const clock = makeClock();
  const gd = newGame({ n: 6, periods: 4, mins: 8, every: 6, clock });
  for (let i = 0; i < 8 * 60 + 30; i++) { clock.advance(1000); gd.tick(); }
  const g = gd.game();
  assert.equal(g.atBreak, true);
  assert.equal(g.running, false);
  assert.match(gd.root.innerHTML, /Quarter 1 of 4 · finished/);
  assert.match(gd.root.innerHTML, /▶ Start quarter 2/);
  assert.match(gd.root.innerHTML, />0:00</);
  gd.tap('done');
  gd.tap('startstop');
  assert.match(gd.root.innerHTML, /Quarter 2 of 4/);
  assert.match(gd.root.innerHTML, />8:00</);
});

test('pause stops the clock and everyone\'s minutes', () => {
  const clock = makeClock();
  const gd = newGame({ n: 8, clock });
  for (let i = 0; i < 100; i++) { clock.advance(1000); gd.tick(); }
  gd.tap('startstop');
  clock.advance(5 * 60 * 1000);
  gd.tick();
  const s = gd.shown();
  assert.equal(s.clock, '16:20');
  gd.game().onCourt.forEach(id => assert.equal(s.mins[id], '1:40'));
  gd.tap('startstop');
  clock.advance(1000);
  gd.tick();
  assert.equal(gd.shown().clock, '16:19');
});

/* ---------- the coach's own subs (GAMEDAY 4.3, 4.4) ---------- */

test('a sub is two taps, in either order, and leaves the rest of Subs due', () => {
  const clock = makeClock();
  const gd = newGame({ n: 9, clock });
  const g0 = gd.game();
  const benchId = g0.players.map(p => p.id).find(id => !g0.onCourt.includes(id));
  const courtId = g0.onCourt[0];
  gd.tap('tap', { id: benchId });
  assert.match(gd.root.innerHTML, /Now tap who's coming off \(or \w+ again to cancel\)/);
  assert.match(gd.root.innerHTML, /is-picked/);
  gd.tap('tap', { id: courtId });
  let g = gd.game();
  assert.ok(g.onCourt.includes(benchId) && !g.onCourt.includes(courtId));
  assert.equal(g.onCourt.length, 5);
  // the other order: court first, then bench
  gd.tap('tap', { id: benchId });
  gd.tap('tap', { id: courtId });
  g = gd.game();
  assert.ok(g.onCourt.includes(courtId) && !g.onCourt.includes(benchId));
  // tapping the same player again cancels
  gd.tap('tap', { id: courtId });
  gd.tap('tap', { id: courtId });
  assert.doesNotMatch(gd.root.innerHTML, /is-picked/);
  // a sub the coach makes is taken out of Subs due
  for (let i = 0; i < 360; i++) { clock.advance(1000); gd.tick(); }
  const due = gd.game().due;
  assert.ok(due.off.length >= 2);
  gd.tap('tap', { id: due.off[0] });
  gd.tap('tap', { id: due.on[0] });
  const left = gd.game().due;
  assert.deepEqual(left.off, due.off.slice(1));
  assert.deepEqual(left.on, due.on.slice(1));
});

test('tapping a name on Subs due picks someone else instead', () => {
  const clock = makeClock();
  const gd = newGame({ n: 10, clock });
  for (let i = 0; i < 360; i++) { clock.advance(1000); gd.tick(); }
  const due = gd.game().due;
  gd.tap('due-tap', { id: due.off[0] });
  const after = gd.game().due;
  assert.ok(!after.off.includes(due.off[0]), 'they stay on');
  assert.equal(after.off.length, after.on.length);
  gd.tap('done');
  assert.ok(gd.game().onCourt.includes(due.off[0]));
  assert.equal(gd.game().onCourt.length, 5);
});

test('manual mode: subs by tapping, minutes counted, no suggestions', () => {
  const clock = makeClock();
  const gd = newGame({ n: 8, mode: 'manual', clock });
  const r = rng(7);
  const { g, dues } = play(gd, {
    every: () => {
      if (r() > 0.01) return;
      const now = gd.game();
      const bench = now.players.map(p => p.id).filter(id => !now.onCourt.includes(id));
      gd.tap('tap', { id: bench[Math.floor(r() * bench.length)] });
      gd.tap('tap', { id: now.onCourt[Math.floor(r() * 5)] });
    },
  });
  assert.equal(dues.length, 0, 'no Subs due in manual');
  assert.equal(Object.values(g.played).reduce((a, b) => a + b, 0), 36 * 60 * 5);
  assert.ok(spread(g) > 0);
});

test('switching from manual to even split plans the rest of the game from there', () => {
  const clock = makeClock();
  const gd = newGame({ n: 8, mode: 'manual', clock });
  const at = { 600: gd2 => gd2.tap('mode', { mode: 'even' }) };
  const { g, dues } = play(gd, { at });
  assert.ok(dues.length > 0);
  // The starters played the first 10 minutes; even split shares out the rest.
  // Everyone's share is 5/8 of the game; the starters were 10 minutes ahead.
  const share = 36 * 60 * 5 / 8;
  g.players.forEach(p => assert.ok(Math.abs(g.played[p.id] - share) <= 6 * 60, `${p.name}: ${g.played[p.id]}s, share ${share}s`));
});

/* ---------- changes during the game (GAMEDAY 4.5) ---------- */

// The fair share from the spec: while the timer runs, each player who's here
// earns 5 ÷ (players here) of the time.
function shares(events, total, ids) {
  const share = Object.fromEntries(ids.map(id => [id, 0]));
  let here = new Set(events.start);
  let t = 0;
  for (const [at, change] of [...events.changes, [total, null]]) {
    const each = Math.min(5, here.size) / here.size;
    here.forEach(id => { share[id] += (at - t) * each; });
    t = at;
    if (change) here = change(new Set(here));
  }
  return share;
}

test('a late arrival gets a fair share of what\'s left, without the others sitting out', () => {
  const clock = makeClock();
  const squad = squadOf(8);
  const gd = newGame({ n: 8, here: squad.slice(0, 7).map(p => p.id), every: 6, clock });
  const at = {
    // Chloe (p7) turns up 10 minutes in.
    600: g => { g.tap('add-toggle'); g.tap('arrive', { id: 'p7' }); },
  };
  const { g } = play(gd, { at });
  assert.ok(g.players.some(p => p.id === 'p7'));
  const fair = shares({ start: squad.slice(0, 7).map(p => p.id), changes: [[600, h => h.add('p7')]] }, 36 * 60, squad.map(p => p.id));
  g.players.forEach(p => assert.ok(Math.abs(g.played[p.id] - fair[p.id]) <= 6 * 60,
    `${p.name}: played ${g.played[p.id]}s, fair share ${Math.round(fair[p.id])}s`));
});

test('a player who\'s hurt on court is replaced straight away, and the plan re-balances', () => {
  const clock = makeClock();
  const gd = newGame({ n: 8, every: 6, clock });
  let hurt;
  const at = {
    500: g => {
      hurt = g.game().onCourt[2];
      g.tap('rest-toggle');
      g.tap('rest', { id: hurt });
      const now = g.game();
      assert.ok(!now.onCourt.includes(hurt));
      assert.deepEqual(now.due.off, []);
      assert.equal(now.due.on.length, 1, 'Subs due: ON one player');
      assert.match(g.root.innerHTML, /Hurt or resting/);
      assert.match(g.root.innerHTML, /Back in/);
    },
    1400: g => g.tap('back', { id: hurt }),
  };
  const { g } = play(gd, { at });
  const ids = g.players.map(p => p.id);
  const fair = shares({ start: ids, changes: [[500, h => { h.delete(hurt); return h; }], [1400, h => h.add(hurt)]] }, 36 * 60, ids);
  g.players.forEach(p => assert.ok(Math.abs(g.played[p.id] - fair[p.id]) <= 6 * 60,
    `${p.name}: played ${g.played[p.id]}s, fair share ${Math.round(fair[p.id])}s`));
});

/* ---------- reloads and the end (GAMEDAY 4.6, 5) ---------- */

test('if the page reloads mid-game, it carries on at the same point and stays fair', () => {
  for (const [n, every] of [[8, 5], [10, 6], [6, 6], [9, 4]]) {
    const clock = makeClock();
    let gd = newGame({ n, every, clock });
    for (let i = 0; i < 700; i++) {
      clock.advance(1000); gd.tick();
      if (gd.game().due) gd.tap('done');
    }
    const before = gd.shown();
    clock.advance(400);
    gd = loadGameDay({ storage: gd.storage, clock });   // the same phone, a fresh page
    gd.tick();
    assert.deepEqual(gd.shown(), before, `${n} players: the same clock and minutes after the reload`);
    const { g } = play(gd);
    if (evenTime(n, 2, 18, every)) assert.equal(spread(g), 0, `${n} players, every ${every}: still exactly even`);
  }
});

test('the end of the game shows everyone\'s minutes', () => {
  const gd = newGame({ n: 8, every: 5 });
  play(gd);
  const html = gd.root.innerHTML;
  assert.match(html, /Game over/);
  const rows = [...html.matchAll(/<li style="--pc:[^"]+"><span>(\w+)<\/span><b>(\d+) min<\/b><\/li>/g)];
  assert.equal(rows.length, 8);
  rows.forEach(([, , m]) => assert.equal(m, '23'));   // 22.5 minutes each, rounded
});
