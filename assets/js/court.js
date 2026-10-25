/* =========================================================
   Half-court drawing + a tiny keyframe animation engine.

   Court units: a FIBA half court, 500 wide × 467 deep
   (1 m ≈ 33.3 units). The basket is at the top, the half-way
   line at the bottom.

   An animation is plain data (see drills.js):
     dur     seconds per loop
     cones   [[x, y], ...]
     p       players: { k: [[t, x, y], ...] | [x, y], team, n, b, ... }
               team    'a' players (blue, default) · 'd' defenders (red)
                       'c' coach (grey) · 'w' second or waiting team (green)
               n       label shown on the player
               b       1 = carries her own ball the whole time
               hold    [[t0, t1], ...] when she holds her own ball at her
                       chin instead of dribbling (a jump stop, a pivot)
               dribble 'always' = keeps dribbling while standing still
                       (otherwise a player standing still holds her ball)
               hands   [[t, 'R' | 'L'], ...] which hand she dribbles with
                       (right if not given); a change is a crossover
               face    deg, or [[t, deg | 'hoop'], ...]: which way she
                       faces. 0 = the hoop end, 90 = right, 180 = half way,
                       -90 = left. A turn goes the way the numbers go, so
                       180 → 360 and 180 → 0 pivot in opposite directions.
                       Without it she faces the way she's moving, and a
                       player holding a passed ball turns from the passer
                       to whoever she passes to next.
               guard   index of the attacker this defender guards
                       (she stays between that player and the hoop)
               lag     how far behind (0–1 of the loop) a guard reacts
     balls   [[[t, ref, flag], ...], ...]
               ref   player index · 'hoop' · [x, y] (a bounce, or the floor)
               flag  'h' = held (no dribble) until the next keyframe
     cap     [[t0, t1, 'caption'], ...]
     key     names for the key under the diagram, e.g. { w: 'Rebounder' }
     poster  the moment (0–1) shown when the diagram starts paused
     paths   false = hide the dashed guide lines (busy games)
   Times are fractions of the loop (0–1).

   A held ball sits in front of the player, so it turns with her.
   A dribbled ball bounces at her side, in her dribbling hand.
   ========================================================= */
