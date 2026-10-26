/* =========================================================
   Game day: subs and fair minutes during a game.

   The squad, the game settings and the game in progress are
   kept on this phone (localStorage) and never sent anywhere.

   Minutes run on the app's own game timer (pause it at breaks
   and time-outs), not the wall clock. Even split keeps a fair
   share for every girl: while the timer runs, each girl who's
   here earns 5 / (girls here) of the time, and at every sub
   moment the girls furthest behind their share go on.
   ========================================================= */
const GameDay = (() => {
  const KEY_SQUAD = 'ebt.squad.v1';
  const KEY_PREFS = 'ebt.gameprefs.v1';
  const KEY_GAME = 'ebt.game.v1';
  const COURT = 5;
  const MAX_SQUAD = 15;
  const SUB_EVERY = 6;                                   // even split: how often to aim to sub (minutes), unless the coach changes it
  const EVERY_MIN = 2, EVERY_MAX = 12;
  const LENGTHS = [[2, 18], [2, 20], [4, 8], [4, 10]];   // quick picks: [periods, minutes each]; the first is the default
  // Each girl keeps her own colour, so she's easy to spot in the lists.
  const COLOURS = ['#2563EB', '#DC2626', '#16A34A', '#9333EA', '#F59E0B', '#0891B2', '#DB2777', '#65A30D',
    '#4F46E5', '#EA580C', '#0D9488', '#A16207', '#334155', '#38BDF8', '#FACC15'];

  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* private mode */ } },
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el = root) => el.querySelector(sel);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmt = secs => { const s = Math.max(0, Math.round(secs)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  let root = null;
  let squad = (store.get(KEY_SQUAD) || []).filter(p => p && p.id && p.name);
  let prefs = Object.assign({ periods: LENGTHS[0][0], mins: LENGTHS[0][1], mode: 'even', subEvery: SUB_EVERY, here: null }, store.get(KEY_PREFS) || {});
  let game = loadGame();       // in progress, or finished (its summary), or null
  let screen = 'auto';          // 'auto' | 'squad' | 'setup'
  let setup = null;             // { here: [ids], starters: [ids], other: bool } while setting up
  let picked = null;            // the girl tapped first for a sub

  // The lowest colour nobody else in the squad has.
  const freeColour = () => {
    const used = squad.map(p => p.colour);
    const i = COLOURS.findIndex((c, j) => !used.includes(j));
    return i < 0 ? squad.length % COLOURS.length : i;
  };
  // A squad saved before colours existed: give each girl hers, and keep it.
  if (squad.some(p => !Number.isInteger(p.colour))) {
    squad.forEach(p => { if (!Number.isInteger(p.colour)) p.colour = freeColour(); });
    store.set(KEY_SQUAD, squad);
  }
  const colourOf = p => COLOURS[(p && Number.isInteger(p.colour) ? p.colour : 0) % COLOURS.length];
  let adjusting = false, adding = false, resting = false;
  let ticker = null, wakeLock = null, asking = false;

  function loadGame() {
    const g = store.get(KEY_GAME);
    const ok = g && g.v === 1 && Array.isArray(g.players) && Array.isArray(g.onCourt)
      && [2, 4].includes(g.periods) && g.periodSecs > 0 && g.period >= 1 && g.period <= g.periods
      && g.played && g.share && ['even', 'manual'].includes(g.mode);
    if (!ok) return null;
    // whole seconds only, so every girl's time ticks over with the clock
    ['played', 'share'].forEach(k => Object.keys(g[k]).forEach(id => { g[k][id] = Math.round(g[k][id] || 0); }));
    g.lastCommit = Math.round(g.lastCommit || 0);
    return g;
  }
  const save = () => { if (game) store.set(KEY_GAME, game); };
  const saveSquad = () => store.set(KEY_SQUAD, squad);
  const savePrefs = () => store.set(KEY_PREFS, prefs);
  const live = () => game && !game.finished;

  /* ---------- the game timer ---------- */
  const periodWord = g => (g.periods === 2 ? 'Half' : 'Quarter');
  const periodName = (g, n) => `${periodWord(g)} ${n}`;
  let frozen = null;   // set while drawing, so the whole screen uses one reading of the clock
  const nowMs = () => (frozen != null ? frozen : Date.now());
  function periodElapsed() {
    const e = game.elapsed + (game.running ? (nowMs() - game.runStart) / 1000 : 0);
    return Math.min(game.periodSecs, Math.max(0, e));
  }
  const clockNow = () => (game.period - 1) * game.periodSecs + periodElapsed();
  // The clock, the next-subs countdown and every girl's minutes all count in
  // whole seconds of the game clock, so they all tick over together.
  const clockSecs = () => Math.floor(clockNow() + 1e-6);
  const periodSecsDone = () => Math.floor(periodElapsed() + 1e-6);

  // Each quarter or half is split into equal stints, as close as possible to
  // how often the coach aims to sub (1 stint = subs at the breaks only).
  const stintsPer = (mins, every) => Math.max(1, Math.round(mins / (every || SUB_EVERY)));
  const stintSecs = g => g.periodSecs / stintsPer(g.periodSecs / 60, g.subEvery);
  function nextMoment(after) {
    const iv = stintSecs(game);
    const t = Math.round((Math.floor(after / iv + 1e-6) + 1) * iv);   // on a whole second of the clock
    return t < game.periodSecs - 1 ? t : null;   // the end of the period is a break, handled on its own
  }

  /* ---------- minutes and fair shares ---------- */
  const here = () => game.players.filter(p => !p.out);
  const player = id => game.players.find(p => p.id === id);

  // Credits the time since the last change: minutes to the girls on court,
  // and a fair share to every girl who's here. (Taken back off if the coach
  // nudged the timer back, so minutes always go with the clock.)
  function commit() {
    const now = clockSecs();
    const dt = now - game.lastCommit;
    game.lastCommit = now;
    if (!dt) return;
    const ins = here();
    const each = ins.length ? Math.min(COURT, ins.length) / ins.length : 0;
    ins.forEach(p => { game.share[p.id] = Math.max(0, (game.share[p.id] || 0) + dt * each); });
    game.onCourt.forEach(id => { game.played[id] = Math.max(0, (game.played[id] || 0) + dt); });
  }
  const playedNow = id => (game.played[id] || 0) + (game.onCourt.includes(id) ? Math.max(0, clockSecs() - game.lastCommit) : 0);
  const owed = id => (game.played[id] || 0) - (game.share[id] || 0);   // below 0 = owed time

  // Even split: the girls furthest behind their share go on (on a tie,
  // girls on the bench before girls on court), the rest come off.
  function plan() {
    commit();
    const ins = here().map(p => p.id);
    const court = game.onCourt;
    const order = ins.slice().sort((a, b) => owed(a) - owed(b) || court.includes(a) - court.includes(b) || ins.indexOf(a) - ins.indexOf(b));
    const target = order.slice(0, Math.min(COURT, ins.length));
    const off = court.filter(id => !target.includes(id));
    const on = target.filter(id => !court.includes(id));
    return off.length || on.length ? { off, on, keep: [], rest: [] } : null;
  }

  // A spot on court is empty (someone hurt or out, or a late arrival with
  // fewer than 5 on): in even split, ask for the girl owed most time.
  function fillGaps() {
    if (game.mode !== 'even' || game.finished) return;
    const spots = Math.min(COURT, here().length) - game.onCourt.length;
    if (spots <= 0) return;
    if (game.due) { game.due = plan(); return; }
    commit();
    const bench = here().map(p => p.id).filter(id => !game.onCourt.includes(id)).sort((a, b) => owed(a) - owed(b));
    if (bench.length) game.due = { off: [], on: bench.slice(0, spots), keep: [], rest: [] };
  }

  /* ---------- actions ---------- */
  function startGame() {
    const players = squad.filter(p => setup.here.includes(p.id)).map(p => ({ id: p.id, name: p.name, num: p.num || '', colour: p.colour, out: false }));
    game = {
      v: 1, created: Date.now(), periods: prefs.periods, periodSecs: prefs.mins * 60, mode: prefs.mode, subEvery: prefs.subEvery,
      players, onCourt: setup.starters.slice(), played: {}, share: {}, lastCommit: 0,
      period: 1, elapsed: 0, running: true, runStart: Date.now(), atBreak: false,
      due: null, nextSubAt: null, finished: false,
    };
    game.nextSubAt = nextMoment(0);
    prefs.here = setup.here.slice();
    savePrefs();
    setup = null; picked = null; adjusting = false; adding = false; resting = false; screen = 'auto';
    save();
    startTicking();
    keepAwake();
  }

  function startStop() {
    if (game.atBreak) {
      game.period++;
      game.elapsed = 0;
      game.atBreak = false;
      game.nextSubAt = nextMoment(0);
      game.running = true;
      game.runStart = Date.now();
    } else if (game.running) {
      commit();
      game.elapsed = periodElapsed();
      game.running = false;
    } else {
      game.running = true;
      game.runStart = Date.now();
    }
    keepAwake();
  }

  function endPeriod() {
    commit();
    game.elapsed = game.periodSecs;
    game.running = false;
    if (game.period >= game.periods) { finish(); return; }
    game.atBreak = true;
    game.due = game.mode === 'even' ? plan() : null;   // a break is a free moment to sub
  }

  function finish() {
    if (game.running) { commit(); game.elapsed = periodElapsed(); }
    commit();
    game.running = false;
    game.finished = true;
    game.due = null;
    picked = null;
    stopTicking();
    letSleep();
  }

  function doneSubs() {
    commit();
    const d = game.due;
    game.onCourt = game.onCourt.filter(id => !d.off.includes(id))
      .concat(d.on.filter(id => player(id) && !player(id).out && !game.onCourt.includes(id)));
    game.due = null;
    if (!game.atBreak) game.nextSubAt = nextMoment(periodElapsed());
  }

  // Tap a name on the "Subs due" panel to pick someone else instead.
  function changeDue(id) {
    const d = game.due;
    commit();
    if (d.off.includes(id)) {
      d.keep.push(id);
      const alt = game.onCourt.filter(x => !d.off.includes(x) && !d.keep.includes(x)).sort((a, b) => owed(b) - owed(a))[0];
      if (alt) d.off[d.off.indexOf(id)] = alt;
      else {
        d.off.splice(d.off.indexOf(id), 1);
        if (d.on.length > d.off.length + Math.max(0, Math.min(COURT, here().length) - game.onCourt.length)) {
          d.on.sort((a, b) => owed(a) - owed(b)).pop();
        }
      }
    } else if (d.on.includes(id)) {
      d.rest.push(id);
      const alt = here().map(p => p.id)
        .filter(x => !game.onCourt.includes(x) && !d.on.includes(x) && !d.rest.includes(x))
        .sort((a, b) => owed(a) - owed(b))[0];
      if (alt) d.on[d.on.indexOf(id)] = alt;
      else {
        d.on.splice(d.on.indexOf(id), 1);
        if (d.off.length > d.on.length) d.off.sort((a, b) => owed(b) - owed(a)).pop();
      }
    }
    if (!d.off.length && !d.on.length) game.due = null;
  }

  // A sub, in either mode: tap a girl on the bench and the girl she replaces
  // (either order). The plan never goes exactly to plan, so even split just
  // carries on from whatever the coach did.
  function tapPlayer(id) {
    if (game.finished) return;
    const onCourt = x => game.onCourt.includes(x);
    if (!onCourt(id) && game.onCourt.length < Math.min(COURT, here().length)) {
      commit();
      game.onCourt.push(id);   // an empty spot: straight on
      picked = null;
      tidyDue([id]);
      return;
    }
    if (!picked || picked === id || onCourt(picked) === onCourt(id)) { picked = picked === id ? null : id; return; }
    commit();
    const off = onCourt(picked) ? picked : id;
    const on = onCourt(picked) ? id : picked;
    game.onCourt = game.onCourt.map(x => (x === off ? on : x));
    picked = null;
    tidyDue([off, on]);
  }

  // After a sub the coach made, drop those girls from any "Subs due"
  // suggestion, keeping the rest of it (as many off as on).
  function tidyDue(ids) {
    const d = game.due;
    if (!d) return;
    d.off = d.off.filter(x => !ids.includes(x) && game.onCourt.includes(x));
    d.on = d.on.filter(x => !ids.includes(x) && !game.onCourt.includes(x));
    const spots = Math.max(0, Math.min(COURT, here().length) - game.onCourt.length);
    while (d.on.length > d.off.length + spots) d.on.pop();
    while (d.off.length > d.on.length) d.off.pop();
    if (!d.off.length && !d.on.length) game.due = null;
  }

  function setOut(id, out) {
    commit();
    player(id).out = out;
    if (out) {
      game.onCourt = game.onCourt.filter(x => x !== id);
      if (game.due) { game.due.on = game.due.on.filter(x => x !== id); game.due.off = game.due.off.filter(x => x !== id); }
      if (picked === id) picked = null;
    }
    if (game.due && !game.due.on.length && !game.due.off.length) game.due = null;
    fillGaps();
  }

  function addPlayer(p) {
    commit();
    if (!game.players.some(x => x.id === p.id)) game.players.push({ id: p.id, name: p.name, num: p.num || '', colour: p.colour, out: false });
    else player(p.id).out = false;
    fillGaps();
  }

  function setMode(mode) {
    if (mode === game.mode) return;
    commit();
    game.mode = mode;
    game.due = null;
    picked = null;
    if (mode === 'even' && !game.atBreak) game.nextSubAt = nextMoment(periodElapsed());
    if (mode === 'even' && game.atBreak) game.due = plan();
    fillGaps();
  }

  // Nudge the timer to match the scoreboard. The girls on court gain or lose
  // the same time straight away, so their minutes keep ticking with the clock.
  function adjust(secs) {
    commit();
    const e = Math.min(game.periodSecs - 1, Math.max(0, periodElapsed() + secs));
    game.elapsed = e;
    if (game.running) game.runStart = Date.now();
    commit();
    if (game.mode === 'even' && !game.due) game.nextSubAt = nextMoment(e);
  }

  /* ---------- squad ---------- */
  function addToSquad(name, num) {
    name = name.trim().slice(0, 20);
    num = String(num || '').replace(/\D/g, '').slice(0, 2);
    if (!name || squad.length >= MAX_SQUAD) return null;
    const p = { id: uid(), name, num, colour: freeColour() };
    squad.push(p);
    saveSquad();
    return p;
  }

  /* ---------- the ticking timer ---------- */
  function tick() {
    if (!live()) return;
    let changed = false;
    if (game.running && periodElapsed() >= game.periodSecs) {
      endPeriod();
      changed = true;
    } else if (game.running && game.mode === 'even' && !game.due && game.nextSubAt != null && periodElapsed() >= game.nextSubAt) {
      game.due = plan();
      game.nextSubAt = nextMoment(game.nextSubAt);
      changed = true;
    }
    if (changed) { save(); render(); } else updateLive();
  }
  function startTicking() { clearInterval(ticker); ticker = setInterval(tick, 250); }
  function stopTicking() { clearInterval(ticker); ticker = null; }

  // The screen stays on while a game is on (where the phone allows it).
  async function keepAwake() {
    if (!live() || !('wakeLock' in navigator) || wakeLock || asking) return;
    asking = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!live()) { lock.release().catch(() => {}); return; }
      wakeLock = lock;
      lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
    } catch (e) {
      /* not allowed yet (iPhone needs a tap first): fine */
    } finally {
      asking = false;
    }
  }
  function letSleep() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }

  /* ---------- screens ---------- */
  function render() {
    if (!root) return;
    frozen = Date.now();
    try { draw(); } finally { frozen = null; }
  }
  function draw() {
    if (!live() && !squad.length) screen = 'squad';   // stays on the squad until they tap Done
    if (live()) root.innerHTML = gameHTML();
    else if (screen === 'squad') root.innerHTML = squadHTML();
    else if (game && game.finished && screen !== 'setup') root.innerHTML = summaryHTML();
    else root.innerHTML = setupHTML();
  }

  const dot = p => `<i class="gd-dot" style="background:${colourOf(p)}" aria-hidden="true"></i>`;
  const nameHTML = p => `${esc(p.name)}${p.num ? ` <small>#${esc(p.num)}</small>` : ''}`;

  const intro = `
    <h1 class="gd-title">Game day</h1>
    <p class="lead">Keeps track of subs and minutes during a game, so every girl gets a fair go.</p>`;

  function squadHTML() {
    return `${intro}
      <div class="card gd-card">
        <h2 class="gd-h">Your squad</h2>
        <p class="small">First names, and jersey numbers if you like. Saved on this phone only, never sent anywhere.</p>
        ${squad.length ? `<ul class="gd-squad">${squad.map(p => `
          <li><span class="gd-name">${dot(p)}${nameHTML(p)}</span>
            <button type="button" class="gd-x" data-gd="remove" data-id="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">✕</button></li>`).join('')}</ul>` : ''}
        ${squad.length < MAX_SQUAD ? `
          <form class="gd-add" data-gd-form="squad">
            <label class="gd-field">First name<input id="gdName" name="first" maxlength="20" autocomplete="off" required></label>
            <label class="gd-field gd-field-num">Number<input id="gdNum" name="num" inputmode="numeric" maxlength="2" autocomplete="off"></label>
            <button type="submit" class="btn btn-ghost">Add</button>
          </form>` : '<p class="small">That\'s the most the squad can hold (15).</p>'}
        ${squad.length ? '<button type="button" class="btn btn-big btn-primary" data-gd="squad-done">Done</button>' : ''}
        ${squad.length ? '<button type="button" class="btn btn-link" data-gd="clear-squad">Clear the squad</button>' : ''}
      </div>`;
  }

  // Keeps the starting five sensible as girls are ticked in and out.
  function tidyStarters() {
    setup.starters = setup.starters.filter(id => setup.here.includes(id));
    const want = Math.min(COURT, setup.here.length);
    const spare = setup.here.filter(id => !setup.starters.includes(id));
    while (setup.starters.length < want && spare.length) setup.starters.push(spare.splice(Math.floor(Math.random() * spare.length), 1)[0]);
    setup.starters = setup.starters.slice(0, want);
  }
  function freshSetup() {
    const ids = squad.map(p => p.id);
    const last = (prefs.here || []).filter(id => ids.includes(id));
    setup = { here: last.length ? last : ids.slice(), starters: [], other: !LENGTHS.some(([n, m]) => n === prefs.periods && m === prefs.mins) };
    tidyStarters();
  }

  const minutesText = m => (Number.isInteger(m) ? `${m} minutes` : Number.isInteger(m * 2) ? `${Math.floor(m)}½ minutes` : `${Math.floor(m)} min ${Math.round((m % 1) * 60)} sec`);

  function subPlanText() {
    const n = stintsPer(prefs.mins, prefs.subEvery);
    const each = prefs.periods === 2 ? 'half' : 'quarter';
    const breaks = prefs.periods === 2 ? 'half time' : 'each break';
    if (n === 1) return `Subs at ${breaks} only.`;
    return `Subs every ${minutesText(prefs.mins / n)}: ${n - 1} in each ${each}, plus ${breaks}.`;
  }

  // Whether the chosen interval splits the time evenly for the girls who are
  // here (5 on court, so the turns must share out exactly), and if not, the
  // nearest interval that would.
  function evennessHTML() {
    const n = setup.here.length;
    if (n <= COURT) return '<p class="gd-even is-ok">Everyone\'s on court the whole game.</p>';
    const turns = e => prefs.periods * stintsPer(prefs.mins, e) * COURT;
    if (turns(prefs.subEvery) % n === 0) {
      const each = Math.round(prefs.periods * prefs.mins * COURT / n * 10) / 10;
      return `<p class="gd-even is-ok">✓ With ${n} girls, everyone gets the same time: ${each} minutes each.</p>`;
    }
    const better = [];
    for (let e = EVERY_MIN; e <= EVERY_MAX; e++) if (turns(e) % n === 0) better.push(e);
    better.sort((a, b) => Math.abs(a - prefs.subEvery) - Math.abs(b - prefs.subEvery) || a - b);
    const extra = minutesText(prefs.mins / stintsPer(prefs.mins, prefs.subEvery));
    return `<div class="gd-even">
      <p>With ${n} girls this doesn't share out exactly: some girls will get one more turn than others (${extra}).</p>
      ${better.length ? `<button type="button" class="btn btn-ghost" data-gd="every-set" data-e="${better[0]}">Sub every ${better[0]} min instead (even time)</button>` : ''}
    </div>`;
  }

  function setupHTML() {
    if (!setup) freshSetup();
    const want = Math.min(COURT, setup.here.length);
    const chip = (p, on, action) => `<button type="button" class="gd-chip" data-gd="${action}" data-id="${esc(p.id)}" aria-pressed="${on}">${dot(p)}${nameHTML(p)}</button>`;
    return `${intro}
      <div class="card gd-card">
        <h2 class="gd-h">Who's here?</h2>
        <div class="gd-chips">${squad.map(p => chip(p, setup.here.includes(p.id), 'here')).join('')}</div>
        <button type="button" class="btn btn-link" data-gd="edit-squad">Edit the squad</button>
      </div>
      <div class="card gd-card">
        <h2 class="gd-h">Game length</h2>
        <div class="gd-seg" role="group" aria-label="Game length">
          ${LENGTHS.map(([n, m]) => `<button type="button" data-gd="length" data-n="${n}" data-m="${m}" aria-pressed="${!setup.other && prefs.periods === n && prefs.mins === m}">${n} × ${m}</button>`).join('')}
          <button type="button" data-gd="length-other" aria-pressed="${setup.other}">Other</button>
        </div>
        ${setup.other ? `
          <div class="gd-other">
            <div class="gd-seg" role="group" aria-label="Quarters or halves">
              <button type="button" data-gd="periods" data-n="4" aria-pressed="${prefs.periods === 4}">4 quarters</button>
              <button type="button" data-gd="periods" data-n="2" aria-pressed="${prefs.periods === 2}">2 halves</button>
            </div>
            <label class="gd-field">Minutes each<input id="gdMins" type="number" inputmode="numeric" min="2" max="30" value="${prefs.mins}"></label>
          </div>` : ''}
        <p class="small">${prefs.periods} ${prefs.periods === 2 ? 'halves' : 'quarters'} of ${prefs.mins} minutes.</p>
      </div>
      <div class="card gd-card">
        <h2 class="gd-h">Subs</h2>
        <div class="gd-seg" role="group" aria-label="How subs work">
          <button type="button" data-gd="mode" data-mode="even" aria-pressed="${prefs.mode === 'even'}">Even split</button>
          <button type="button" data-gd="mode" data-mode="manual" aria-pressed="${prefs.mode === 'manual'}">Manual</button>
        </div>
        ${prefs.mode === 'even' ? `
          <div class="gd-every">
            <span>Sub about every</span>
            <button type="button" class="gd-step" data-gd="every" data-d="-1" aria-label="Sub more often" ${prefs.subEvery <= EVERY_MIN ? 'disabled' : ''}>−</button>
            <b>${prefs.subEvery} min</b>
            <button type="button" class="gd-step" data-gd="every" data-d="1" aria-label="Sub less often" ${prefs.subEvery >= EVERY_MAX ? 'disabled' : ''}>+</button>
          </div>
          <p class="small">${subPlanText()} The app says who goes on and off.</p>
          ${evennessHTML()}`
          : '<p class="small">You choose who goes on and off. The app counts everyone\'s minutes.</p>'}
      </div>
      <div class="card gd-card">
        <h2 class="gd-h">Starting five <span class="gd-count">${setup.starters.length} of ${want}</span></h2>
        <div class="gd-chips">${squad.filter(p => setup.here.includes(p.id)).map(p => chip(p, setup.starters.includes(p.id), 'starter')).join('')}</div>
        <p class="small">${prefs.mode === 'even' ? 'Picked for you. Tap to change.' : 'Tap to choose.'}</p>
      </div>
      <button type="button" class="btn btn-big btn-go" data-gd="start" ${setup.here.length && setup.starters.length === want ? '' : 'disabled'}>▶ Start game</button>
      <p class="small gd-center">Tap it at the tip-off.</p>
      ${game && game.finished ? `<details class="card gd-card gd-last"><summary>Last game's minutes</summary>${minutesList()}</details>` : ''}`;
  }

  function minutesList() {
    const rows = game.players.slice().sort((a, b) => (game.played[b.id] || 0) - (game.played[a.id] || 0));
    return `<ol class="gd-summary">${rows.map(p => `<li style="--pc:${colourOf(p)}"><span>${nameHTML(p)}</span><b>${Math.round((game.played[p.id] || 0) / 60)} min</b></li>`).join('')}</ol>`;
  }

  function summaryHTML() {
    return `
      <h1 class="gd-title">Game over</h1>
      <p class="lead">Everyone's minutes on court:</p>
      <div class="card gd-card">${minutesList()}</div>
      <button type="button" class="btn btn-big btn-primary" data-gd="new-game">New game</button>`;
  }

  // Each girl's row is her colour, so she's easy to spot. Tap it to sub her.
  function rowHTML(p, where) {
    const style = `--pc:${colourOf(p)}`;
    const mins = `<span class="gd-mins" data-min="${esc(p.id)}">${fmt(playedNow(p.id))}</span>`;
    if (where === 'out') {
      return `
        <li class="gd-row is-out" style="${style}">
          <span class="gd-who"><span class="gd-name">${nameHTML(p)}</span>${mins}</span>
          <button type="button" class="gd-back" data-gd="back" data-id="${esc(p.id)}">Back in</button>
        </li>`;
    }
    const on = picked === p.id;
    return `
      <li class="gd-row${on ? ' is-picked' : ''}" style="${style}">
        <button type="button" class="gd-who" data-gd="tap" data-id="${esc(p.id)}" aria-pressed="${on}">
          <span class="gd-name">${nameHTML(p)}</span>
          ${mins}
          <span class="gd-sub" aria-hidden="true">${on ? 'Picked' : 'Sub'}</span>
        </button>
      </li>`;
  }

  function dueHTML() {
    const d = game.due;
    if (!d) return '';
    const names = ids => ids.map(id => `<button type="button" class="gd-due-name" style="--pc:${colourOf(player(id))}" data-gd="due-tap" data-id="${esc(id)}">${esc(player(id).name)}</button>`).join('') || '<span class="gd-due-none">nobody</span>';
    return `
      <div class="gd-due">
        <p class="gd-due-title">Subs due</p>
        <div class="gd-due-cols">
          <div><p class="gd-due-label">Off</p>${names(d.off)}</div>
          <p class="gd-due-arrow" aria-hidden="true">→</p>
          <div><p class="gd-due-label">On</p>${names(d.on)}</div>
        </div>
        <p class="gd-due-help">${game.atBreak ? `Swap them now, before the next ${periodWord(game).toLowerCase()} starts.` : 'Swap them at the next whistle.'} Tap a name to pick someone else.</p>
        <button type="button" class="btn btn-big gd-done" data-gd="done">Done: they've swapped</button>
      </div>`;
  }

  function gameHTML() {
    const court = game.onCourt.map(player);
    const bench = here().filter(p => !game.onCourt.includes(p.id));
    const out = game.players.filter(p => p.out);
    const empty = Math.min(COURT, here().length) - court.length;
    const squadLeft = squad.filter(p => !game.players.some(x => x.id === p.id));   // anyone hurt or resting is listed already
    const p1 = picked && player(picked);
    const hint = p1 ? `${game.onCourt.includes(picked) ? 'Now tap the girl coming on' : 'Now tap the girl she replaces'} (or ${esc(p1.name)} again to cancel).`
      : empty > 0 ? 'Tap a girl on the bench to fill the empty spot.'
      : game.mode === 'even' ? 'Sub any time: tap a girl on the bench, then the girl she replaces.'
      : 'To sub, tap a girl on the bench, then the girl she replaces.';
    return `
      <div class="card gd-clock-card">
        <p class="eyebrow">${periodName(game, game.period)} of ${game.periods}${game.atBreak ? ' · finished' : ''}</p>
        <button type="button" class="gd-clock${game.running ? '' : ' is-paused'}" id="gdClock" data-gd="adjust-toggle" aria-label="Time left in the ${periodWord(game).toLowerCase()}. Tap to adjust">${fmt(game.periodSecs - periodSecsDone())}</button>
        <p class="gd-next" id="gdNext">${nextText()}</p>
        ${adjusting && !game.atBreak ? `<div class="gd-adjust" role="group" aria-label="Adjust the timer">
          ${[-30, -10, 10, 30].map(s => `<button type="button" data-gd="adjust" data-s="${s}">${s > 0 ? '+' : '−'}${Math.abs(s)}s</button>`).join('')}</div>` : ''}
        <button type="button" class="btn btn-big ${game.running ? 'gd-pause' : 'btn-go'}" data-gd="startstop">${
          game.atBreak ? `▶ Start ${periodName(game, game.period + 1).toLowerCase()}` : game.running ? '❚❚ Pause' : '▶ Resume'}</button>
      </div>
      ${dueHTML()}
      ${hint ? `<p class="gd-hint">${hint}</p>` : ''}
      <h2 class="gd-list-title">On court</h2>
      <ul class="gd-list">${court.map(p => rowHTML(p, 'court')).join('')}${empty > 0 ? '<li class="gd-row gd-empty">Empty spot</li>'.repeat(empty) : ''}</ul>
      <h2 class="gd-list-title">Bench</h2>
      <ul class="gd-list">${bench.length ? bench.map(p => rowHTML(p, 'bench')).join('') : '<li class="gd-row gd-empty">Nobody</li>'}</ul>
      ${out.length ? `<h2 class="gd-list-title">Hurt or resting</h2><ul class="gd-list">${out.map(p => rowHTML(p, 'out')).join('')}</ul>` : ''}
      <div class="card gd-card gd-tools">
        <div class="gd-seg" role="group" aria-label="How subs work">
          <button type="button" data-gd="mode" data-mode="even" aria-pressed="${game.mode === 'even'}">Even split</button>
          <button type="button" data-gd="mode" data-mode="manual" aria-pressed="${game.mode === 'manual'}">Manual</button>
        </div>
        <button type="button" class="btn btn-ghost" data-gd="add-toggle" aria-expanded="${adding}">＋ A girl arrived late</button>
        ${adding ? `<div class="gd-arrivals">
          ${squadLeft.length ? `<div class="gd-chips">${squadLeft.map(p => `<button type="button" class="gd-chip" data-gd="arrive" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>` : ''}
          <form class="gd-add" data-gd-form="arrive">
            <label class="gd-field">New girl<input id="gdName" name="first" maxlength="20" autocomplete="off" required></label>
            <label class="gd-field gd-field-num">Number<input id="gdNum" name="num" inputmode="numeric" maxlength="2" autocomplete="off"></label>
            <button type="submit" class="btn btn-ghost">Add</button>
          </form></div>` : ''}
        <button type="button" class="btn btn-ghost" data-gd="rest-toggle" aria-expanded="${resting}">A girl is hurt or resting</button>
        ${resting ? `<div class="gd-chips">${here().map(p => `<button type="button" class="gd-chip" data-gd="rest" data-id="${esc(p.id)}">${dot(p)}${nameHTML(p)}</button>`).join('')}</div>` : ''}
        <button type="button" class="btn btn-link" data-gd="end">End the game</button>
      </div>`;
  }

  function nextText() {
    if (game.atBreak) return game.period + 1 === game.periods ? 'Last one to go' : 'Break';
    if (game.mode !== 'even' || here().length <= COURT) return game.mode === 'even' ? 'Everyone\'s on: no subs needed' : '';
    if (game.due) return 'Subs due now';
    const left = game.nextSubAt == null ? game.periodSecs - periodSecsDone() : game.nextSubAt - periodSecsDone();
    return `Next subs in ${fmt(left)}`;
  }

  // Four times a second: just the numbers that change (all from the same second of the clock).
  function updateLive() {
    if (!root || !live() || root.closest('[hidden]')) return;
    frozen = Date.now();
    try { drawLive(); } finally { frozen = null; }
  }
  function drawLive() {
    const clock = $('#gdClock');
    if (!clock) return;
    clock.textContent = fmt(game.periodSecs - periodSecsDone());
    $('#gdNext').textContent = nextText();
    root.querySelectorAll('[data-min]').forEach(n => { n.textContent = fmt(playedNow(n.dataset.min)); });
  }

  /* ---------- taps ---------- */
  function onClick(e) {
    const b = e.target.closest('[data-gd]');
    if (!b || b.disabled) return;
    const id = b.dataset.id;
    if (live()) keepAwake();
    switch (b.dataset.gd) {
      case 'remove': squad = squad.filter(p => p.id !== id); saveSquad(); setup = null; break;
      case 'clear-squad':
        if (!window.confirm('Clear the squad?\n\nAll the names on this phone will be removed.')) return;
        squad = []; saveSquad(); setup = null; prefs.here = null; savePrefs(); break;
      case 'squad-done': screen = 'setup'; setup = null; break;
      case 'edit-squad': screen = 'squad'; break;
      case 'here':
        setup.here = setup.here.includes(id) ? setup.here.filter(x => x !== id) : squad.map(p => p.id).filter(x => x === id || setup.here.includes(x));
        tidyStarters(); break;
      case 'starter': {
        const want = Math.min(COURT, setup.here.length);
        if (setup.starters.includes(id)) setup.starters = setup.starters.filter(x => x !== id);
        else if (setup.starters.length < want) setup.starters.push(id);
        break;
      }
      case 'length': prefs.periods = +b.dataset.n; prefs.mins = +b.dataset.m; setup.other = false; savePrefs(); break;
      case 'length-other': setup.other = true; break;
      case 'periods': prefs.periods = +b.dataset.n; savePrefs(); break;
      case 'every-set': prefs.subEvery = +b.dataset.e; savePrefs(); break;
      case 'every': prefs.subEvery = Math.min(EVERY_MAX, Math.max(EVERY_MIN, (prefs.subEvery || SUB_EVERY) + +b.dataset.d)); savePrefs(); break;
      case 'mode':
        if (live()) setMode(b.dataset.mode);
        else { prefs.mode = b.dataset.mode; savePrefs(); }
        break;
      case 'start': startGame(); break;
      case 'new-game': screen = 'setup'; setup = null; break;
      case 'startstop': startStop(); break;
      case 'adjust-toggle': adjusting = !adjusting; break;
      case 'adjust': adjust(+b.dataset.s); break;
      case 'done': doneSubs(); break;
      case 'due-tap': changeDue(id); break;
      case 'tap': tapPlayer(id); break;
      case 'rest-toggle': resting = !resting; adding = false; break;
      case 'rest': setOut(id, true); resting = false; break;
      case 'back': setOut(id, false); break;
      case 'add-toggle': adding = !adding; resting = false; break;
      case 'arrive': addPlayer(squad.find(p => p.id === id)); adding = false; break;
      case 'end':
        if (!window.confirm('End the game now?\n\nYou\'ll see everyone\'s minutes.')) return;
        finish(); break;
      default: return;
    }
    save();
    render();
    // a new screen starts at the top (the clock, once the game's on)
    if (['start', 'squad-done', 'edit-squad', 'new-game', 'end'].includes(b.dataset.gd)) window.scrollTo(0, 0);
  }

  function onSubmit(e) {
    const form = e.target.closest('[data-gd-form]');
    if (!form) return;
    e.preventDefault();
    const p = addToSquad(form.elements.namedItem('first').value, form.elements.namedItem('num').value);
    if (!p) return;
    if (form.dataset.gdForm === 'arrive' && live()) { addPlayer(p); adding = false; save(); }
    setup = null;
    render();
    if (form.dataset.gdForm === 'squad') { const n = $('#gdName'); if (n) n.focus(); }
  }

  function onChange(e) {
    if (e.target.id !== 'gdMins') return;
    const m = Math.round(+e.target.value);
    if (m >= 2 && m <= 30) { prefs.mins = m; savePrefs(); }
    render();
  }

  return {
    // `el`: where the screens go. Picks up a game left running if the page reloaded.
    init(el) {
      root = el;
      root.addEventListener('click', onClick);
      root.addEventListener('submit', onSubmit);
      root.addEventListener('change', onChange);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && live()) { keepAwake(); tick(); }
      });
      if (live()) { startTicking(); tick(); }
      render();
    },
    // The tab was opened.
    show() { if (live()) keepAwake(); render(); },
  };
})();
