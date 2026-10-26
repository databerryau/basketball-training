/* =========================================================
   Easy Basketball Training: generator, plan view, run mode
   ========================================================= */
(() => {
  // Five short skill drills keep the players interested, with a quick drink
  // after every two (the huddle starts with one too), then a short team game.
  const SLOTS = [
    { key: 'warmup', label: 'Warm-up game', min: 6, icon: '🔥' },
    { key: 'skill1', label: 'Skill 1', min: 7, icon: '⭐' },
    { key: 'skill2', label: 'Skill 2', min: 7, icon: '⭐' },
    { key: 'water1', label: 'Drink break', min: 1, icon: '💧', water: true },
    { key: 'skill3', label: 'Skill 3', min: 7, icon: '⭐' },
    { key: 'skill4', label: 'Skill 4', min: 7, icon: '⭐' },
    { key: 'water2', label: 'Drink break', min: 1, icon: '💧', water: true },
    { key: 'skill5', label: 'Skill 5', min: 7, icon: '⭐' },
    { key: 'game',   label: 'Team game', min: 12, icon: '🏀' },
    { key: 'huddle', label: 'Huddle', min: 5, icon: '🙌' },
  ];
  const SKILL_SLOTS = ['skill1', 'skill2', 'skill3', 'skill4', 'skill5'];
  const DRILL_SLOTS = ['warmup', ...SKILL_SLOTS, 'game'];
  const byId = Object.fromEntries(DRILLS.map(d => [d.id, d]));
  const KEY_SESSION = 'ebt.session.v1';
  const KEY_HISTORY = 'ebt.history.v1';
  const KEY_RUN = 'ebt.run.v1';
  // A run nobody has touched for this long is over (they went home without tapping Finish).
  const RUN_STALE_MS = 2 * 60 * 60 * 1000;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- storage (optional: the page works without it) ---------- */
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* private mode */ } },
  };

  /* ---------- generator ---------- */
  // Skills 1 and 5 are today's focus (two different drills). Skills 2–4
  // cover the other three skills, one each, so every session works on all
  // four; Skill 2 is shooting or layups whenever that isn't the focus.
  // `s` is the session so far.
  function themesFor(slot, s) {
    if (slot === 'skill1' || slot === 'skill5') return [s.focus];
    if (slot === 'skill2' && s.focus !== 'score') return ['score'];
    const themeOf = k => byId[s.slots[k]] && byId[s.slots[k]].theme;
    const taken = ['skill2', 'skill3', 'skill4'].filter(k => k !== slot).map(themeOf);
    const others = FOCUS_ORDER.filter(t => t !== s.focus);
    const themes = others.filter(t => !taken.includes(t) && (slot === 'skill2' || s.focus === 'score' || t !== 'score'));
    // Never come up empty, even if the other slots don't follow the rules.
    return themes.length ? themes : others;
  }

  function poolFor(slot, s) {
    if (slot === 'warmup' || slot === 'game') return DRILLS.filter(d => d.slot === slot);
    const themes = themesFor(slot, s);
    return DRILLS.filter(d => d.slot === 'skill' && themes.includes(d.theme));
  }

  // A random drill from `pool`: never one already in this session (`taken`),
  // and not a recent one (`avoid`) if there's another choice.
  function pickFrom(pool, avoid, taken = []) {
    const open = pool.filter(d => !taken.includes(d.id));
    const fresh = open.filter(d => !avoid.includes(d.id));
    return rand(fresh.length ? fresh : open.length ? open : pool);
  }

  const nextFocus = focus => FOCUS_ORDER[(FOCUS_ORDER.indexOf(focus) + 1) % FOCUS_ORDER.length];

  // `prev` is the session being replaced. The focus only moves on once a
  // session has actually been run; replacing one that wasn't keeps its
  // focus and just picks different drills. `chosen` is a focus the coach
  // picked instead.
  function generate(prev, chosen) {
    const hist = store.get(KEY_HISTORY) || {};
    const keep = prev && !prev.used && THEMES[prev.focus];
    const last = prev && prev.used ? prev.focus : hist.lastFocus;
    const focus = THEMES[chosen] ? chosen : keep ? prev.focus : nextFocus(last);
    const lastRun = hist.recent || [];
    const recent = lastRun.concat(prev ? Object.values(prev.slots) : []);
    const s = { v: 1, created: Date.now(), focus, slots: {}, seen: {} };
    ['warmup', ...SKILL_SLOTS].forEach(k => { s.slots[k] = pickFrom(poolFor(k, s), recent, Object.values(s.slots)).id; });
    // A team game that works on today's focus, avoiding the one from the
    // last session that was run where there's another.
    const games = poolFor('game', s);
    const matched = games.filter(g => g.theme === focus && !lastRun.includes(g.id));
    const freshMatched = matched.filter(g => !recent.includes(g.id));
    s.slots.game = (freshMatched.length ? rand(freshMatched) : matched.length ? rand(matched) : pickFrom(games, recent)).id;
    DRILL_SLOTS.forEach(k => { s.seen[k] = [s.slots[k]]; });
    return s;
  }

  // Replaces one drill with another that fits the same slot, cycling
  // through every option before repeating.
  function swap(s, slot) {
    const pool = poolFor(slot, s);
    const inUse = Object.values(s.slots);
    let seen = s.seen[slot] || [];
    let options = pool.filter(d => !seen.includes(d.id) && !inUse.includes(d.id));
    if (!options.length) {
      seen = [s.slots[slot]];
      options = pool.filter(d => !inUse.includes(d.id));
    }
    if (!options.length) return;
    const next = rand(options);
    s.slots[slot] = next.id;
    s.seen[slot] = seen.concat(next.id);
  }

  // History (what the next session moves on from) only follows sessions
  // that were run.
  function save(s) {
    store.set(KEY_SESSION, s);
    if (s.used) store.set(KEY_HISTORY, { lastFocus: s.focus, recent: Object.values(s.slots) });
  }

  // Called when the coach starts the timer or reaches the end of the session.
  function markUsed() {
    if (session.used) return;
    session.used = true;
    session.usedAt = Date.now();
    save(session);
  }

  // Some coaches only read the plan and never use Start session. A session
  // made a couple of days ago was most likely used at training, so count it,
  // or their focus would never move on.
  const USED_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
  const wasRun = s => s.used || Date.now() - s.created >= USED_AFTER_MS;

  function load() {
    const s = store.get(KEY_SESSION);
    if (!s || s.v !== 1 || !THEMES[s.focus] || !s.slots || typeof s.slots !== 'object') return null;
    try {
      s.seen = s.seen && typeof s.seen === 'object' ? s.seen : {};
      // Sessions saved by older versions had fewer skill slots, picked by
      // different rules. Clear any drill that doesn't fit its slot now, or
      // is already in an earlier slot (in order, so each is judged against
      // the ones before it)...
      let fixed = false;
      const fits = (k, d) => (SKILL_SLOTS.includes(k) ? d.slot === 'skill' && themesFor(k, s).includes(d.theme) : d.slot === k);
      DRILL_SLOTS.forEach((k, i) => {
        const d = byId[s.slots[k]];
        const earlier = DRILL_SLOTS.slice(0, i).map(j => s.slots[j]);
        if (d && (!fits(k, d) || earlier.includes(d.id))) { delete s.slots[k]; fixed = true; }
      });
      // ...then fill every part that's missing (or a drill that's been removed).
      DRILL_SLOTS.forEach(k => {
        if (!byId[s.slots[k]]) { s.slots[k] = pickFrom(poolFor(k, s), [], Object.values(s.slots)).id; fixed = true; }
      });
      if (fixed) save(s);
      return s;
    } catch (e) {
      return null;   // a saved session we can't make sense of: start fresh rather than break the page
    }
  }

  /* ---------- shared bits ---------- */
  function needList(s) {
    const drills = DRILL_SLOTS.map(k => byId[s.slots[k]]);
    const items = [];
    if (drills.some(d => d.need.balls === 'each')) items.push('🏀 A ball for each player');
    else if (drills.some(d => d.need.balls)) items.push('🏀 Some balls');
    const cones = Math.max(0, ...drills.map(d => d.need.cones || 0));
    if (cones) items.push(`🔶 ${cones} cones`);
    if (drills.some(d => d.need.bibs)) items.push('🎽 Bibs (2 colours)');
    items.push('📣 Whistle', '💧 Water bottles', '🩹 First-aid kit');
    return items;
  }

  function needLine(d) {
    const n = [];
    if (d.need.balls === 'each') n.push('a ball each');
    else if (d.need.balls) n.push('some balls');
    if (d.need.cones) n.push(`${d.need.cones} cone${d.need.cones > 1 ? 's' : ''}`);
    if (d.need.bibs) n.push('bibs');
    return n.length ? n.join(' · ') : 'nothing! Just space';
  }

  // The diagram adds what each colour means.
  const diagramLabel = d => `Animated diagram of ${d.name}`;

  // HTML for one part of the session. `opts.big` = run-mode sizing.
  function partHTML(s, slot, opts = {}) {
    if (slot.water) {
      // A quick drink: say what's next and set it out while they drink.
      const nextSlot = SLOTS.slice(SLOTS.indexOf(slot) + 1).find(x => DRILL_SLOTS.includes(x.key));
      const next = nextSlot && byId[s.slots[nextSlot.key]];
      return `
        <div class="water">
          <p class="water-emoji" aria-hidden="true">💧</p>
          <p class="lead">Quick drink! Everyone gets water.</p>
          <ul class="tips">
            <li>Count heads. Is everyone OK?</li>
            ${next ? `<li>Next up: <b>${esc(next.name)}</b>. Tell them while they drink.</li>
            <li>Set out: ${esc(needLine(next))}.</li>` : ''}
          </ul>
        </div>`;
    }
    if (slot.key === 'huddle') {
      const h = HUDDLE.byTheme[s.focus];
      return `
        <div class="diagram" data-anim="huddle"></div>
        <div class="callout">
          <p class="callout-label">Today's question</p>
          <p class="callout-q">"${esc(h.q)}"</p>
          <p class="callout-a"><b>Answer:</b> ${esc(h.a)}</p>
        </div>
        <div class="callout callout-home">
          <p class="callout-label">Home challenge</p>
          <p>${esc(h.home)}</p>
        </div>
        <h4 class="sub">How it works</h4>
        <ol class="steps">${HUDDLE.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>`;
    }
    const d = byId[s.slots[slot.key]];
    const cues = `
      <h4 class="sub">What to say</h4>
      <ul class="cues">${d.say.map(c => `<li>“${esc(c)}”</li>`).join('')}</ul>`;
    const steps = `
      <h4 class="sub">How it works</h4>
      <ol class="steps">${d.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>`;
    return `
      <div class="diagram" data-anim="${esc(d.id)}"></div>
      ${opts.big ? cues + steps : steps + cues}
      <p class="need-line"><b>You need:</b> ${esc(needLine(d))}</p>
      <button type="button" class="btn btn-swap" data-swap="${slot.key}">↻ Swap for a different drill</button>`;
  }

  function mountDiagrams(root, list) {
    root.querySelectorAll('[data-anim]').forEach(host => {
      const id = host.dataset.anim;
      const d = id === 'huddle' ? HUDDLE : byId[id];
      list.push(Court.create(host, d.anim, { label: diagramLabel(d) }));
    });
  }

  /* ---------- plan view ---------- */
  let session = load();
  const planDiagrams = {};
  const openParts = new Set(['warmup']);

  function partTitle(slot) {
    if (slot.water) return 'Drink break';
    if (slot.key === 'huddle') return HUDDLE.name;
    return byId[session.slots[slot.key]].name;
  }

  // The focus normally just rotates. This lets the coach pick another one
  // for a week when the team needs it; it stays closed until asked for.
  function focusChoiceHTML(themes, label) {
    return `
      <button type="button" class="btn btn-link" data-action="choose-focus" aria-expanded="false" aria-controls="focusChoice">${esc(label)}</button>
      <div class="focus-choice" id="focusChoice" hidden>
        <p class="small">Pick what the team needs most. You'll get a new plan.</p>
        ${themes.map(t => `
          <button type="button" class="btn btn-choice" data-focus="${t}">
            <span class="choice-name"><span aria-hidden="true">${THEMES[t].icon}</span> ${esc(THEMES[t].name)}</span>
            <span class="choice-fixes">Fixes: ${esc(THEMES[t].fixes.toLowerCase())}</span>
          </button>`).join('')}
      </div>`;
  }

  function renderPlan() {
    const root = $('#session');
    Object.keys(planDiagrams).forEach(k => { planDiagrams[k].forEach(c => c.destroy()); delete planDiagrams[k]; });

    if (!session) {
      root.innerHTML = `
        <div class="card hero-card">
          <p class="hero-ball" aria-hidden="true">🏀</p>
          <h1>Ready for training?</h1>
          <p class="lead">One tap gives you a full <b>60-minute session</b>, with every drill explained and animated.</p>
          <button type="button" class="btn btn-big btn-primary" data-action="generate">Make today's session</button>
          <ol class="how">
            <li><b>Tap the orange button.</b> You get a 60-minute plan in ${SLOTS.length} parts.</li>
            <li><b>Have a look at home.</b> Tap any drill to see how it works.</li>
            <li><b>At the court, tap “Start session”</b> and follow the timer.</li>
          </ol>
        </div>
        <div id="homeTip">${homeTipHTML()}</div>`;
      return;
    }

    const theme = THEMES[session.focus];
    const day = t => new Date(t).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    const made = day(session.created);
    const resume = run && !run.finished;
    // Once a session has been run it's the last session, not today's: lead
    // with making the next one, so nobody runs last week's plan by mistake.
    const done = session.used && !resume;
    let card;
    if (done) {
      const ranAt = session.usedAt || session.created;
      const today = new Date(ranAt).toDateString() === new Date().toDateString();
      const next = THEMES[nextFocus(session.focus)];
      card = `
        <p class="eyebrow">Last session</p>
        <h1><span aria-hidden="true">${theme.icon}</span> ${esc(theme.name)}</h1>
        <p class="fixes">You ran this ${today ? 'today' : `on ${esc(day(ranAt))}`}.</p>
        <button type="button" class="btn btn-big btn-primary" data-action="generate">${today ? 'Make the next session' : 'Make today\'s session'}</button>
        <p class="next-focus">Next focus: <b><span aria-hidden="true">${next.icon}</span> ${esc(next.name)}</b></p>
        ${focusChoiceHTML(FOCUS_ORDER.filter(t => t !== nextFocus(session.focus)), 'Work on something else?')}
        <button type="button" class="btn btn-link" data-action="run">▶ Run this session again</button>`;
    } else {
      card = `
        <p class="eyebrow">Today's focus</p>
        <h1><span aria-hidden="true">${theme.icon}</span> ${esc(theme.name)}</h1>
        <p class="fixes">Fixes: <b>${esc(theme.fixes.toLowerCase())}</b></p>
        <div class="need">
          <p class="need-title">You'll need</p>
          <ul>${needList(session).map(n => `<li>${esc(n)}</li>`).join('')}</ul>
        </div>
        <button type="button" class="btn btn-big btn-go" data-action="run">${resume ? `▶ Back to the session (part ${run.i + 1} of ${SLOTS.length})` : '▶ Start session'}</button>
        ${resume ? '<button type="button" class="btn btn-link" data-action="run-restart">Start again from the beginning</button>'
          : focusChoiceHTML(FOCUS_ORDER.filter(t => t !== session.focus), 'Work on something else this week?')}`;
    }
    let clock = 0;
    root.innerHTML = `
      <div class="card focus-card">${card}</div>
      <h2 class="plan-title">The plan <span>60 minutes</span></h2>
      <ol class="plan">
        ${SLOTS.map((slot, i) => {
          const from = clock; clock += slot.min;
          const open = openParts.has(slot.key);
          return `
            <li class="part part-${slot.key}${open ? ' is-open' : ''}" data-part="${slot.key}">
              <button type="button" class="part-head" aria-expanded="${open}" aria-controls="body-${slot.key}">
                <span class="part-num" aria-hidden="true">${i + 1}</span>
                <span class="part-text">
                  <span class="part-slot">${slot.icon} ${esc(slot.label)} · ${slot.min} min</span>
                  <span class="part-name">${esc(partTitle(slot))}</span>
                </span>
                <span class="part-time" aria-hidden="true">${from}–${clock}</span>
                <span class="chev" aria-hidden="true"></span>
              </button>
              <div class="part-body" id="body-${slot.key}" ${open ? '' : 'hidden'}>${open ? partHTML(session, slot) : ''}</div>
            </li>`;
        }).join('')}
      </ol>
      <div class="plan-foot">
        ${done ? '' : '<button type="button" class="btn btn-ghost" data-action="generate">↻ Make a new session</button>'}
        <p class="small">Made ${esc(made)}. Saved on this phone.</p>
        <div id="homeTip">${homeTipHTML()}</div>
      </div>`;

    SLOTS.forEach(slot => {
      if (!openParts.has(slot.key)) return;
      planDiagrams[slot.key] = [];
      mountDiagrams($(`#body-${slot.key}`), planDiagrams[slot.key]);
    });
  }

  function togglePart(key) {
    const li = $(`.part[data-part="${key}"]`);
    const body = $(`#body-${key}`);
    const head = $('.part-head', li);
    const slot = SLOTS.find(s => s.key === key);
    if (openParts.has(key)) {
      openParts.delete(key);
      (planDiagrams[key] || []).forEach(c => c.destroy());
      delete planDiagrams[key];
      body.hidden = true;
      body.innerHTML = '';
    } else {
      openParts.add(key);
      body.innerHTML = partHTML(session, slot);
      body.hidden = false;
      planDiagrams[key] = [];
      mountDiagrams(body, planDiagrams[key]);
    }
    li.classList.toggle('is-open', openParts.has(key));
    head.setAttribute('aria-expanded', openParts.has(key));
  }

  // `chosen`: a focus the coach picked. Picking one is already a clear
  // choice, and so is replacing a session that's been run and finished,
  // so neither asks "Are you sure?".
  function newSession(chosen) {
    const inProgress = run && !run.finished;
    const ask = !session || (!inProgress && (chosen || session.used)) ? ''
      : wasRun(session) ? 'Make a new session?\n\nThis one will be replaced, and the focus moves on to the next skill.'
      : 'Make a new session?\n\nYou\'ll get different drills with the same focus. The focus moves on once you\'ve used ▶ Start session.';
    if (ask && !window.confirm(ask)) return;
    if (session && !session.used && wasRun(session)) { session.used = true; save(session); }
    session = generate(session, chosen);
    save(session);
    run = null;
    store.del(KEY_RUN);
    openParts.clear();
    openParts.add('warmup');
    renderPlan();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- run mode (at the court) ---------- */
  let run = null;          // { i, remaining: [secs per part], running, endAt, beeped, started, finished }
  let runDiagrams = [];
  let ticker = null;
  let wakeLock = null;
  let wakeLockAsking = false;
  let audio = null;        // null = not set up yet (needs a tap), false = no sound on this device

  const runOpen = () => !$('#run').hidden;

  // Once the timer has been started, the run is saved after every change, so
  // if the phone reloads the page (it was in the background, the battery
  // saver kicked in...) the session carries on from the same part. `endAt` is
  // a clock time, so a running timer keeps counting while the page is gone.
  // `touched` is the coach's last tap; saves the page makes by itself
  // (reopening after a reload, time's up) leave it alone.
  function saveRun(touch = true) {
    if (!run || run.finished || !run.started || !session) { store.del(KEY_RUN); return; }
    if (touch || !run.touched) run.touched = Date.now();
    store.set(KEY_RUN, {
      sid: session.created, i: run.i, remaining: run.remaining, running: run.running, endAt: run.endAt,
      beeped: run.beeped, started: run.started, open: runOpen(), saved: run.touched,
    });
  }

  function loadRun() {
    const r = store.get(KEY_RUN);
    const ok = r && session && r.sid === session.created && r.started
      && Number.isInteger(r.i) && r.i >= 0 && r.i < SLOTS.length
      && Array.isArray(r.remaining) && r.remaining.length === SLOTS.length && r.remaining.every(Number.isFinite)
      && (!r.running || Number.isFinite(r.endAt))
      && Number.isFinite(r.saved) && Date.now() - r.saved < RUN_STALE_MS;
    if (!ok) { if (r) store.del(KEY_RUN); return null; }
    return {
      i: r.i, remaining: r.remaining, running: !!r.running, endAt: r.endAt || 0,
      beeped: !!r.beeped, started: true, finished: false, open: !!r.open, touched: r.saved,
    };
  }

  // Sound needs a tap before it's allowed, so set it up on the first tap.
  // A screen lock can stop it again ('suspended', or 'interrupted' on
  // iPhone), so every tap wakes it.
  function unlockAudio() {
    if (audio === null) {
      try {
        audio = new (window.AudioContext || window.webkitAudioContext)();
        audio.onstatechange = () => { if (run && runOpen()) syncTimer(); };
      } catch (err) { audio = false; }
    }
    if (audio && audio.state !== 'running') Promise.resolve(audio.resume()).catch(() => {});
  }
  const soundOn = () => !!audio && audio.state === 'running';

  const fmt = secs => {
    const over = secs < 0;
    const a = Math.abs(Math.round(secs));
    return `${over ? '+' : ''}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`;
  };

  function remainingNow() {
    if (!run.running) return run.remaining[run.i];
    return (run.endAt - Date.now()) / 1000;
  }

  // iPhones mute a web page's sound when silent mode is on, unless the page
  // says it's playing something the user wants to hear. Only ask for that
  // while the alert plays, so music from another app isn't held up.
  function soundThroughSilent(on) {
    try { if (navigator.audioSession) navigator.audioSession.type = on ? 'playback' : 'auto'; } catch (e) { /* not supported */ }
  }

  // Time's up: two rounds of three long beeps, loud enough for a noisy gym.
  // `reminder` is the short double beep for each extra minute of overtime.
  function beep(reminder) {
    // Phones only allow a buzz once the page has been tapped (asking earlier just logs an error).
    const tapped = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && tapped) navigator.vibrate(reminder ? [200, 100, 200] : [400, 150, 400, 150, 400]);
    if (!audio) return;
    try {
      soundThroughSilent(true);
      if (audio.state !== 'running') Promise.resolve(audio.resume()).catch(() => {});
      const starts = reminder ? [0, 0.3] : [0, 0.5, 1, 2, 2.5, 3];
      const len = reminder ? 0.18 : 0.4;
      starts.forEach(off => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'square';
        osc.frequency.value = 988;
        const t = audio.currentTime + 0.05 + off;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
        gain.gain.setValueAtTime(0.6, t + len - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + len + 0.02);
      });
      clearTimeout(beep.done);
      beep.done = setTimeout(() => soundThroughSilent(false), (starts[starts.length - 1] + len + 0.5) * 1000);
    } catch (e) { /* no sound available */ }
  }

  async function keepAwake() {
    if (!('wakeLock' in navigator) || wakeLock || wakeLockAsking) return;
    wakeLockAsking = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      // The session may have been closed while the phone was answering.
      if (!run || run.finished || !runOpen()) { lock.release().catch(() => {}); return; }
      wakeLock = lock;
      lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
    } catch (e) {
      /* not allowed (iPhone needs a tap first): fine */
    } finally {
      wakeLockAsking = false;
    }
  }
  function letSleep() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }

  function startRun(fromStart) {
    if (!run || fromStart || run.finished) {
      run = { i: 0, remaining: SLOTS.map(s => s.min * 60), running: false, endAt: 0, beeped: false, started: false, finished: false };
    }
    openRun();
  }

  function openRun() {
    showRun();
    saveRun();
  }

  // Shows the run view without saving (also used when another copy of the
  // app changed the run, so the two don't keep overwriting each other).
  function showRun() {
    $('#run').hidden = false;
    document.body.classList.add('running');
    renderRun();
    clearInterval(ticker);
    ticker = setInterval(tick, 250);
    if (run.running) keepAwake();
  }

  function exitRun() {
    if (run && run.running) setRunning(false);
    hideRun();
    saveRun();
  }

  function hideRun() {
    clearInterval(ticker);
    runDiagrams.forEach(c => c.destroy());
    runDiagrams = [];
    letSleep();
    $('#run').hidden = true;
    $('#run').innerHTML = '';
    document.body.classList.remove('running');
    renderPlan();
  }

  function setRunning(on) {
    if (on === run.running) return;
    if (on) {
      run.endAt = Date.now() + run.remaining[run.i] * 1000;
      run.running = true;
      run.started = true;
      keepAwake();
      markUsed();
    } else {
      run.remaining[run.i] = remainingNow();
      run.running = false;
    }
    saveRun();
    syncTimer();
  }

  function goTo(i) {
    if (run.running) run.remaining[run.i] = remainingNow();
    const wasStarted = run.started;
    run.running = false;
    if (i >= SLOTS.length) {
      run.finished = true;
      markUsed();
      saveRun();
      renderFinish();
      return;
    }
    run.i = Math.max(0, i);
    run.beeped = run.remaining[run.i] <= 0;
    run.nagged = undefined;
    renderRun();
    if (wasStarted) setRunning(true);
    saveRun();
  }

  function tick() {
    if (!run || run.finished) return;
    const left = remainingNow();
    if (left <= 0) {
      // Then a short reminder for every extra minute, so overtime doesn't slip by.
      const over = Math.floor(-left / 60);
      if (!run.beeped) {
        run.beeped = true;
        run.nagged = over;
        saveRun(false);
        beep();
      } else if (run.nagged === undefined) {
        run.nagged = over;   // after a reload or Back: wait for the next full minute
      } else if (over > run.nagged) {
        run.nagged = over;
        beep(true);
      }
    }
    syncTimer();
  }

  function syncTimer() {
    const t = $('#timer');
    if (!t) return;
    const left = remainingNow();
    t.textContent = fmt(left);
    t.classList.toggle('is-over', left <= 0);
    t.classList.toggle('is-paused', !run.running);
    const msg = $('#timerMsg');
    msg.textContent = left <= 0 ? 'Time\'s up! Tap Next ▶' : run.running ? '' : run.started ? 'Paused' : 'Tap Start when you\'re ready';
    msg.classList.toggle('is-over', left <= 0);
    // After a reload or a screen lock the timer carries on, but the phone only
    // allows the beep again after a tap.
    $('#soundBtn').hidden = !(run.running && left > 0 && audio !== false && !soundOn());
    const hint = $('#silentHint');
    if (hint) hint.hidden = run.started;
    const btn = $('#startBtn');
    btn.textContent = run.running ? '❚❚ Pause' : '▶ Start';
    btn.classList.toggle('btn-go', !run.running);
  }

  function renderRun() {
    runDiagrams.forEach(c => c.destroy());
    runDiagrams = [];
    const slot = SLOTS[run.i];
    const last = run.i === SLOTS.length - 1;
    const root = $('#run');
    root.innerHTML = `
      <div class="run-top">
        <button type="button" class="run-exit" data-action="exit" aria-label="Exit session">✕</button>
        <ol class="run-dots" aria-hidden="true">${SLOTS.map((s, i) => `<li class="${i < run.i ? 'done' : i === run.i ? 'now' : ''}"></li>`).join('')}</ol>
        <span class="run-count">Part ${run.i + 1} of ${SLOTS.length}</span>
      </div>
      <div class="run-body">
        <p class="run-slot">${slot.icon} ${esc(slot.label)} · ${slot.min} min</p>
        <h2 class="run-name">${esc(partTitle(slot))}</h2>
        <div class="timer-box">
          <p id="timer" class="timer" role="timer" aria-live="off"></p>
          <p id="timerMsg" class="timer-msg" aria-live="polite"></p>
          <button type="button" id="soundBtn" class="btn btn-sound" data-action="sound" hidden>🔇 Tap to turn the beep back on</button>
          <div class="timer-btns">
            <button type="button" id="startBtn" class="btn btn-big" data-action="startstop"></button>
            <button type="button" class="btn btn-plus" data-action="plus1">+1 min</button>
          </div>
          ${isIOS ? '<p id="silentHint" class="run-hint">🔔 Turn silent mode off so you hear the beep.</p>' : ''}
        </div>
        <div class="run-detail">${partHTML(session, slot, { big: true })}</div>
      </div>
      <div class="run-nav">
        <button type="button" class="btn btn-nav" data-action="back" ${run.i === 0 ? 'disabled' : ''}>◀ Back</button>
        <button type="button" class="btn btn-nav btn-primary" data-action="next">${last ? 'Finish 🎉' : 'Next ▶'}</button>
      </div>`;
    mountDiagrams(root, runDiagrams);
    $('.run-body', root).scrollTop = 0;
    syncTimer();
  }

  function renderFinish() {
    runDiagrams.forEach(c => c.destroy());
    runDiagrams = [];
    letSleep();
    $('#run').innerHTML = `
      <div class="finish">
        <p class="finish-emoji" aria-hidden="true">🎉</p>
        <h2>Great session!</h2>
        <p class="lead">Well done, coach. Your next session works on <b>${esc(THEMES[nextFocus(session.focus)].name)}</b>.</p>
        <button type="button" class="btn btn-big btn-primary" data-action="exit">Done</button>
      </div>`;
  }

  /* ---------- coach help ---------- */
  function renderHelp() {
    $('#help').innerHTML = `
      <h1 class="help-title">Coach help</h1>
      <p class="lead">Quick reads for brand-new coaches. Tap a heading to open it.</p>
      ${HELP.map(sec => `
        <details class="card help-sec" id="help-${sec.id}">
          <summary><span class="help-icon" aria-hidden="true">${sec.icon}</span> ${esc(sec.title)}</summary>
          <p class="help-intro">${esc(sec.intro)}</p>
          <ul class="help-cards">
            ${sec.cards.map(c => `<li><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></li>`).join('')}
          </ul>
        </details>`).join('')}`;
  }

  /* ---------- home screen (opens with no internet) ---------- */
  const KEY_INSTALLED = 'ebt.installed.v1';
  let installPrompt = null;   // the browser's own "Install" prompt, when it offers one (Android Chrome)
  const ua = navigator.userAgent;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  // Facebook, Messenger, Instagram and other apps open links in their own
  // browser, which can't add to the home screen or work offline.
  const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|musical_ly|Bytedance/i.test(ua);

  function markInstalled() { store.set(KEY_INSTALLED, true); }

  function homeTipHTML() {
    if (isStandalone() || store.get(KEY_INSTALLED)) return '';
    if (!isIOS && !isAndroid) return '';   // a computer: not taken to the court
    const title = '<p class="home-tip-title">📲 Put it on your home screen</p>';
    let body;
    if (inAppBrowser) {
      body = `<p>It opens like an app and works at the court with no internet. First open this page in ${isIOS ? 'Safari' : 'Chrome'}: tap <b>•••</b> or <b>⋮</b>, then <b>Open in browser</b>.</p>`;
    } else if (isIOS) {
      // iPhone home screen apps keep their own storage, separate from Safari.
      body = `
        <p>It opens like an app and works at the court with no internet.</p>
        <p>Tap <b>Share</b> (the square with an arrow; if you can't see it, tap <b>•••</b> first), then scroll down and tap <b>Add to Home Screen</b>.</p>
        <p>Then open it from the new icon once while you have internet, and make your sessions there. The icon keeps its own sessions, separate from Safari.</p>`;
    } else if (installPrompt) {
      body = '<p>It opens like an app and works at the court with no internet.</p><button type="button" class="btn btn-ghost" data-action="install">📲 Add to home screen</button>';
    } else {
      body = '<p>It opens like an app and works at the court with no internet. Tap the browser menu <b>⋮</b>, then <b>Add to Home screen</b> or <b>Install app</b>.</p>';
    }
    return `<div class="home-tip">${title}${body}</div>`;
  }

  function refreshHomeTip() {
    const tip = $('#homeTip');
    if (tip) tip.innerHTML = homeTipHTML();
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    refreshHomeTip();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    markInstalled();
    refreshHomeTip();
  });

  /* ---------- tabs ---------- */
  const TABS = ['session', 'gameday', 'help'];
  // gameday.js may be missing for a moment after an update (see index.html).
  const gameDay = typeof GameDay !== 'undefined' ? GameDay : null;

  function showTab(name) {
    if (!TABS.includes(name)) name = 'session';
    TABS.forEach(t => { $(`#view-${t}`).hidden = t !== name; });
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
    if (location.hash !== `#${name}` && (name !== 'session' || location.hash)) history.replaceState(null, '', `#${name}`);
    if (name === 'gameday' && gameDay) gameDay.show();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    if (run && runOpen()) {
      unlockAudio();
      if (run.running) keepAwake();
      syncTimer();
    }

    const tab = e.target.closest('[data-tab]');
    if (tab) { showTab(tab.dataset.tab); window.scrollTo(0, 0); return; }

    const head = e.target.closest('.part-head');
    if (head) { togglePart(head.closest('.part').dataset.part); return; }

    const swapBtn = e.target.closest('[data-swap]');
    if (swapBtn) {
      swap(session, swapBtn.dataset.swap);
      save(session);
      if (run && !$('#run').hidden) renderRun();
      else renderPlan();
      return;
    }

    const pick = e.target.closest('[data-focus]');
    if (pick) { newSession(pick.dataset.focus); return; }

    const act = e.target.closest('[data-action]');
    if (!act) return;
    switch (act.dataset.action) {
      case 'generate': newSession(); break;
      case 'choose-focus': {
        const box = $('#focusChoice');
        box.hidden = !box.hidden;
        act.setAttribute('aria-expanded', String(!box.hidden));
        break;
      }
      case 'run': startRun(false); break;
      case 'run-restart': startRun(true); break;
      case 'exit': exitRun(); break;
      case 'startstop':
        setRunning(!run.running);
        break;
      case 'plus1':
        if (run.running) run.endAt += 60000;
        else run.remaining[run.i] += 60;
        if (remainingNow() > 0) run.beeped = false;
        run.nagged = undefined;
        saveRun();
        syncTimer();
        break;
      case 'next': goTo(run.i + 1); break;
      case 'back': goTo(run.i - 1); break;
      case 'sound': break;   // the tap itself turns the beep on (top of this handler)
      case 'install': {
        const p = installPrompt;
        if (!p) break;
        installPrompt = null;   // each prompt can only be shown once
        p.prompt();
        p.userChoice.then(choice => {
          if (choice && choice.outcome === 'accepted') markInstalled();
          refreshHomeTip();
        }, refreshHomeTip);
        break;
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !run || !run.running) return;
    keepAwake();
    // Some phones let sound start again without a tap; if not, the button shows.
    if (audio && audio.state !== 'running') Promise.resolve(audio.resume()).catch(() => {});
  });

  // Another copy of the app (a second tab, or the home screen app on Android)
  // changed the session: follow it, so the two don't overwrite each other.
  // Nothing is saved here, or the copies would keep answering each other.
  window.addEventListener('storage', e => {
    if (e.key !== null && e.key !== KEY_RUN && e.key !== KEY_SESSION) return;
    session = load();
    run = loadRun();
    if (run && run.open) showRun();
    else if (runOpen()) hideRun();
    else renderPlan();
  });

  run = loadRun();
  renderPlan();
  renderHelp();
  if (gameDay) gameDay.init($('#gameday'));
  showTab(location.hash.slice(1));
  if (run && run.open) showRun();

  // Keeps a copy of the app on the phone (see sw.js). Off on this computer's
  // own test server, where it would get in the way of other projects; add
  // ?sw to the address to test it there.
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if ('serviceWorker' in navigator && (!local || new URLSearchParams(location.search).has('sw'))) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* no offline copy: still works online */ });
  }
})();