const Court = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const HOOP = [250, 52.5];
  const VIEW = '-30 -30 560 545';
  const COLORS = { a: '#2563EB', d: '#DC2626', c: '#475569', w: '#16A34A' };
  const KEY = { a: ['blue', 'Players'], d: ['red', 'Defenders'], w: ['green', 'Next team'], c: ['grey', 'Coach'] };
  const LINE = '#C2410C';
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function drawCourt(svg) {
    const g = el('g', { class: 'court' }, svg);
    el('rect', { x: -30, y: -30, width: 560, height: 545, fill: '#EDE3D3' }, g);
    el('rect', { x: 0, y: 0, width: 500, height: 515, fill: '#FFF3E0' }, g);
    const lines = el('g', { fill: 'none', stroke: LINE, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    // the key ("paint")
    el('rect', { x: 168.3, y: 0, width: 163.4, height: 193, fill: '#FFE1BF' }, lines);
    // free-throw circle: solid outside the key, dashed inside
    el('path', { d: 'M190 193 A60 60 0 0 0 310 193' }, lines);
    el('path', { d: 'M190 193 A60 60 0 0 1 310 193', 'stroke-dasharray': '8 8', opacity: 0.6 }, lines);
    // three-point line
    el('path', { d: 'M30 0 L30 99.7 A225 225 0 0 0 470 99.7 L470 0' }, lines);
    // no-charge semicircle
    el('path', { d: 'M208.3 52.5 A41.7 41.7 0 0 0 291.7 52.5', opacity: 0.6 }, lines);
    // boundary, half-way line, centre circle
    el('path', { d: 'M0 515 L0 0 L500 0 L500 515' }, lines);
    el('line', { x1: 0, y1: 467, x2: 500, y2: 467 }, lines);
    el('circle', { cx: 250, cy: 467, r: 60 }, lines);
    // backboard and rim
    el('line', { x1: 220, y1: 40, x2: 280, y2: 40, stroke: '#1E2A4A', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    el('line', { x1: 250, y1: 40, x2: 250, y2: 45, stroke: '#EA580C', 'stroke-width': 3 }, g);
    el('circle', { cx: HOOP[0], cy: HOOP[1], r: 7.5, fill: 'none', stroke: '#EA580C', 'stroke-width': 3.5 }, g);
  }

  const ease = u => u * u * (3 - 2 * u);
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const clamp01 = u => Math.max(0, Math.min(1, u));
  // Directions are degrees: 0 = towards the hoop end, 90 = right.
  const dirOf = deg => [Math.sin(deg * Math.PI / 180), -Math.cos(deg * Math.PI / 180)];
  const angleTo = (from, to) => Math.atan2(to[0] - from[0], from[1] - to[1]) * 180 / Math.PI;
  // `b`, moved by whole turns to within half a turn of `a` (the short way round).
  const near = (a, b) => b + 360 * Math.round((a - b) / 360);
  const offset = (pos, dir, d) => [pos[0] + dir[0] * d, pos[1] + dir[1] * d];
  const sameRef = (r, s) => r === s || (Array.isArray(r) && Array.isArray(s) && r[0] === s[0] && r[1] === s[1]);
  const HOLD_R = 15;   // a held ball, in front of her (at her chin)
  const SIDE_R = 14;   // a dribbled ball, out to her side

  function track(k, t) {
    if (t <= k[0][0]) return [k[0][1], k[0][2]];
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i], b = k[i + 1];
      if (t <= b[0]) {
        const u = b[0] === a[0] ? 1 : ease((t - a[0]) / (b[0] - a[0]));
        return lerp([a[1], a[2]], [b[1], b[2]], u);
      }
    }
    const last = k[k.length - 1];
    return [last[1], last[2]];
  }

  function normalise(anim) {
    const players = (anim.p || []).map(p => {
      const k = p.k ? (typeof p.k[0] === 'number' ? [[0, p.k[0], p.k[1]]] : p.k) : null;
      return { ...p, k, team: p.team || 'a' };
    });
    return {
      dur: anim.dur || 6,
      cones: anim.cones || [],
      players,
      balls: anim.balls || [],
      cap: anim.cap || [],
      paths: anim.paths !== false,
    };
  }

  // A `face` track: degrees, or 'hoop' for facing the basket from `pos`.
  function faceAt(face, t, pos) {
    if (typeof face === 'number') return face;
    const val = v => (v === 'hoop' ? angleTo(pos, HOOP) : v);
    if (t <= face[0][0]) return val(face[0][1]);
    for (let i = 0; i < face.length - 1; i++) {
      const [t0, v0] = face[i], [t1, v1] = face[i + 1];
      if (t <= t1) {
        const a0 = val(v0);
        const a1 = v0 === 'hoop' || v1 === 'hoop' ? near(a0, val(v1)) : v1;
        return a0 + (a1 - a0) * (t1 === t0 ? 1 : ease((t - t0) / (t1 - t0)));
      }
    }
    return val(face[face.length - 1][1]);
  }

  // Builds the position functions for one animation.
  function engine(a) {
    const playerPos = (i, t) => {
      const p = a.players[i];
      if (p.guard == null) return track(p.k, t);
      // She reacts a moment late. On a diagram that loops, that wraps round
      // the loop instead of freezing her at the start.
      let lagT = t - (p.lag || 0);
      if (lagT < 0) lagT = seamless(p.guard) ? lagT + 1 : 0;
      const att = playerPos(p.guard, lagT);
      const len = dist(att, HOOP) || 1;
      // Between her player and the hoop...
      const off = Math.min(42, Math.max(32, len * 0.45));
      const pos = offset(att, [(HOOP[0] - att[0]) / len, (HOOP[1] - att[1]) / len], off);
      // ...but never on top of her, even when she's a step behind a cut.
      const now = lagT === t ? att : playerPos(p.guard, t);
      const gap = dist(pos, now);
      return gap >= 32 || gap === 0 ? pos : offset(now, [(pos[0] - now[0]) / gap, (pos[1] - now[1]) / gap], 32);
    };
    const loops = [];
    const seamless = i => (loops[i] != null ? loops[i] : (loops[i] = dist(playerPos(i, 0), playerPos(i, 1)) < 3));
    // 0 = standing still, 1 = on the move (smooth, so the ball slides from
    // her side to her hands rather than jumping).
    const motion = (i, t) => clamp01((dist(playerPos(i, Math.max(0, t - 0.03)), playerPos(i, Math.min(1, t + 0.03))) - 2) / 6);

    // Which way she faces, from the way she's moving: smoothed so she turns
    // rather than snaps, and kept while she stands still. Worked out once
    // for the whole loop.
    const STEPS = 240;
    const tables = [];
    function headingTable(i) {
      const raw = [];
      for (let j = 0; j <= STEPS; j++) {
        const t = j / STEPS;
        const from = playerPos(i, Math.max(0, t - 0.025)), to = playerPos(i, Math.min(1, t + 0.025));
        raw.push(dist(from, to) > 2 ? angleTo(from, to) : null);
      }
      const known = raw.filter(v => v != null);
      if (!known.length) return raw.map(() => 0);   // never moves: faces the hoop end
      const loop = seamless(i);
      const maxTurn = 360 / (STEPS * 0.15);         // a full turn takes at least 15% of the loop
      const out = [];
      let h = loop ? known[known.length - 1] : known[0];
      for (let pass = loop ? 0 : 1; pass < 2; pass++) {   // a loop goes round twice to settle
        raw.forEach((v, j) => {
          const want = v == null ? h : near(h, v);
          h += Math.max(-maxTurn, Math.min(maxTurn, want - h));
          if (pass === 1) out[j] = h;
        });
      }
      return out;
    }
    const heading = (i, t) => {
      const p = a.players[i];
      if (p.face != null) return faceAt(p.face, t, playerPos(i, t));
      const tab = tables[i] || (tables[i] = headingTable(i));
      const x = clamp01(t) * STEPS;
      const j = Math.min(STEPS - 1, Math.floor(x));
      return tab[j] + (near(tab[j], tab[j + 1]) - tab[j]) * (x - j);
    };

    // +1 = right hand, -1 = left. A change of hand swings the ball across in
    // front of her (a crossover).
    const handSide = (p, t) => {
      if (!p.hands) return 1;
      const side = v => (v === 'L' ? -1 : 1);
      let s = side(p.hands[0][1]);
      p.hands.forEach(([t0, v]) => { if (t >= t0) s += (side(v) - s) * ease(clamp01((t - t0) / 0.04)); });
      return s;
    };
    const heldPos = (i, t, deg) => offset(playerPos(i, t), dirOf(deg), HOLD_R);
    const dribblePos = (i, t) => {
      const deg = heading(i, t);
      const side = handSide(a.players[i], t);
      const out = offset(playerPos(i, t), dirOf(deg + 90), SIDE_R * side);
      return offset(out, dirOf(deg), 5 + 9 * (1 - Math.abs(side)));
    };

    // A player's own ball (`b: 1`): held in front during `hold` (and while
    // she stands still, unless she dribbles on the spot), otherwise dribbled.
    // 1 = held, 0 = dribbled, easing over a moment either side of a hold.
    const holding = (p, i, t) => {
      let amt = p.dribble === 'always' ? 0 : 1 - motion(i, t);
      (p.hold || []).forEach(([t0, t1]) => {
        amt = Math.max(amt, Math.min(ease(clamp01((t - t0) / 0.03 + 1)), ease(clamp01((t1 - t) / 0.03 + 1))));
      });
      return amt;
    };
    const ownBall = (i, t) => {
      const amt = holding(a.players[i], i, t);
      const pos = lerp(dribblePos(i, t), heldPos(i, t, heading(i, t)), amt);
      return { pos, dribble: amt < 0.5 };
    };

    const refPos = (ref, t) => (typeof ref === 'number' ? playerPos(ref, t) : ref === 'hoop' ? HOOP : ref);
    // The keyframes either side of the run where this player holds the
    // ball: where it came from (a passer, or the hoop for a rebound) and
    // where it goes next. Wraps round the loop when the same player has it
    // at the start and the end.
    function holdRun(k, i) {
      const ref = k[i][1], n = k.length;
      let s = i, e = i;
      while (s > 0 && sameRef(k[s - 1][1], ref)) s--;
      while (e < n - 1 && sameRef(k[e + 1][1], ref)) e++;
      let from = s > 0 ? k[s - 1] : null, to = e < n - 1 ? k[e + 1] : null;
      if (!from && e < n - 1 && sameRef(k[n - 1][1], ref)) {
        let j = n - 1; while (j > 0 && sameRef(k[j][1], ref)) j--;
        from = k[j];
      }
      if (!to && s > 0 && sameRef(k[0][1], ref)) {
        let j = 0; while (j < n - 1 && sameRef(k[j][1], ref)) j++;
        to = k[j];
      }
      // t0: when it reached her; t1: when she lets it go (or the loop ends)
      return { t0: k[s][0], t1: e < n - 1 ? k[e][0] : 1, from, to, caught: s > 0, passes: e < n - 1 };
    }
    // A player holding a passed ball turns from where it came from to where
    // it's going next.
    const holdAngle = (k, i, t) => {
      const ref = k[i][1];
      if (a.players[ref].face != null) return heading(ref, t);
      const run = holdRun(k, i);
      const pos = playerPos(ref, t);
      const toward = key => (key ? angleTo(pos, refPos(key[1], key[0])) : null);
      let a0 = toward(run.from), a1 = toward(run.to);
      if (a0 == null && a1 == null) return heading(ref, t);
      if (a0 == null) a0 = a1;
      if (a1 == null) a1 = a0;
      const turn = Math.max(0.001, Math.min(0.12, (run.t1 - run.t0) * 0.6));
      return a0 + (near(a0, a1) - a0) * ease(clamp01((t - run.t0) / turn));
    };
    const restState = (k, i, t) => {
      const ref = k[i][1];
      if (typeof ref !== 'number') return { pos: refPos(ref, t), dribble: false };
      // Held while 'h' or standing still, and always in her hands just
      // after a catch and just before she passes or shoots.
      const run = holdRun(k, i);
      let amt = k[i][2] === 'h' ? 1 : 1 - motion(ref, t);
      if (run.caught) amt = Math.max(amt, 1 - ease(clamp01((t - run.t0) / 0.05)));
      if (run.passes) amt = Math.max(amt, ease(clamp01((t - run.t1) / 0.05 + 1)));
      const held = heldPos(ref, t, holdAngle(k, i, t));
      if (amt >= 1) return { pos: held, dribble: false };
      return { pos: lerp(dribblePos(ref, t), held, amt), dribble: amt < 0.5 };
    };

    // Returns { pos, scale, dribble } for a ball track at time t.
    const ballState = (k, t) => {
      let i = 0;
      while (i < k.length - 1 && t >= k[i + 1][0]) i++;
      const a0 = k[i], b0 = k[i + 1];
      if (!b0 || t < a0[0] || sameRef(a0[1], b0[1])) return { ...restState(k, i, t), scale: 1 };
      const u = (t - a0[0]) / (b0[0] - a0[0]);
      const from = restState(k, i, a0[0]).pos;
      const to = restState(k, i + 1, b0[0]).pos;
      const shot = b0[1] === 'hoop';
      // A pass loops up a little; a bounce pass (via a spot on the floor) doesn't.
      const lift = shot ? 0.7 : Array.isArray(a0[1]) || Array.isArray(b0[1]) ? 0 : 0.15;
      return { pos: lerp(from, to, shot ? ease(u) : u), scale: 1 + lift * Math.sin(Math.PI * u), dribble: false };
    };
    return { playerPos, heading, ownBall, ballState };
  }

  function needsFade(a, eng) {
    for (let i = 0; i < a.players.length; i++) {
      if (dist(eng.playerPos(i, 0), eng.playerPos(i, 1)) > 3) return true;
    }
    return a.balls.some(k => dist(eng.ballState(k, 0).pos, eng.ballState(k, 0.9999).pos) > 3);
  }

  function makeBall(parent) {
    const g = el('g', { class: 'ball' }, parent);
    el('circle', { r: 7, fill: '#F97316', stroke: '#7C2D12', 'stroke-width': 1.6 }, g);
    el('path', { d: 'M-7 0 H7 M0 -7 V7', stroke: '#7C2D12', 'stroke-width': 1, opacity: 0.6 }, g);
    return g;
  }

  /* Draws an animated diagram into `host`. Returns a small controller. */
  function create(host, rawAnim, opts = {}) {
    const a = normalise(rawAnim);
    const eng = engine(a);
    const fade = needsFade(a, eng);

    host.classList.add('diagram');
    host.innerHTML = '';
    const stage = document.createElement('div');
    stage.className = 'diagram-stage';
    host.appendChild(stage);

    // The key: what each colour means in this diagram, shown and spoken.
    const teamName = t => (rawAnim.key && rawAnim.key[t]) || KEY[t][1];
    const colour = t => KEY[t][0][0].toUpperCase() + KEY[t][0].slice(1);
    const keyItems = ['a', 'd', 'w', 'c']
      .filter(t => a.players.some(p => p.team === t))
      .map(t => ({ swatch: `background:${COLORS[t]}`, name: teamName(t), spoken: `${colour(t)}${t === 'c' ? ' C' : ' circles'}: ${teamName(t).toLowerCase()}` }));
    if (a.cones.length) keyItems.push({ cls: 'cone', name: 'Cones', spoken: 'Orange triangles: cones' });
    if (a.balls.length || a.players.some(p => p.b)) keyItems.push({ cls: 'ball', name: 'Ball', spoken: 'Orange dot: the ball' });
    const label = `${opts.label || 'Animated court diagram'}. ${keyItems.map(k => k.spoken).join('. ')}.`;

    const svg = el('svg', { viewBox: VIEW, role: 'img', 'aria-label': label }, stage);
    drawCourt(svg);

    const pathsG = el('g', { fill: 'none', 'stroke-width': 2.5, 'stroke-dasharray': '7 7', 'stroke-linecap': 'round', opacity: 0.4 }, svg);
    a.players.forEach(p => {
      if (!a.paths || !p.k || p.k.length < 2) return;
      const pts = [];
      p.k.forEach(([, x, y]) => {
        const last = pts[pts.length - 1];
        if (!last || dist(last, [x, y]) > 2) pts.push([x, y]);
      });
      if (pts.length > 1) el('polyline', { points: pts.map(q => q.join(',')).join(' '), stroke: COLORS[p.team] }, pathsG);
    });

    const conesG = el('g', {}, svg);
    a.cones.forEach(([x, y]) => {
      el('polygon', { points: `${x},${y - 11} ${x - 9},${y + 7} ${x + 9},${y + 7}`, fill: '#F59E0B', stroke: '#B45309', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, conesG);
    });

    const live = el('g', {}, svg);
    const playerNodes = a.players.map(p => {
      const g = el('g', {}, live);
      el('circle', { r: 15, cx: 1.5, cy: 2.5, fill: 'rgba(30,42,74,.18)' }, g);
      el('circle', { r: 15, fill: COLORS[p.team], stroke: '#fff', 'stroke-width': 2.5 }, g);
      const label = p.n != null ? p.n : p.team === 'c' ? 'C' : '';
      if (label !== '') {
        const tx = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-size': 15, 'font-weight': 800 }, g);
        tx.textContent = label;
      }
      return g;
    });
    const ownBalls = a.players.map((p, i) => (p.b ? { i, node: makeBall(live) } : null)).filter(Boolean);
    const trackBalls = a.balls.map(k => ({ k, node: makeBall(live) }));

    const caption = document.createElement('p');
    caption.className = 'diagram-caption';
    caption.setAttribute('aria-hidden', 'true');
    host.appendChild(caption);

    const key = document.createElement('p');
    key.className = 'diagram-key';
    key.setAttribute('aria-hidden', 'true');
    keyItems.forEach(k => {
      const item = document.createElement('span');
      const swatch = document.createElement('i');
      if (k.cls) swatch.className = k.cls;
      if (k.swatch) swatch.style.cssText = k.swatch;
      item.append(swatch, k.name);
      key.appendChild(item);
    });
    host.appendChild(key);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'diagram-play';
    stage.appendChild(btn);

    let elapsed = 0, last = null, raf = null;
    let playing = opts.autoplay !== false && !reducedMotion();
    let visible = true;
    let lastCaption = null;
    let shown = 0;   // the moment on screen

    function draw(t, clock) {
      shown = t;
      a.players.forEach((p, i) => {
        const [x, y] = eng.playerPos(i, t);
        playerNodes[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      });
      // A paused diagram shows the ball still, at full size.
      const bounce = playing ? 0.78 + 0.4 * Math.abs(Math.sin(clock * Math.PI * 2.4)) : 1;
      const place = (node, pos, s) => node.setAttribute('transform', `translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)}) scale(${s.toFixed(2)})`);
      ownBalls.forEach(({ i, node }) => {
        const st = eng.ownBall(i, t);
        place(node, st.pos, st.dribble ? bounce : 1);
      });
      trackBalls.forEach(({ k, node }) => {
        const st = eng.ballState(k, t);
        place(node, st.pos, st.dribble ? bounce : st.scale);
      });
      if (fade) {
        // Fades out and back in where the loop starts again, but never while paused.
        const o = !playing ? 1 : t > 0.94 ? (1 - t) / 0.06 : t < 0.04 ? t / 0.04 : 1;
        live.setAttribute('opacity', o.toFixed(2));
      }
      let text = '';
      a.cap.forEach(([t0, t1, s]) => { if (t >= t0 && t < t1) text = s; });
      if (text !== lastCaption) {
        caption.textContent = text || ' ';
        lastCaption = text;
      }
    }

    function frame(now) {
      raf = null;
      if (!playing || !visible) { last = null; return; }
      if (last != null) elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
      draw((elapsed / a.dur) % 1, elapsed);
      raf = requestAnimationFrame(frame);
    }

    function sync() {
      btn.textContent = playing ? '❚❚' : '▶';
      btn.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
      host.classList.toggle('is-paused', !playing);
      if (playing && visible && raf == null) raf = requestAnimationFrame(frame);
    }

    const toggle = () => {
      playing = !playing;
      if (!playing) draw(shown, elapsed);   // redraw still: full opacity, no bounce
      sync();
    };
    stage.addEventListener('click', toggle);

    let observer = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting;
        sync();
      });
      observer.observe(host);
    }

    // A diagram that starts paused (reduce motion) shows a moment where
    // something is happening: the drill's `poster`, or its first caption.
    const firstCap = a.cap[0];
    const poster = rawAnim.poster != null ? rawAnim.poster
      : firstCap ? (firstCap[0] + Math.min(firstCap[1], firstCap[0] + 0.2)) / 2 : 0.05;
    if (!playing) elapsed = poster * a.dur;
    draw(playing ? 0 : poster, elapsed);
    sync();

    return {
      play() { playing = true; sync(); },
      pause() { playing = false; sync(); },
      toggle,
      seek(t) { playing = false; elapsed = t * a.dur; draw(t, elapsed); sync(); },
      destroy() {
        playing = false;
        if (raf) cancelAnimationFrame(raf);
        if (observer) observer.disconnect();
      },
    };
  }

  return { create, HOOP };
})();
