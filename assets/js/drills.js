/* =========================================================
   Drill library. Edit this file to add or change drills.

   Each drill:
     id, name
     slot    'warmup' | 'skill' | 'game'
     theme   'ball' | 'score' | 'defence' | 'sense' (skills and games)
     need    { balls: 'each' | 'some', cones: n, bibs: true }
     steps   numbered "how it works" steps (keep them short!)
     say     2–3 coaching cues to shout
     anim    animated diagram data (format explained in court.js)

   Court positions: basket at the top (250, 52), half-way line
   at the bottom (y = 467). Width 0–500.
   ========================================================= */

const THEMES = {
  sense:   { name: 'Spread out & get open', short: 'Game sense', fixes: 'Everyone chases the ball', icon: '↔️' },
  ball:    { name: 'Look after the ball',   short: 'Ball skills', fixes: 'Lots of turnovers',       icon: '🤲' },
  score:   { name: 'Put it in the hoop',    short: 'Scoring',     fixes: "Can't score",             icon: '🎯' },
  defence: { name: 'Stop them scoring',     short: 'Defence',     fixes: 'Defence is lost',         icon: '🛡️' },
};
// The focus rotates in this order, one per session.
const FOCUS_ORDER = ['sense', 'ball', 'score', 'defence'];

// Handy spots on the half court
const TOP = [250, 330], LW = [85, 230], RW = [415, 230], LC = [45, 75], RC = [455, 75];

// The same looping path one keyframe behind (keyframes evenly spaced, the
// last one back at the first): for a player who follows and copies another.
const behind = k => k.map(([t], j) => [t, ...k[(j + k.length - 2) % (k.length - 1)].slice(1)]);

const DRILLS = [
  /* ---------------- WARM-UP GAMES ---------------- */
  {
    id: 'dribble-tag', name: 'Dribble Tag', slot: 'warmup',
    need: { balls: 'each', bibs: true },
    steps: [
      'Everyone has a ball and stays inside the half court.',
      'Pick 2 taggers. Give each one a bib to hold.',
      'Everyone dribbles all the time, taggers too. Taggers try to tag someone.',
      'If you get tagged, take the bib. Now you\'re a tagger.',
      'Lose your ball or step out? Do 5 dribbles on the spot, then join back in.',
    ],
    say: ['Eyes up!', 'Use your fingertips', 'Keep it low when they\'re close'],
    anim: {
      dur: 7,
      paths: false,
      p: [
        { b: 1, k: [[0, 120, 150], [0.25, 200, 250], [0.5, 150, 380], [0.75, 90, 260], [1, 120, 150]] },
        { b: 1, k: [[0, 380, 140], [0.25, 300, 200], [0.5, 400, 330], [0.75, 440, 220], [1, 380, 140]] },
        { b: 1, k: [[0, 250, 300], [0.25, 340, 400], [0.5, 250, 250], [0.75, 170, 330], [1, 250, 300]] },
        { b: 1, k: [[0, 200, 100], [0.33, 300, 110], [0.66, 250, 180], [1, 200, 100]] },
        { b: 1, k: [[0, 330, 300], [0.33, 440, 420], [0.66, 330, 400], [1, 330, 300]] },
        { b: 1, team: 'd', n: 'T', k: [[0, 250, 430], [0.25, 250, 360], [0.5, 300, 300], [0.75, 190, 360], [1, 250, 430]] },
        { b: 1, team: 'd', n: 'T', k: [[0, 90, 420], [0.25, 140, 320], [0.5, 90, 190], [0.75, 60, 330], [1, 90, 420]] },
      ],
      cap: [[0, 0.5, 'Everyone dribbles, all the time'], [0.5, 1, 'Taggers (T) chase. Tagged? You take the bib']],
      key: { d: 'Taggers' },
    },
  },
  {
    id: 'red-light', name: 'Red Light, Green Light', slot: 'warmup',
    need: { balls: 'each' },
    steps: [
      'Everyone has a ball and lines up on the baseline (the end line under the hoop).',
      'You stand at half way, facing them.',
      '"Green light!" = dribble towards you. "Red light!" = JUMP STOP: both feet land at the same time, and hold the ball.',
      'Anyone who moves on red light goes back 3 big steps.',
      'Add "Yellow light!" = dribble slowly and low.',
    ],
    say: ['Land on two feet!', 'Eyes on me, not the ball', 'Stop strong'],
    anim: {
      dur: 7,
      p: [
        { team: 'c', k: [250, 445] },
        // lanes either side of the backboard; they hold the ball on each red light
        ...[[45, 190, 340], [125, 215, 365], [200, 200, 355], [300, 225, 380], [375, 195, 345], [455, 205, 360]].map(([x, y1, y2]) => (
          { b: 1, hold: [[0.3, 0.47], [0.75, 1]], k: [[0, x, 22], [0.3, x, y1], [0.47, x, y1], [0.75, x, y2], [1, x, y2]] }
        )),
      ],
      cap: [[0, 0.3, '"Green light!" Dribble'], [0.3, 0.47, '"Red light!" Jump stop, hold the ball'], [0.47, 0.75, '"Green light!"'], [0.75, 1, '"Red light!"']],
    },
  },
  {
    id: 'sharks', name: 'Sharks and Minnows', slot: 'warmup',
    need: { balls: 'each' },
    steps: [
      'Minnows (most of the team) each have a ball and line up on one sideline. If a wall is close, use a line of cones 3 big steps in from each side instead.',
      'Pick 1 or 2 sharks. They have no ball and stand in the middle.',
      'Shout "Go!" Minnows dribble across and stop at the other side. Sharks try to knock their balls away.',
      'If a shark knocks your ball away, you become a shark too.',
      'Keep going until 1 or 2 minnows are left. They\'re the winners! Start again with new sharks.',
    ],
    say: ['Protect it with your body', 'Push the ball out in front', 'Head up, find the gap'],
    anim: {
      dur: 6,
      p: [
        { b: 1, k: [[0, 25, 95], [0.12, 25, 95], [0.4, 230, 95], [0.72, 475, 105], [1, 475, 105]] },
        { b: 1, k: [[0, 25, 170], [0.15, 25, 170], [0.42, 240, 140], [0.75, 475, 180], [1, 475, 180]] },
        { b: 1, k: [[0, 25, 250], [0.1, 25, 250], [0.4, 210, 300], [0.7, 475, 260], [1, 475, 260]] },
        { b: 1, k: [[0, 25, 330], [0.14, 25, 330], [0.45, 260, 370], [0.76, 475, 330], [1, 475, 330]] },
        { b: 1, k: [[0, 25, 410], [0.12, 25, 410], [0.42, 230, 420], [0.73, 475, 405], [1, 475, 405]] },
        { team: 'd', k: [[0, 250, 250], [0.25, 250, 180], [0.45, 272, 325], [0.7, 250, 250], [1, 250, 250]] },
      ],
      cap: [[0, 0.14, 'Ready... GO!'], [0.14, 0.75, 'Dribble across, past the shark'], [0.75, 1, 'Made it!']],
      key: { a: 'Minnows', d: 'Shark' },
    },
  },
  {
    id: 'coach-says', name: 'Coach Says', slot: 'warmup',
    need: { balls: 'each' },
    steps: [
      'Everyone has a ball and spreads out facing you. Arms out: nobody can touch anyone else.',
      'Call out moves starting with "Coach says...": "dribble with your right hand", "now your left", "dribble low", "ball around your waist", "jump stop!"',
      'If you DON\'T say "Coach says" and someone does the move anyway, they do 3 star jumps and keep playing. Nobody is out.',
      'Speed up as they get better.',
    ],
    say: ['Spread out!', 'Weak hand too!', 'Eyes up on me'],
    anim: {
      dur: 4,
      p: [
        { team: 'c', k: [250, 440] },
        // facing the coach, dribbling on the spot: right hand, then left
        ...[[130, 170], [250, 170], [370, 170], [130, 290], [250, 290], [370, 290]].map(k => (
          { b: 1, k, face: 180, dribble: 'always', hands: [[0, 'R'], [0.5, 'L'], [0.96, 'R']] }
        )),
      ],
      cap: [[0, 0.5, '"Coach says: dribble with your right hand"'], [0.5, 1, '"Coach says: now your left!"']],
    },
  },
  {
    id: 'ball-busters', name: 'Ball Busters', slot: 'warmup',
    need: { balls: 'each' },
    steps: [
      'Everyone has a ball and stays inside the 3-point line.',
      'Everyone dribbles and tries to tap other players\' balls out of the area. Tap the ball, never the player.',
      'Protect your own ball with your body and your free arm.',
      'If your ball goes out, do 10 crossovers outside the line, then come straight back in.',
      'To make it harder, use a smaller space with fewer players: half the team plays in the key while the rest dribble around the outside. Swap every minute.',
    ],
    say: ['Free arm up like a shield', 'Keep it low', 'Never stop dribbling'],
    anim: {
      dur: 6,
      paths: false,
      p: [
        { b: 1, k: [[0, 150, 120], [0.33, 220, 180], [0.66, 170, 230], [1, 150, 120]] },
        { b: 1, k: [[0, 330, 110], [0.33, 290, 200], [0.66, 360, 190], [1, 330, 110]] },
        { b: 1, k: [[0, 250, 250], [0.33, 170, 280], [0.66, 270, 150], [1, 250, 250]] },
        { b: 1, k: [[0, 100, 200], [0.5, 150, 255], [1, 100, 200]] },
        { b: 1, k: [[0, 400, 210], [0.5, 340, 250], [1, 400, 210]] },
      ],
      cap: [[0, 1, 'Keep your ball, tap theirs out!']],
    },
  },
  {
    id: 'dribble-relay', name: 'Dribble Relay', slot: 'warmup',
    need: { balls: 'each', cones: 3 },
    steps: [
      'Make 3 teams. Each team lines up on the half-way line. Put a cone near the hoop end in front of each team.',
      'The first player dribbles to the cone with their RIGHT hand, goes around it, and comes back with their LEFT hand.',
      'High-five the next player, who goes next.',
      'First team to have everyone finish wins. Race again with a new move: speed dribble, or a crossover at the cone.',
    ],
    say: ['Right hand there, left hand back', 'Push it out in front', 'Head up!'],
    anim: {
      dur: 7,
      cones: [[130, 150], [250, 150], [370, 150]],
      p: [130, 250, 370].flatMap((x, j) => {
        const d = [0, 0.03, -0.02][j];
        return [
          // up with the right hand (ball on the outside), crossover at the cone, back with the left
          { b: 1, hands: [[0, 'R'], [0.44 + d, 'L']], k: [[0, x, 420], [0.05 + d, x, 420], [0.38 + d, x + 24, 160], [0.44 + d, x, 124], [0.5 + d, x - 24, 160], [0.85 + d, x - 4, 400], [1, x - 4, 400]] },
          { b: 1, k: [x, 452] },
          { b: 1, k: [x, 484] },
        ];
      }),
      cap: [[0, 0.42, 'Right hand to the cone'], [0.42, 0.85, 'Around it, left hand back'], [0.85, 1, 'High five! Next player goes']],
    },
  },

  /* ---------------- SKILLS: LOOK AFTER THE BALL ---------------- */
  {
    id: 'cone-weave', name: 'Cone Weave', slot: 'skill', theme: 'ball',
    need: { balls: 'each', cones: 8 },
    steps: [
      'Set out 2 lines of 4 cones, about 2 big steps apart.',
      'Make 2 lines of players, one at the start of each line of cones.',
      'Dribble in and out of the cones. Swap hands as you go past each cone, so the ball is always on the side away from the cone.',
      'At the end, speed dribble back down the outside and join the back of your line.',
      'Then try it: left hand only, then with crossovers, then as fast as you can without hitting a cone.',
    ],
    say: ['Ball away from the cone', 'Swap hands as you pass it', 'Eyes up, find the next cone'],
    anim: {
      dur: 7,
      cones: [[140, 130], [140, 200], [140, 270], [140, 340], [360, 130], [360, 200], [360, 270], [360, 340]],
      p: [
        // the ball swaps hands just after each cone, so it's always on the side away from it
        { b: 1, hands: [[0, 'L'], [0.16, 'R'], [0.28, 'L'], [0.4, 'R']], k: [[0, 140, 420], [0.12, 110, 340], [0.24, 170, 270], [0.36, 110, 200], [0.48, 170, 130], [0.58, 140, 70], [0.7, 60, 150], [0.92, 60, 400], [1, 60, 400]] },
        { b: 1, k: [140, 455] },
        { b: 1, k: [140, 490] },
        { b: 1, hands: [[0, 'R'], [0.2, 'L'], [0.32, 'R'], [0.44, 'L']], k: [[0, 360, 420], [0.04, 360, 420], [0.16, 390, 340], [0.28, 330, 270], [0.4, 390, 200], [0.52, 330, 130], [0.62, 360, 70], [0.74, 440, 150], [0.95, 440, 400], [1, 440, 400]] },
        { b: 1, k: [360, 455] },
        { b: 1, k: [360, 490] },
      ],
      cap: [[0, 0.6, 'Weave in and out, swap hands at each cone'], [0.6, 1, 'Speed dribble back down the outside']],
    },
  },
  {
    id: 'jump-stop', name: 'Jump Stop and Pivot', slot: 'skill', theme: 'ball',
    need: { balls: 'each' },
    steps: [
      'Everyone has a ball and lines up on the baseline (the end line).',
      'Dribble forward. When you blow the whistle: JUMP STOP. Both feet land at the same time.',
      'Hold the ball tight at your chin, elbows out.',
      'Keep one foot glued to the floor. Step around with the other foot to turn and face the baseline (that\'s a pivot). Then pivot back.',
      'Keep going to half way and back. Change which foot is glued each time.',
    ],
    say: ['Two feet, one bang!', 'Glue one foot down', 'Chin it: ball at your chin, elbows out'],
    anim: {
      dur: 7,
      poster: 0.48,
      p: [
        { team: 'c', k: [505, 250] },
        // jump stop, ball to the chin, pivot round to face the baseline and back.
        // Two turn one way and two the other (a different glued foot).
        ...[[110, 360], [200, 0], [300, 360], [390, 0]].map(([x, turn]) => ({
          b: 1,
          hold: [[0.3, 0.7]],
          face: [[0, 180], [0.42, 180], [0.52, turn], [0.58, turn], [0.68, 180]],
          k: [[0, x, 25], [0.3, x, 200], [0.7, x, 200], [0.92, x, 360], [1, x, 360]],
        })),
      ],
      cap: [[0, 0.3, 'Dribble forward'], [0.3, 0.42, 'Whistle! JUMP STOP: ball to your chin'], [0.42, 0.58, 'Glue one foot, pivot to face the baseline'], [0.58, 0.7, 'Pivot back'], [0.7, 1, 'Dribble on to the next whistle']],
    },
  },
  {
    id: 'partner-passing', name: 'Partner Passing', slot: 'skill', theme: 'ball',
    need: { balls: 'some' },
    steps: [
      'Get into pairs with one ball. Stand facing each other, about 3 big steps apart.',
      'Chest pass: thumbs behind the ball, step towards your partner, push, and finish with your thumbs pointing down.',
      'Catch with "target hands": hands up, fingers spread, ready before the ball comes.',
      'Do 10 chest passes, then 10 bounce passes (bounce it about two-thirds of the way to your partner).',
      'Every time you get 10 in a row with no drops, both take one step back.',
    ],
    say: ['Step and push!', 'Show your target hands', 'Thumbs down at the finish'],
    anim: {
      dur: 4,
      // pairs 3 big steps apart; each passer steps towards their partner
      p: [
        { k: [[0, 150, 200], [0.08, 150, 208], [0.2, 150, 200], [1, 150, 200]] },
        { k: [[0, 150, 290], [0.58, 150, 290], [0.66, 150, 282], [0.78, 150, 290], [1, 150, 290]] },
        { k: [[0, 350, 200], [0.08, 350, 208], [0.2, 350, 200], [1, 350, 200]] },
        { k: [[0, 350, 290], [0.58, 350, 290], [0.66, 350, 282], [0.78, 350, 290], [1, 350, 290]] },
      ],
      balls: [
        [[0, 0], [0.08, 0], [0.3, 1], [0.62, 1], [0.84, 0], [1, 0]],
        // bounce passes: the floor about two-thirds of the way
        [[0, 2], [0.08, 2], [0.19, [350, 256]], [0.3, 3], [0.62, 3], [0.73, [350, 234]], [0.84, 2], [1, 2]],
      ],
      cap: [[0, 0.5, 'Left: chest pass. Right: bounce pass'], [0.5, 1, 'Catch with target hands']],
    },
  },
  {
    id: 'pass-follow', name: 'Pass and Follow', slot: 'skill', theme: 'ball',
    need: { balls: 'some' },
    steps: [
      'Make 2 lines facing each other, about 5 big steps apart. The first player in one line has the ball.',
      'Pass to the first player in the other line, then run and join the back of THAT line.',
      'The catcher does the same: pass across, then follow your pass.',
      'Count the passes out loud as a team. Can you get to 20 with no drops?',
      'Then try: bounce passes only, or catch with a jump stop before you pass.',
    ],
    say: ['Call their name, then pass', 'Target hands up', 'Pass, then run!'],
    anim: {
      dur: 7,
      p: [
        // run round the far line (not through it) to its back, then step up with it
        { k: [[0, 150, 260], [0.25, 150, 260], [0.4, 250, 325], [0.52, 420, 300], [0.6, 455, 260], [0.84, 455, 260], [0.96, 420, 260], [1, 420, 260]] },
        { k: [[0, 115, 260], [0.3, 115, 260], [0.45, 150, 260], [1, 150, 260]] },
        { k: [[0, 80, 260], [0.32, 80, 260], [0.47, 115, 260], [1, 115, 260]] },
        { k: [[0, 350, 260], [0.78, 350, 260], [0.88, 250, 200], [0.95, 95, 205], [1, 80, 260]] },
        { k: [[0, 385, 260], [0.8, 385, 260], [0.92, 350, 260], [1, 350, 260]] },
        { k: [[0, 420, 260], [0.82, 420, 260], [0.94, 385, 260], [1, 385, 260]] },
      ],
      balls: [[[0, 0], [0.08, 0], [0.25, 3], [0.62, 3], [0.78, 1], [1, 1]]],
      cap: [[0, 0.25, 'Pass across'], [0.25, 0.62, 'Follow your pass to the back of the other line'], [0.62, 1, 'Next pass comes back. Count them!']],
    },
  },
  {
    id: 'piggy', name: 'Piggy in the Middle', slot: 'skill', theme: 'ball',
    need: { balls: 'some', bibs: true },
    steps: [
      'Groups of 3 with one ball: 2 passers stand 4 big steps apart, 1 defender (in a bib) stands in the middle.',
      'Passers can\'t dribble. Pivot and fake to get the ball past the defender.',
      'No passes higher than your head.',
      'If the defender touches the ball, they swap places with the passer who threw it.',
      'Swap the defender every minute anyway, so everyone gets a turn.',
    ],
    say: ['Pivot, don\'t run', 'Fake one way, pass the other', 'Pass past their hip'],
    anim: {
      dur: 6,
      // passers 4 big steps apart. Each pivots and fakes one way, then
      // bounce-passes past the defender's hip on the other side.
      p: [
        { face: [[0, 90], [0.1, 90], [0.15, 45], [0.21, 130], [0.27, 118], [0.4, 90]], k: [[0, 190, 260], [0.12, 190, 260], [0.17, 186, 270], [0.22, 190, 274], [0.3, 190, 260], [1, 190, 260]] },
        { team: 'd', k: [[0, 250, 262], [0.12, 226, 250], [0.24, 222, 244], [0.45, 252, 260], [0.6, 280, 266], [0.72, 282, 272], [0.9, 250, 262], [1, 250, 262]] },
        { face: [[0, -90], [0.55, -90], [0.6, -140], [0.67, -40], [0.75, -62], [0.9, -90]], k: [[0, 310, 260], [0.6, 310, 260], [0.65, 314, 250], [0.7, 310, 246], [0.78, 310, 260], [1, 310, 260]] },
      ],
      balls: [[[0, 0, 'h'], [0.27, 0], [0.34, [250, 290]], [0.42, 2, 'h'], [0.75, 2], [0.82, [250, 226]], [0.9, 0, 'h'], [1, 0, 'h']]],
      cap: [[0, 0.27, 'Pivot and fake'], [0.27, 0.45, 'Pass past their hip'], [0.45, 1, 'Now the other side']],
      key: { a: 'Passers', d: 'In the middle' },
    },
  },
  {
    id: 'triple-threat', name: 'Catch and Triple Threat', slot: 'skill', theme: 'ball',
    need: { balls: 'some' },
    steps: [
      'Pairs with one ball, about 4 big steps apart.',
      'Pass to your partner. They catch it with a jump stop: both feet land together.',
      'Then "triple threat": ball on the hip, knees bent, eyes on the hoop, ready to pass, dribble or shoot.',
      'They pivot away and back on one glued foot, then pass it back. Swap after 5 catches each.',
      'Harder: as they catch, call "pass", "dribble" or "shoot" and they do it.',
    ],
    say: ['Catch and STOP!', 'Ball on your hip, eyes up', 'Pivot, don\'t walk'],
    anim: {
      dur: 7,
      poster: 0.42,
      // the catcher steps in, jump stops, holds triple threat, pivots away and back
      p: [[150, 150], [350, -150]].flatMap(([x, turn]) => [
        { k: [x, 180] },
        { face: [[0, 0], [0.32, 0], [0.42, turn], [0.48, turn], [0.58, 0]], k: [[0, x, 290], [0.12, x, 290], [0.2, x, 272], [0.75, x, 272], [0.85, x, 290], [1, x, 290]] },
      ]),
      balls: [
        [[0, 0], [0.08, 0], [0.2, 1, 'h'], [0.62, 1], [0.74, 0], [1, 0]],
        [[0, 2], [0.08, 2], [0.2, 3, 'h'], [0.62, 3], [0.74, 2], [1, 2]],
      ],
      cap: [[0, 0.2, 'Pass. Catch with a jump stop'], [0.2, 0.32, 'Triple threat: ball on the hip, eyes up'], [0.32, 0.58, 'Pivot away and back'], [0.58, 1, 'Pass it back']],
      key: { a: 'Partners' },
    },
  },
  {
    id: 'follow-leader', name: 'Follow the Leader', slot: 'skill', theme: 'ball',
    need: { balls: 'each' },
    steps: [
      'Pairs, both with a ball. One is the leader.',
      'The leader dribbles anywhere in the half court: fast, slow, stop, turn, swap hands.',
      'Their partner follows about 2 big steps behind and copies everything the leader does.',
      'Blow the whistle every 30 seconds to swap leaders.',
      'Harder: weak hand only, or the leader adds a crossover.',
    ],
    say: ['Eyes up: watch the leader, not your ball', 'Copy their hand', 'Stay 2 big steps behind'],
    anim: {
      dur: 9,
      // leaders loop round, followers copy one step behind
      p: [1, -1].flatMap(side => {
        const loop = [[145, 140], [186, 163], [212, 223], [212, 297], [186, 357], [145, 380], [104, 357], [78, 297], [78, 223], [104, 163], [145, 140]];
        const lead = loop.map(([x, y], j) => [j / 10, side > 0 ? x : 500 - x, y]);
        return [
          { b: 1, hands: [[0, 'R'], [0.4, 'L'], [0.8, 'R']], k: lead },
          { b: 1, team: 'w', hands: [[0, 'R'], [0.5, 'L'], [0.9, 'R']], k: behind(lead) },
        ];
      }),
      cap: [[0, 0.5, 'Leader dribbles: fast, slow, turn, swap hands'], [0.5, 1, 'Partner copies, 2 big steps behind']],
      key: { a: 'Leaders', w: 'Followers' },
    },
  },

  /* ---------------- SKILLS: PUT IT IN THE HOOP ---------------- */
  {
    id: 'layup-steps', name: 'Layup Steps: Right-Left-Up', slot: 'skill', theme: 'score',
    need: { balls: 'each' },
    steps: [
      'Everyone lines up on the right side of the hoop, about 3 big steps away, each holding a ball.',
      'Step with your RIGHT foot, then your LEFT foot, then jump UP off your left foot and lift your right knee.',
      'Shoot with your right hand. Aim for the top corner of the small square on the backboard.',
      'Get your own rebound and go to the back of the line.',
      'Once they\'ve got it walking, add one dribble first, then two. Left side: left foot, right foot, up, left hand.',
    ],
    say: ['Right, left, UP!', 'Hit the top corner of the square', 'Right knee up high'],
    anim: {
      dur: 6,
      // starts about 3 big steps from the hoop: right, left, up
      p: [
        { k: [[0, 322, 128], [0.15, 322, 128], [0.27, 306, 111], [0.39, 291, 96], [0.52, 281, 85], [0.62, 281, 85], [0.72, 262, 78], [0.8, 330, 64], [0.9, 430, 140], [0.98, 378, 184], [1, 378, 184]] },
        { b: 1, k: [[0, 350, 156], [0.62, 350, 156], [0.78, 322, 128], [1, 322, 128]] },
        { b: 1, k: [[0, 378, 184], [0.64, 378, 184], [0.8, 350, 156], [1, 350, 156]] },
      ],
      balls: [[[0, 0, 'h'], [0.52, 0], [0.61, 'hoop'], [0.65, 'hoop'], [0.72, 0], [1, 0]]],
      cap: [[0, 0.15, 'Hold the ball, eyes on the square'], [0.15, 0.27, 'RIGHT foot'], [0.27, 0.39, 'LEFT foot'], [0.39, 0.52, 'UP! Right knee high'], [0.52, 0.66, 'Soft off the backboard'], [0.66, 1, 'Grab your rebound, back of the line']],
    },
  },
  {
    id: 'layup-lines', name: 'Layup Lines', slot: 'skill', theme: 'score',
    need: { balls: 'some' },
    steps: [
      'Make 2 lines near the top of the key: a shooting line on the right (with the balls) and a rebound line on the left.',
      'The first shooter dribbles in and does a right-side layup: right, left, UP.',
      'The first rebounder catches the ball (even if it goes in) and dribbles it to the back of the shooting line.',
      'The shooter goes to the back of the rebound line. Keep it moving!',
      'After 3 minutes, swap sides: left side, left hand, left-right-UP.',
    ],
    say: ['Right, left, UP!', 'Soft off the backboard', 'Rebounders: two hands, every time'],
    anim: {
      dur: 7,
      p: [
        // each goes round the outside of the other line to its back spot
        { k: [[0, 390, 330], [0.1, 390, 330], [0.3, 322, 185], [0.42, 285, 102], [0.48, 285, 102], [0.58, 230, 200], [0.8, 165, 410], [0.92, 50, 394], [1, 50, 394]] },
        { b: 1, k: [[0, 420, 362], [0.42, 420, 362], [0.58, 390, 330], [1, 390, 330]] },
        { b: 1, k: [[0, 450, 394], [0.44, 450, 394], [0.6, 420, 362], [1, 420, 362]] },
        { k: [[0, 110, 330], [0.3, 110, 330], [0.5, 218, 112], [0.56, 222, 118], [0.8, 470, 250], [0.92, 450, 394], [1, 450, 394]] },
        { k: [[0, 80, 362], [0.5, 80, 362], [0.65, 110, 330], [1, 110, 330]] },
        { k: [[0, 50, 394], [0.52, 50, 394], [0.67, 80, 362], [1, 80, 362]] },
      ],
      balls: [[[0, 0], [0.42, 0], [0.5, 'hoop'], [0.53, 'hoop'], [0.57, 3], [1, 3]]],
      cap: [[0, 0.42, 'Dribble in: right, left, UP!'], [0.42, 0.6, 'Rebounder grabs it with two hands'], [0.6, 1, 'Swap lines']],
    },
  },
  {
    id: 'around-hoop', name: 'Around the Hoop', slot: 'skill', theme: 'score',
    need: { balls: 'some', cones: 5 },
    steps: [
      'Put 5 cones in a curve about 2 big steps from the hoop.',
      'Pairs: one shooter, one rebounder. Only 2 pairs at the hoop at a time, starting at opposite ends of the curve.',
      'Shoot from the first cone. Make it, move to the next cone. Miss? Try again (3 tries, then move on anyway).',
      'The rebounder passes the ball back every time. After all 5 cones, swap jobs, then the next pair comes on. Waiting pairs shoot the ball high to each other.',
      'Shoot with BEEF: Balance, Eyes on the hoop, Elbow under the ball, Follow through.',
    ],
    say: ['Elbow under the ball', 'Wave goodbye: follow through!', 'Bend your knees, use your legs'],
    anim: {
      dur: 7,
      // cones about 2 big steps from the hoop
      cones: [[310, 53], [292, 95], [250, 113], [208, 95], [190, 53]],
      p: [
        { k: [[0, 310, 53], [0.27, 310, 53], [0.34, 292, 95], [0.6, 292, 95], [0.67, 250, 113], [1, 250, 113]] },
        { team: 'w', k: [226, 80] },
      ],
      balls: [[[0, 0], [0.06, 0], [0.12, 'hoop'], [0.15, 'hoop'], [0.2, 1], [0.27, 1], [0.36, 0], [0.4, 0], [0.46, 'hoop'], [0.49, 'hoop'], [0.54, 1], [0.62, 1], [0.7, 0], [0.74, 0], [0.8, 'hoop'], [0.83, 'hoop'], [0.88, 1], [1, 1]]],
      cap: [[0, 0.33, 'Make it? Move to the next cone'], [0.33, 0.66, 'Elbow under, follow through'], [0.66, 1, 'Rebounder (green) passes it back']],
      key: { a: 'Shooter', w: 'Rebounder' },
    },
  },
  {
    id: 'hot-spots', name: 'Hot Spots', slot: 'skill', theme: 'score',
    need: { balls: 'some', cones: 2, bibs: true },
    steps: [
      'Split into 2 teams (one in bibs), one team on each side of the key. Each team gets 1 ball and 1 cone, about 2–3 big steps from the hoop.',
      'The first player shoots from the cone, grabs their own rebound, and passes to the next teammate.',
      'Then they run to the back of their line.',
      '1 point for every basket. Count out loud as a team! First team to 10 wins.',
      'Play 3 rounds. Move the cones back one step each round.',
    ],
    say: ['Grab your rebound, fast!', 'Bend and shoot', 'Count out loud!'],
    anim: {
      dur: 6,
      // cones 2–3 big steps from the hoop; shooters run round the outside of their line
      cones: [[204, 112], [296, 112]],
      p: [
        { k: [[0, 204, 112], [0.16, 204, 112], [0.26, 228, 82], [0.33, 228, 82], [0.4, 150, 85], [0.52, 95, 170], [0.6, 123, 217], [1, 123, 217]] },
        { k: [[0, 177, 147], [0.42, 177, 147], [0.55, 204, 112], [1, 204, 112]] },
        { k: [[0, 150, 182], [0.5, 150, 182], [0.62, 177, 147], [1, 177, 147]] },
        { team: 'w', k: [[0, 296, 112], [0.26, 296, 112], [0.36, 272, 82], [0.43, 272, 82], [0.5, 350, 85], [0.62, 405, 170], [0.7, 377, 217], [1, 377, 217]] },
        { team: 'w', k: [[0, 323, 147], [0.52, 323, 147], [0.65, 296, 112], [1, 296, 112]] },
        { team: 'w', k: [[0, 350, 182], [0.6, 350, 182], [0.72, 323, 147], [1, 323, 147]] },
      ],
      balls: [
        [[0, 0], [0.08, 0], [0.15, 'hoop'], [0.18, 'hoop'], [0.26, 0], [0.32, 0], [0.42, 1], [0.62, 1], [0.7, 'hoop'], [0.74, 'hoop'], [0.8, [232, 96]], [1, [232, 96]]],
        [[0, 3], [0.18, 3], [0.25, 'hoop'], [0.28, 'hoop'], [0.36, 3], [0.42, 3], [0.52, 4], [0.72, 4], [0.8, 'hoop'], [0.84, 'hoop'], [0.9, [268, 96]], [1, [268, 96]]],
      ],
      cap: [[0, 0.3, 'Shoot, then grab your own rebound'], [0.3, 0.55, 'Pass to the next player'], [0.55, 1, '1 point for every basket!']],
      key: { a: 'Team 1', w: 'Team 2 (bibs)' },
    },
  },
  {
    id: 'jump-stop-finish', name: 'Jump Stop Finish', slot: 'skill', theme: 'score',
    need: { balls: 'each' },
    steps: [
      'One line at the top of the key, everyone with a ball.',
      'Dribble straight at the hoop. Jump stop just in front of it: both feet land together.',
      'Ball to your chin, then jump up off both feet and lay it in off the backboard.',
      'Get your rebound and dribble back to the line around the outside.',
      'Harder: a teammate walks behind you waving their arms. Stay strong and finish!',
    ],
    say: ['Stop strong on two feet', 'Chin, then UP!', 'Use the backboard'],
    anim: {
      dur: 6,
      p: [
        { k: [[0, 250, 330], [0.1, 250, 330], [0.35, 250, 122], [0.5, 250, 122], [0.56, 252, 112], [0.68, 262, 88], [0.78, 390, 230], [0.9, 330, 445], [1, 250, 400]] },
        { b: 1, k: [[0, 250, 365], [0.32, 250, 365], [0.46, 250, 330], [1, 250, 330]] },
        { b: 1, k: [[0, 250, 400], [0.34, 250, 400], [0.48, 250, 365], [1, 250, 365]] },
      ],
      balls: [[[0, 0], [0.35, 0], [0.5, 0, 'h'], [0.56, 0], [0.62, 'hoop'], [0.65, 'hoop'], [0.7, 0], [1, 0]]],
      cap: [[0.08, 0.35, 'Dribble at the hoop'], [0.35, 0.5, 'JUMP STOP! Ball to your chin'], [0.5, 0.66, 'Up off two feet, off the backboard'], [0.66, 1, 'Rebound, dribble back around the outside']],
    },
  },
  {
    id: 'beat-coach', name: 'Beat the Coach', slot: 'skill', theme: 'score',
    need: { balls: 'each', cones: 2 },
    steps: [
      'Put a cone each side of the hoop, about 2–3 big steps away, with a line behind each. Everyone has a ball.',
      'Take turns, left then right: shoot from the cone, grab your own rebound and dribble round the outside to the back of your line.',
      'Every basket = 1 point for the team. Every miss = 1 point for the coach. First to 10 wins!',
      'While you wait, shoot your ball straight up and catch it (BEEF).',
      'Team won easily? Everyone takes one step back next round.',
    ],
    say: ['Bend your knees, then shoot', 'Follow through: wave goodbye', 'Team point!'],
    anim: {
      dur: 8,
      cones: [[204, 112], [296, 112]],
      p: [
        { k: [[0, 204, 112], [0.08, 204, 112], [0.2, 228, 82], [0.27, 228, 82], [0.34, 150, 85], [0.46, 95, 170], [0.54, 123, 217], [1, 123, 217]] },
        { b: 1, k: [[0, 177, 147], [0.3, 177, 147], [0.42, 204, 112], [1, 204, 112]] },
        { b: 1, k: [[0, 150, 182], [0.36, 150, 182], [0.48, 177, 147], [1, 177, 147]] },
        { k: [[0, 296, 112], [0.48, 296, 112], [0.6, 272, 82], [0.67, 272, 82], [0.74, 350, 85], [0.86, 405, 170], [0.94, 377, 217], [1, 377, 217]] },
        { b: 1, k: [[0, 323, 147], [0.7, 323, 147], [0.82, 296, 112], [1, 296, 112]] },
        { b: 1, k: [[0, 350, 182], [0.76, 350, 182], [0.88, 323, 147], [1, 323, 147]] },
      ],
      balls: [
        [[0, 0], [0.08, 0], [0.15, 'hoop'], [0.18, 'hoop'], [0.24, 0], [1, 0]],
        [[0, 3], [0.48, 3], [0.55, 'hoop'], [0.58, 'hoop'], [0.64, 3], [1, 3]],
      ],
      cap: [[0, 0.24, 'Shoot, grab your own rebound'], [0.24, 0.5, 'Basket = team point. Miss = coach point'], [0.5, 1, 'Now the other side. First to 10 wins!']],
    },
  },
  {
    id: 'three-line-layups', name: 'Three-Line Layups', slot: 'skill', theme: 'score',
    need: { balls: 'each' },
    steps: [
      'Everyone has a ball. Make 3 lines: right wing, left wing and the top of the key.',
      'Go one at a time, in order: right, left, top. The next player goes when the shot goes up.',
      'Right wing: right-side layup (right, left, UP). Left wing: left-side layup (left, right, UP). Top: dribble in, jump stop, then UP.',
      'Grab your rebound and go round the outside to the next line: right → left → top → right.',
      'Count the team\'s baskets in 2 minutes. Beat it next round!',
    ],
    say: ['Right, left, UP!', 'Go when the shot goes up', 'Count out loud!'],
    anim: {
      dur: 12,
      p: [
        // right wing: layup, then along the baseline and down the side to the left line
        { k: [[0, 415, 230], [0.02, 415, 230], [0.1, 360, 170], [0.16, 322, 122], [0.2, 292, 96], [0.26, 268, 80], [0.3, 330, 40], [0.33, 330, 16], [0.45, 18, 16], [0.52, 18, 200], [0.6, 25, 294], [1, 25, 294]] },
        { b: 1, k: [[0, 445, 262], [0.06, 445, 262], [0.16, 415, 230], [1, 415, 230]] },
        { b: 1, k: [[0, 475, 294], [0.08, 475, 294], [0.18, 445, 262], [1, 445, 262]] },
        // left wing: layup, then round to the top line
        { k: [[0, 85, 230], [0.33, 85, 230], [0.41, 140, 170], [0.47, 178, 122], [0.51, 208, 96], [0.57, 232, 80], [0.62, 170, 200], [0.72, 190, 420], [0.78, 250, 400], [1, 250, 400]] },
        { b: 1, k: [[0, 55, 262], [0.37, 55, 262], [0.47, 85, 230], [1, 85, 230]] },
        { b: 1, k: [[0, 25, 294], [0.39, 25, 294], [0.49, 55, 262], [1, 55, 262]] },
        // top: jump stop finish, then round to the right line
        { k: [[0, 250, 330], [0.62, 250, 330], [0.7, 250, 200], [0.74, 250, 125], [0.77, 250, 125], [0.79, 252, 112], [0.84, 264, 86], [0.88, 340, 110], [0.95, 480, 205], [1, 476, 294]] },
        { b: 1, k: [[0, 250, 365], [0.66, 250, 365], [0.76, 250, 330], [1, 250, 330]] },
        { b: 1, k: [[0, 250, 400], [0.68, 250, 400], [0.78, 250, 365], [1, 250, 365]] },
      ],
      balls: [
        [[0, 0], [0.2, 0], [0.23, 'hoop'], [0.25, 'hoop'], [0.28, 0], [1, 0]],
        [[0, 3], [0.51, 3], [0.54, 'hoop'], [0.56, 'hoop'], [0.59, 3], [1, 3]],
        [[0, 6], [0.74, 6, 'h'], [0.79, 6], [0.81, 'hoop'], [0.83, 'hoop'], [0.86, 6], [1, 6]],
      ],
      cap: [[0, 0.31, 'Right wing: right, left, UP'], [0.31, 0.6, 'Left wing: left, right, UP'], [0.6, 1, 'Top: jump stop, then UP. Everyone joins the next line round']],
    },
  },

  /* ---------------- SKILLS: STOP THEM SCORING ---------------- */
  {
    id: 'mirror', name: 'Defence Mirror', slot: 'skill', theme: 'defence',
    need: {},
    steps: [
      'Pairs, facing each other, about 2 big steps apart. No ball yet.',
      'One player is the leader and shuffles side to side. The other copies them, like a mirror.',
      'The defender stays low: feet wide, knees bent, hands up and out. Slide your feet. Don\'t cross them.',
      'Go for 20 seconds, then swap.',
      'Then give the leader a ball to dribble while the defender mirrors them.',
    ],
    say: ['Low and wide, like sitting on a chair', 'Slide, don\'t cross', 'Busy hands!'],
    anim: {
      dur: 5,
      p: [
        { k: [[0, 150, 190], [0.2, 95, 190], [0.45, 200, 190], [0.7, 115, 190], [1, 150, 190]] },
        { team: 'd', k: [[0, 146, 270], [0.06, 150, 270], [0.26, 95, 270], [0.51, 200, 270], [0.76, 115, 270], [1, 146, 270]] },
        { k: [[0, 350, 190], [0.25, 410, 190], [0.5, 300, 190], [0.75, 385, 190], [1, 350, 190]] },
        { team: 'd', k: [[0, 346, 270], [0.06, 350, 270], [0.31, 410, 270], [0.56, 300, 270], [0.81, 385, 270], [1, 346, 270]] },
      ],
      cap: [[0, 0.5, 'Leader (blue) shuffles side to side'], [0.5, 1, 'Defender (red) copies: low and wide']],
      key: { a: 'Leaders' },
    },
  },
  {
    id: 'zigzag', name: 'Zig-Zag Slides', slot: 'skill', theme: 'defence',
    need: { cones: 5 },
    steps: [
      'Set out 5 cones in a zig-zag up the court, about 3 big steps apart.',
      'Start at the first cone in your defence stance: feet wide, knees bent, hands out.',
      'Slide to the next cone without crossing your feet. Turn, then slide to the next one.',
      'Jog back down the side and go again. Start the next player when the one in front reaches the second cone.',
      'Harder: add a partner who dribbles the zig-zag slowly while you guard them.',
    ],
    say: ['Push off your back foot', 'Stay low, don\'t bounce up', 'Never cross your feet'],
    anim: {
      dur: 7,
      // cones about 3 big steps apart
      cones: [[190, 420], [270, 365], [190, 310], [270, 255], [190, 200]],
      p: [
        { team: 'd', k: [[0, 190, 420], [0.15, 270, 365], [0.3, 190, 310], [0.45, 270, 255], [0.6, 190, 200], [0.72, 100, 250], [0.95, 100, 440], [1, 100, 440]] },
        { team: 'd', k: [[0, 160, 470], [0.15, 160, 470], [0.25, 190, 420], [0.4, 270, 365], [0.55, 190, 310], [0.7, 270, 255], [0.85, 190, 200], [1, 190, 200]] },
      ],
      cap: [[0, 0.6, 'Slide, don\'t cross your feet'], [0.6, 1, 'Jog back down the side']],
    },
  },
  {
    id: 'find-player', name: 'Find Your Player', slot: 'skill', theme: 'defence',
    need: { bibs: true },
    steps: [
      'Split into 2 teams (one in bibs). Number the players in each team 1, 2, 3, 4.',
      'Each defender guards the attacker with the SAME number.',
      'Attackers walk around the half court (no ball yet). Defenders stay between their player and the hoop, pointing at them.',
      'Shout "Freeze!" Everyone stops. Check: is every defender between their player and the basket?',
      'Then add a ball: attackers pass (no dribbling) and defenders stay with their number.',
    ],
    say: ['Ball, you, hoop: stay in between!', 'Point at your player', 'Talk: "I\'ve got 2!"'],
    anim: {
      dur: 8,
      p: [
        { n: 1, k: [[0, 85, 230], [0.28, 60, 110], [0.56, 140, 300], [0.82, 85, 230], [1, 85, 230]] },
        { n: 2, k: [[0, 415, 230], [0.28, 440, 110], [0.56, 360, 320], [0.82, 415, 230], [1, 415, 230]] },
        { n: 3, k: [[0, 250, 340], [0.28, 180, 260], [0.56, 295, 285], [0.82, 250, 340], [1, 250, 340]] },
        { n: 4, k: [[0, 330, 120], [0.28, 210, 110], [0.56, 170, 170], [0.82, 330, 120], [1, 330, 120]] },
        { team: 'd', n: 1, guard: 0, lag: 0.03 },
        { team: 'd', n: 2, guard: 1, lag: 0.03 },
        { team: 'd', n: 3, guard: 2, lag: 0.03 },
        { team: 'd', n: 4, guard: 3, lag: 0.03 },
      ],
      cap: [[0, 0.82, 'Red 1 guards blue 1, red 2 guards blue 2...'], [0.82, 1, 'FREEZE! Is everyone between their player and the hoop?']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'closeouts', name: 'Closeouts', slot: 'skill', theme: 'defence',
    need: { balls: 'some' },
    steps: [
      'Defenders line up on the baseline next to the hoop. The first one has a ball. One attacker stands on the wing.',
      'The defender passes to the attacker, then sprints out towards them.',
      'Halfway there, switch to short, quick "chop chop" steps with one hand up high.',
      'Stop in your stance, an arm\'s length away. The attacker counts "1, 2, 3" then tries to dribble past. Stay in front!',
      'The defender becomes the next attacker. The attacker goes to the back of the defender line.',
    ],
    say: ['Sprint, then chop-chop-chop', 'High hand!', 'Stop an arm\'s length away'],
    anim: {
      dur: 7,
      p: [
        { team: 'd', k: [[0, 330, 25], [0.12, 330, 25], [0.3, 180, 140], [0.43, 128, 188], [0.55, 128, 188], [0.8, 195, 248], [1, 195, 248]] },
        { team: 'd', k: [[0, 365, 25], [0.3, 365, 25], [0.45, 330, 25], [1, 330, 25]] },
        { team: 'd', k: [[0, 400, 25], [0.32, 400, 25], [0.47, 365, 25], [1, 365, 25]] },
        { k: [[0, 85, 230], [0.58, 85, 230], [0.82, 160, 290], [1, 160, 290]] },
      ],
      balls: [[[0, 0], [0.08, 0], [0.2, 3], [1, 3]]],
      cap: [[0, 0.12, 'Pass out to the wing'], [0.12, 0.3, 'Sprint!'], [0.3, 0.45, 'Chop, chop, chop. High hand!'], [0.45, 0.58, 'Stance: an arm\'s length away'], [0.58, 1, 'They dribble. Stay in front!']],
      key: { a: 'Attacker' },
    },
  },
  {
    id: 'box-out', name: 'Box Out Battle', slot: 'skill', theme: 'defence',
    need: { balls: 'some', bibs: true },
    steps: [
      'Two pairs at a time, one on each side of the key: an attacker, and a defender (in a bib) between them and the hoop. The other pairs wait at the 3-point line.',
      'You (the coach) shoot from the top.',
      'When the shot goes up, the defender turns, puts their back against the attacker, bends their knees and spreads their arms wide. The attacker tries to get around them to the ball.',
      'Hold them out until the ball bounces, then grab it with 2 hands. No pushing with your hands!',
      'After each shot the next 2 pairs come on. Swap jobs with your partner each turn.',
    ],
    say: ['Find them, turn, sit!', 'Arms out wide like wings', 'Grab it with two hands'],
    anim: {
      dur: 6,
      p: [
        { team: 'c', k: [250, 330] },
        { k: [[0, 150, 190], [0.2, 150, 190], [0.32, 165, 175], [0.45, 180, 182], [0.55, 168, 186], [1, 168, 186]] },
        { team: 'd', k: [[0, 176, 154], [0.2, 176, 154], [0.3, 186, 150], [0.45, 196, 154], [0.55, 196, 150], [0.64, 228, 126], [1, 228, 126]] },
        { k: [[0, 360, 200], [0.2, 360, 200], [0.35, 345, 182], [0.5, 330, 190], [1, 330, 190]] },
        { team: 'd', k: [[0, 333, 164], [0.2, 333, 164], [0.35, 322, 152], [0.5, 310, 158], [1, 310, 158]] },
      ],
      balls: [[[0, 0], [0.15, 0], [0.3, 'hoop'], [0.35, 'hoop'], [0.45, [240, 118]], [0.56, [240, 118]], [0.64, 2], [1, 2]]],
      cap: [[0, 0.2, 'Coach shoots'], [0.2, 0.52, 'Find them, turn, sit: BOX OUT!'], [0.52, 1, 'Ball bounces. Grab it with 2 hands']],
      key: { a: 'Attackers', d: 'Defenders (bibs)' },
    },
  },
  {
    id: 'gates', name: '1 v 1 Gates', slot: 'skill', theme: 'defence',
    need: { balls: 'some', cones: 10 },
    steps: [
      'Make a "gate" for each pair: 2 cones, 2 big steps apart. Spread the gates out.',
      'The defender stands in front of their gate. The attacker starts 4 big steps away with a ball.',
      'The attacker dribbles and tries to get through the gate. The defender slides to stay in front, without reaching in.',
      'Through the gate = 1 point. Defender stops them for 5 seconds or gets the ball = 1 point. Swap jobs.',
    ],
    say: ['Stay in front: slide, slide!', 'Low and wide', 'No reaching: move your feet'],
    anim: {
      dur: 6,
      cones: [[110, 170], [164, 170], [336, 170], [390, 170]],
      p: [
        { b: 1, face: 0, hands: [[0, 'R'], [0.3, 'L'], [0.52, 'R']], k: [[0, 137, 300], [0.15, 137, 262], [0.38, 92, 250], [0.6, 182, 250], [0.8, 137, 262], [1, 137, 300]] },
        { team: 'd', k: [[0, 137, 200], [0.2, 137, 200], [0.42, 98, 200], [0.64, 176, 200], [0.84, 137, 200], [1, 137, 200]] },
        { b: 1, face: 0, hands: [[0, 'L'], [0.34, 'R'], [0.56, 'L']], k: [[0, 363, 300], [0.15, 363, 262], [0.4, 408, 250], [0.62, 318, 250], [0.82, 363, 262], [1, 363, 300]] },
        { team: 'd', k: [[0, 363, 200], [0.2, 363, 200], [0.44, 402, 200], [0.66, 324, 200], [0.86, 363, 200], [1, 363, 200]] },
      ],
      cap: [[0, 0.15, 'Attacker dribbles at the gate'], [0.15, 0.66, 'Defender slides to stay in front'], [0.66, 1, 'Stopped! Defender\'s point']],
      key: { a: 'Attackers', d: 'Defenders' },
    },
  },
  {
    id: 'ball-moves', name: 'Ball Moves, You Move', slot: 'skill', theme: 'defence',
    need: { balls: 'some', bibs: true },
    steps: [
      '4 attackers stand on spots around the 3-point line, one with the ball. 4 defenders (in bibs), one each.',
      'Attackers pass the ball round slowly. No dribbling, no running.',
      'Your player has the ball? Get close: an arm\'s length away, hands up.',
      'They don\'t? Take 2 big steps towards the hoop and point at them. Move every time the ball moves!',
      'Shout "Freeze!" to check everyone\'s spot. Swap after 2 minutes. Then let the attackers cut.',
    ],
    say: ['Ball moves, you move!', 'Your player has it? Get close', 'No ball? Step to the hoop and point'],
    anim: {
      dur: 12,
      p: [
        { k: LW }, { k: [180, 330] }, { k: [320, 330] }, { k: RW },
        // close while their player has the ball, 2 big steps towards the hoop while they don't
        { team: 'd', k: [[0, 143, 168], [0.04, 143, 168], [0.1, 107, 207], [0.2, 107, 207], [0.26, 143, 168], [1, 143, 168]] },
        { team: 'd', k: [[0, 188, 299], [0.04, 188, 299], [0.1, 201, 248], [0.2, 201, 248], [0.26, 188, 299], [0.36, 188, 299], [0.42, 201, 248], [0.84, 201, 248], [0.9, 188, 299], [1, 188, 299]] },
        { team: 'd', k: [[0, 299, 248], [0.36, 299, 248], [0.42, 312, 299], [0.52, 312, 299], [0.58, 299, 248], [0.68, 299, 248], [0.74, 312, 299], [0.84, 312, 299], [0.9, 299, 248], [1, 299, 248]] },
        { team: 'd', k: [[0, 357, 168], [0.52, 357, 168], [0.58, 393, 207], [0.68, 393, 207], [0.74, 357, 168], [1, 357, 168]] },
      ],
      balls: [[[0, 1], [0.04, 1], [0.1, 0], [0.2, 0], [0.26, 1], [0.36, 1], [0.42, 2], [0.52, 2], [0.58, 3], [0.68, 3], [0.74, 2], [0.84, 2], [0.9, 1], [1, 1]]],
      cap: [[0, 0.36, 'Your player has it? Get close, hands up'], [0.36, 1, 'Ball moved? Step to the hoop and point at them']],
      key: { a: 'Attackers', d: 'Defenders (bibs)' },
    },
  },

  /* ---------------- SKILLS: SPREAD OUT & GET OPEN ---------------- */
  {
    id: 'spacing-spots', name: 'Spacing Spots', slot: 'skill', theme: 'sense',
    need: { balls: 'some', cones: 5 },
    steps: [
      'Put 5 cones out: 1 at the top, 1 on each wing, 1 in each corner. These are the "spots".',
      '4 players stand on a spot each, so one spot is empty. One player has the ball. Others wait and swap in.',
      'Pass the ball to a teammate. Then run to the EMPTY spot.',
      'Keep going: pass, then run to the empty spot. No dribbling. Never stand next to a teammate.',
      'Shout "Freeze!" now and then. Is everyone on a different spot? Then add 1 or 2 defenders.',
    ],
    say: ['Find the empty spot!', 'Stay far apart, never bunch', 'Hands up, call for it'],
    anim: {
      dur: 7,
      cones: [TOP, LW, RW, LC, RC],
      p: [
        { k: [[0, ...TOP], [0.22, ...TOP], [0.32, 330, 190], [0.45, ...RC], [1, ...RC]] },
        { k: LW },
        { k: [[0, ...RW], [0.67, ...RW], [0.85, ...TOP], [1, ...TOP]] },
        { k: LC },
      ],
      balls: [[[0, 0], [0.1, 0], [0.22, 2], [0.55, 2], [0.67, 0], [1, 0]]],
      cap: [[0, 0.22, 'Pass'], [0.22, 0.5, 'Run to the empty spot'], [0.5, 0.67, 'Pass again'], [0.67, 1, 'Run to the empty spot']],
    },
  },
  {
    id: 'give-and-go', name: 'Give-and-Go', slot: 'skill', theme: 'sense',
    need: { balls: 'some' },
    steps: [
      'Make 2 lines: one at the top of the key (with the balls) and one on the right wing.',
      'The first player at the top passes to the wing.',
      'Then they cut (run fast) straight to the hoop with their hand up.',
      'The wing passes it back. The cutter catches it and does a layup.',
      'The passer goes to the back of the top line. The cutter grabs their rebound and goes to the wing line. After a few minutes, use the left wing.',
    ],
    say: ['Pass and GO!', 'Hand up: show where you want it', 'Cut hard, not a jog'],
    anim: {
      dur: 7,
      p: [
        // both go round the outside of the line they're joining
        { k: [[0, ...TOP], [0.2, ...TOP], [0.28, 268, 290], [0.45, 288, 122], [0.52, 278, 98], [0.62, 278, 98], [0.7, 252, 92], [0.85, 470, 170], [0.95, 445, 262], [1, 445, 262]] },
        { b: 1, k: [[0, 250, 365], [0.3, 250, 365], [0.45, 250, 330], [1, 250, 330]] },
        { b: 1, k: [[0, 250, 400], [0.32, 250, 400], [0.47, 250, 365], [1, 250, 365]] },
        { k: [[0, ...RW], [0.45, ...RW], [0.7, 330, 420], [0.8, 250, 400], [1, 250, 400]] },
        { k: [[0, 445, 262], [0.5, 445, 262], [0.65, ...RW], [1, ...RW]] },
      ],
      // the cutter catches and goes straight up for the layup (no dribble)
      balls: [[[0, 0], [0.08, 0], [0.2, 3], [0.33, 3], [0.45, 0, 'h'], [0.52, 0], [0.6, 'hoop'], [0.64, 'hoop'], [0.7, 0], [1, 0]]],
      cap: [[0, 0.2, 'Pass to the wing'], [0.2, 0.45, 'Cut to the hoop, hand up!'], [0.45, 0.66, 'Catch it back, lay it up'], [0.66, 1, 'Swap lines']],
    },
  },
  {
    id: 'two-v-one', name: '2 v 1', slot: 'skill', theme: 'sense',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 attackers start at half way with a ball, spread wide. 1 defender (in a bib) waits at the free-throw line.',
      'The player with the ball dribbles straight at the hoop.',
      'If the defender comes to stop them, PASS to the open teammate. If the defender doesn\'t, keep going and lay it up.',
      'Play until there\'s a basket or the defender gets the ball. Then rotate: an attacker becomes the defender.',
      'When they\'ve got it, play 3 v 2.',
    ],
    say: ['Make them stop you, then pass', 'Stay wide, don\'t come to the ball', 'Go hard to the hoop'],
    anim: {
      dur: 6,
      p: [
        { k: [[0, 180, 440], [0.38, 215, 240], [1, 215, 240]] },
        { k: [[0, 360, 440], [0.45, 345, 220], [0.55, 328, 168], [0.65, 282, 102], [1, 282, 102]] },
        { team: 'd', k: [[0, 250, 200], [0.3, 236, 214], [0.4, 222, 205], [0.55, 252, 188], [0.7, 270, 140], [1, 270, 140]] },
      ],
      balls: [[[0, 0], [0.42, 0], [0.55, 1], [0.65, 1], [0.72, 'hoop'], [0.76, 'hoop'], [0.82, [250, 88]], [1, [250, 88]]]],
      cap: [[0, 0.4, 'Dribble straight at the hoop'], [0.4, 0.55, 'Defender stops you? PASS!'], [0.55, 1, 'Open player scores']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'keepings-off', name: 'No-Dribble Keepings Off', slot: 'skill', theme: 'sense',
    need: { balls: 'some', bibs: true },
    steps: [
      'Split into 2 teams with bibs: 3 v 3 or 4 v 4 on the half court.',
      'No dribbling allowed. Pass only!',
      'The team with the ball tries to make 5 passes in a row. That\'s 1 point.',
      'Without the ball, move into empty space and call for it. The defence tries to intercept.',
      'If you\'re standing next to a teammate, one of you must move away.',
    ],
    say: ['Move to empty space!', 'Pass and move', 'Call their name'],
    anim: {
      dur: 7,
      // passes go round the outside, away from the hoop side where the defenders stand
      p: [
        { k: [[0, 110, 250], [0.3, 80, 170], [0.6, 130, 330], [1, 110, 250]] },
        { k: [[0, 390, 250], [0.3, 420, 330], [0.6, 370, 170], [1, 390, 250]] },
        { k: [[0, 250, 360], [0.3, 300, 400], [0.6, 200, 400], [1, 250, 360]] },
        { team: 'd', guard: 0, lag: 0.05 },
        { team: 'd', guard: 1, lag: 0.05 },
        { team: 'd', guard: 2, lag: 0.05 },
      ],
      balls: [[[0, 0], [0.15, 0], [0.25, 1], [0.3, 1], [0.4, 2], [0.65, 2], [0.75, 0], [1, 0]]],
      cap: [[0, 0.25, 'Pass only, no dribbling'], [0.25, 0.4, '1 pass...'], [0.4, 0.75, '2 passes... move to empty space'], [0.75, 1, '3 passes... keep going to 5!']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'throw-in', name: 'Throw-in Practice', slot: 'skill', theme: 'sense',
    need: { balls: 'some', bibs: true },
    steps: [
      'One player takes the ball out over the sideline. 2 teammates are on the court, with 2 defenders (in bibs).',
      'The thrower has 5 seconds. Everyone counts out loud. They can\'t step on the line.',
      'Teammates: run away from the ball first, then come back to it fast (a "V" cut). Hand up!',
      'Catch with 2 hands, turn and face the hoop.',
      'Swap the thrower and defenders every 3 throw-ins. Practise from the baseline too.',
    ],
    say: ['Count to 5!', 'Fake away, then come back hard', 'Two hands on the catch'],
    anim: {
      dur: 6,
      p: [
        { k: [508, 260] },
        // catches facing the thrower, then turns to face the hoop
        { face: [[0.58, 90], [0.72, 'hoop']], k: [[0, 380, 270], [0.25, 300, 330], [0.45, 438, 250], [1, 438, 250]] },
        { k: [[0, 260, 210], [0.5, 320, 110], [1, 320, 110]] },
        { team: 'd', guard: 1, lag: 0.06 },
        { team: 'd', guard: 2, lag: 0.06 },
      ],
      balls: [[[0, 0, 'h'], [0.45, 0], [0.58, 1], [1, 1]]],
      cap: [[0, 0.22, 'Thrower counts: 1, 2, 3...'], [0.22, 0.45, 'Run away, then come back hard'], [0.45, 1, 'Two-hand catch, face the hoop']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'v-cut', name: 'V-Cut and Catch', slot: 'skill', theme: 'sense',
    need: { balls: 'some' },
    steps: [
      'Pairs with one ball: a passer at the top and a cutter on the wing. Use both sides.',
      'The cutter walks 2 big steps towards the hoop. That\'s the fake.',
      'Then they push off and run straight back out to the wing with their hand up: a "V".',
      'Pass to their hand. They catch, jump stop and turn to face the hoop.',
      'Pass back and go again. Swap jobs after 5 goes.',
    ],
    say: ['Fake in, then come back hard', 'Hand up: show your target', 'Catch and face the hoop'],
    anim: {
      dur: 7,
      // the cutter turns to face the hoop after the catch, then back to pass
      p: [1, -1].flatMap(side => {
        const x = v => (side > 0 ? v : 500 - v);
        return [
          { k: [x(180), 330] },
          { face: [[0, 133 * side], [0.52, 133 * side], [0.6, 'hoop'], [0.68, 'hoop'], [0.74, 133 * side]], k: [[0, x(85), 230], [0.1, x(85), 230], [0.3, x(122), 191], [0.36, x(122), 191], [0.5, x(78), 236], [0.6, x(78), 236], [0.9, x(85), 230], [1, x(85), 230]] },
        ];
      }),
      balls: [
        [[0, 0, 'h'], [0.44, 0], [0.52, 1], [0.75, 1], [0.84, 0], [1, 0, 'h']],
        [[0, 2, 'h'], [0.44, 2], [0.52, 3], [0.75, 3], [0.84, 2], [1, 2, 'h']],
      ],
      cap: [[0, 0.36, 'Walk in 2 big steps (the fake)'], [0.36, 0.52, 'Push off, come back out, hand up!'], [0.52, 0.75, 'Catch, jump stop, face the hoop'], [0.75, 1, 'Pass back. Go again']],
    },
  },
  {
    id: 'pass-cut-fill', name: 'Pass, Cut, Fill', slot: 'skill', theme: 'sense',
    need: { balls: 'some' },
    steps: [
      'Groups of 4: one at the top with the ball, one on each wing, one in a corner. The other group passes in pairs at half way, and swap every 2 minutes.',
      'Pass to a wing, then cut straight to the hoop with your hand up.',
      'No pass back? Keep going, out to the empty corner.',
      'Everyone else moves up a spot to fill the gap, so all the spots are full again.',
      'Keep going: pass, cut, fill. After 4 passes, give the cutter the ball for a layup.',
    ],
    say: ['Pass and cut!', 'Fill the empty spot', 'Spread out: one player per spot'],
    anim: {
      dur: 9,
      p: [
        { k: [[0, ...TOP], [0.15, ...TOP], [0.22, 268, 250], [0.35, 285, 125], [0.42, 330, 90], [0.55, ...RC], [1, ...RC]] },
        { k: [[0, ...LW], [0.2, ...LW], [0.45, ...TOP], [1, ...TOP]] },
        { k: RW },
        { k: [[0, ...LC], [0.3, ...LC], [0.55, ...LW], [1, ...LW]] },
      ],
      balls: [[[0, 0, 'h'], [0.08, 0], [0.15, 2], [0.65, 2], [0.75, 1], [1, 1]]],
      cap: [[0, 0.15, 'Pass to the wing'], [0.15, 0.38, 'Cut to the hoop, hand up'], [0.38, 0.6, 'No pass? Out to the empty corner. Everyone moves up a spot'], [0.6, 1, 'Spots full again. Pass and cut!']],
    },
  },

  /* ---------------- TEAM GAMES ---------------- */
  {
    id: 'three-pass', name: 'Three-Pass Game', slot: 'game', theme: 'sense',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 teams with bibs: 4 v 4 (or 5 v 5) on the half court. Swap extra players in every 2 minutes. Spare balls go in the bag so nobody trips.',
      'Normal basketball, with one rule: your team must make 3 passes before anyone can shoot.',
      'Everyone counts the passes out loud.',
      'When the defence gets the ball, they take it out past the 3-point line before they attack.',
      'Basket = 2 points. Keep score out loud so everyone knows.',
    ],
    say: ['Count the passes out loud!', 'Spread out, give them space', 'Hands up on defence'],
    anim: {
      dur: 8,
      p: [
        { k: [[0, 250, 320], [0.4, 280, 330], [1, 280, 330]] },
        { k: [[0, ...LW], [0.32, ...LW], [0.5, 190, 140], [1, 190, 140]] },
        { k: [[0, ...RW], [0.3, ...RW], [0.5, 385, 280], [1, 385, 280]] },
        { k: [[0, 440, 75], [0.28, 420, 112], [1, 420, 112]] },
        { team: 'd', guard: 0, lag: 0.04 },
        { team: 'd', guard: 1, lag: 0.08 },
        { team: 'd', guard: 2, lag: 0.04 },
        { team: 'd', guard: 3, lag: 0.04 },
      ],
      // pass 3 is a bounce pass, away from the passer's defender
      balls: [[[0, 0], [0.08, 0], [0.18, 2], [0.28, 2], [0.38, 3], [0.48, 3], [0.53, [330, 190]], [0.58, 1], [0.62, 1], [0.7, 'hoop'], [0.74, 'hoop'], [0.8, [250, 92]], [1, [250, 92]]]],
      cap: [[0.08, 0.28, 'Pass 1!'], [0.28, 0.48, 'Pass 2!'], [0.48, 0.62, 'Pass 3!'], [0.62, 1, 'Now you can shoot']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'freeze-game', name: 'Freeze Game', slot: 'game', theme: 'sense',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 teams with bibs: 4 v 4 on the half court. Swap extra players in every 2 minutes. Spare balls go in the bag so nobody trips.',
      'Play normal basketball.',
      'Every 30–60 seconds, blow your whistle and shout "FREEZE!" Everyone stops like a statue.',
      'Check: are 2 attackers close enough to touch? Then the other team gets the ball. Is every defender between their player and the hoop? Defence gets a point.',
      'Fix it ("Move away from your teammate"), then play on.',
    ],
    say: ['FREEZE!', 'Could you touch a teammate? Move!', 'Find your space'],
    anim: {
      dur: 8,
      p: [
        { k: [[0, 250, 330], [0.62, 228, 250], [1, 228, 250]] },
        { k: [[0, ...LW], [0.62, 190, 268], [0.8, 190, 268], [0.96, 80, 205], [1, 80, 205]] },
        { k: [[0, ...RW], [0.62, 400, 200], [1, 400, 200]] },
        { k: [[0, 60, 80], [0.62, 125, 70], [1, 125, 70]] },
        { team: 'd', guard: 0, lag: 0.04 },
        { team: 'd', guard: 1, lag: 0.04 },
        { team: 'd', guard: 2, lag: 0.04 },
        { team: 'd', guard: 3, lag: 0.04 },
      ],
      balls: [[[0, 0], [0.62, 0], [1, 0, 'h']]],
      cap: [[0, 0.62, 'Play normal basketball'], [0.62, 0.8, 'FREEZE! Two blues too close together'], [0.8, 1, 'Move apart, then play on']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'matchup-game', name: 'Matchup Game', slot: 'game', theme: 'defence',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 teams with bibs: 4 v 4 on the half court. Give everyone a number, 1 to 4, in each team. Spare balls go in the bag so nobody trips.',
      'You can only guard the player with the SAME number as you.',
      'Before each attack, defenders point at their player and shout their number.',
      'Play normal basketball. Defence gets a point for every steal or stop. Basket = 2 points.',
      'Swap extra players in every 2 minutes. They take the number of the player they replace.',
    ],
    say: ['Point and shout!', 'Ball, you, hoop', 'Stay with your number'],
    anim: {
      dur: 8,
      p: [
        { n: 1, k: [[0, 250, 320], [0.5, 230, 300], [1, 250, 320]] },
        { n: 2, k: [[0, ...LW], [0.3, 95, 280], [0.6, 185, 150], [1, ...LW]] },
        { n: 3, k: [[0, ...RW], [0.4, 440, 110], [0.8, ...RW], [1, ...RW]] },
        { n: 4, k: [[0, 55, 80], [0.5, 115, 60], [1, 55, 80]] },
        { team: 'd', n: 1, guard: 0, lag: 0.03 },
        { team: 'd', n: 2, guard: 1, lag: 0.03 },
        { team: 'd', n: 3, guard: 2, lag: 0.03 },
        { team: 'd', n: 4, guard: 3, lag: 0.03 },
      ],
      balls: [[[0, 0], [0.3, 0], [0.38, 1], [0.5, 1], [0.6, 0], [1, 0]]],
      cap: [[0, 0.2, 'Point and shout your number'], [0.2, 1, 'Stay with your number!']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'inside-points', name: 'Inside Points', slot: 'game', theme: 'score',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 teams with bibs: 4 v 4 on the half court. Swap extra players in every 2 minutes. Spare balls go in the bag so nobody trips.',
      'Normal basketball, but a basket from INSIDE the key = 2 points. Any other basket = 1 point.',
      'Attack the hoop: dribble or cut to the basket for layups.',
      'Defence: stop the layup by staying between your player and the hoop. Hands up. Don\'t hit arms.',
    ],
    say: ['Attack the hoop!', 'Right, left, UP!', 'Stay between them and the basket'],
    anim: {
      dur: 8,
      p: [
        { k: [[0, ...TOP], [1, ...TOP]] },
        { k: LW },
        { k: [[0, ...RW], [0.2, 440, 262], [0.45, 300, 128], [0.55, 278, 100], [1, 278, 100]] },
        { k: LC },
        { team: 'd', guard: 0 },
        { team: 'd', guard: 1 },
        { team: 'd', guard: 2, lag: 0.06 },
        { team: 'd', guard: 3 },
      ],
      // a bounce pass to the cutter, round the passer's defender
      balls: [[[0, 0], [0.35, 0, 'h'], [0.41, [292, 300]], [0.47, 2], [0.55, 2], [0.63, 'hoop'], [0.68, 'hoop'], [0.75, [250, 90]], [1, [250, 90]]]],
      cap: [[0, 0.47, 'Cut to the key'], [0.47, 0.75, 'Basket inside the key = 2 points'], [0.75, 1, 'Anywhere else = 1 point']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'rotating-3v3', name: 'Rotating 3 v 3', slot: 'game', theme: 'ball',
    need: { balls: 'some', bibs: true },
    steps: [
      'Make 3 teams of 3 (with 8 players, play 4 v 4 and swap 2 players at a time instead). Spare balls go in the bag so nobody trips.',
      '2 teams play 3 v 3 on the half court. The third team waits at half way, dribbling on the spot.',
      'Special rule: no more than 3 bounces, then you must pass or shoot.',
      'After every basket (or every 2 minutes), the waiting team comes on and the team that has been on longest goes off.',
      'Basket = 2 points. Keep a running team score.',
    ],
    say: ['3 bounces max, then pass or shoot', 'Spread out!', 'Next team, get ready!'],
    anim: {
      dur: 8,
      p: [
        { k: [[0, 250, 320], [0.2, 230, 262], [1, 230, 262]] },
        { k: [[0, 90, 210], [0.35, 100, 205], [0.55, 172, 112], [1, 172, 112]] },
        { k: [[0, 420, 150], [1, 420, 150]] },
        { team: 'd', guard: 0, lag: 0.04 },
        { team: 'd', guard: 1, lag: 0.08 },
        { team: 'd', guard: 2 },
        // the next team waits at half way, dribbling on the spot
        { team: 'w', b: 1, dribble: 'always', k: [170, 490] },
        { team: 'w', b: 1, dribble: 'always', k: [250, 490] },
        { team: 'w', b: 1, dribble: 'always', k: [330, 490] },
      ],
      balls: [[[0, 0], [0.22, 0, 'h'], [0.32, 1], [0.58, 1], [0.66, 'hoop'], [0.7, 'hoop'], [0.76, [250, 90]], [1, [250, 90]]]],
      cap: [[0, 0.22, '1, 2, 3 bounces...'], [0.22, 0.6, '...then pass or shoot'], [0.6, 1, 'Basket! Green team comes on next']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'jump-stop-game', name: 'Jump Stop Game', slot: 'game', theme: 'ball',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 teams with bibs: 4 v 4 on the half court. Swap extra players in every 2 minutes. Spare balls go in the bag so nobody trips.',
      'Normal basketball, with one rule: every time you catch the ball, land with a jump stop.',
      'Then triple threat: ball on your hip, eyes on the hoop, before you pass, dribble or shoot.',
      'Travel or double dribble? The other team gets the ball. When the defence gets it, they take it out past the 3-point line.',
      'Basket = 2 points. A great jump stop gets a shout-out!',
    ],
    say: ['Catch and STOP!', 'Triple threat: look first', 'Pivot, don\'t walk'],
    anim: {
      dur: 8,
      p: [
        { k: [[0, ...TOP], [1, ...TOP]] },
        { k: LW },
        // catches with a jump stop, faces the hoop (triple threat), then turns to pass
        { face: [[0, -119], [0.22, -119], [0.3, 'hoop'], [0.34, 'hoop'], [0.4, 4]], k: [[0, 380, 175], [0.12, 380, 175], [0.22, 415, 238], [1, 415, 238]] },
        { k: [[0, 440, 90], [0.4, 440, 90], [0.5, 330, 112], [1, 330, 112]] },
        { team: 'd', guard: 0, lag: 0.03 },
        { team: 'd', guard: 1, lag: 0.03 },
        { team: 'd', guard: 2, lag: 0.03 },
        { team: 'd', guard: 3, lag: 0.03 },
      ],
      balls: [[[0, 0], [0.12, 0], [0.22, 2, 'h'], [0.4, 2], [0.45, [420, 170]], [0.5, 3, 'h'], [0.6, 3], [0.68, 'hoop'], [0.72, 'hoop'], [0.78, [250, 92]], [1, [250, 92]]]],
      cap: [[0, 0.22, 'Catch it with a jump stop'], [0.22, 0.4, 'Triple threat: look, then pass'], [0.4, 0.6, 'Jump stop again...'], [0.6, 1, '...and shoot!']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'rim-points', name: 'Rim Points', slot: 'game', theme: 'score',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 teams with bibs: 4 v 4 on the half court. Swap extra players in every 2 minutes. Spare balls go in the bag so nobody trips.',
      'Normal basketball, but a shot that hits the rim = 1 point, and a basket = 3 points.',
      'So if you\'re open and close to the hoop, shoot!',
      'Chase every missed shot: a rebound is another chance to score.',
      'When the defence gets the ball, they take it out past the 3-point line before they attack.',
    ],
    say: ['Open? Shoot!', 'Bend your knees, then shoot', 'Chase the rebound!'],
    anim: {
      dur: 8,
      p: [
        { k: [[0, ...TOP], [1, ...TOP]] },
        { k: [[0, ...RW], [0.25, 330, 150], [1, 330, 150]] },
        { k: [[0, ...LW], [0.3, 170, 160], [0.42, 232, 108], [1, 232, 108]] },
        { k: LC },
        { team: 'd', guard: 0, lag: 0.03 },
        { team: 'd', guard: 1, lag: 0.03 },
        { team: 'd', guard: 2, lag: 0.03 },
        { team: 'd', guard: 3, lag: 0.03 },
      ],
      // a bounce pass round the passer's defender; the shot hits the rim, then a put-back
      balls: [[[0, 0], [0.15, 0], [0.2, [320, 270]], [0.25, 1, 'h'], [0.32, 1], [0.4, 'hoop'], [0.44, 'hoop'], [0.48, 2, 'h'], [0.52, 2], [0.58, 'hoop'], [0.62, 'hoop'], [0.68, [250, 90]], [1, [250, 90]]]],
      cap: [[0, 0.32, 'Open? Shoot!'], [0.32, 0.5, 'Hit the rim = 1 point'], [0.5, 1, 'Rebound and score = 3 points']],
      key: { a: 'Attackers' },
    },
  },
  {
    id: 'number-call', name: 'Number Call', slot: 'game', theme: 'defence',
    need: { balls: 'some', bibs: true },
    steps: [
      '2 teams on opposite sidelines, numbered 1 to 5 (bibs for one team). You stand at half way with the ball.',
      'Call a number: both players with that number run out. Pass the ball to one of them.',
      'They attack the hoop. The other defends: stay between them and the hoop!',
      'Play until there\'s a basket or the defender gets the ball. Basket = 1 point. Then back to your sideline.',
      'Keep it quick. Once they\'ve got it, call 2 or 3 numbers at once for 2 v 2 or 3 v 3.',
    ],
    say: ['Stay between them and the hoop', 'Low and wide, slide your feet', 'Attack the hoop!'],
    anim: {
      dur: 8,
      p: [
        { team: 'c', k: [250, 445] },
        // the 3s run out; blue 3 gets the pass and attacks, green 3 defends
        ...[120, 185, 250, 315, 380].map((y, j) => (j === 2
          ? { n: 3, k: [[0, 18, y], [0.1, 18, y], [0.24, 150, 320], [0.3, 160, 310], [0.42, 225, 200], [0.52, 262, 100], [0.6, 262, 100], [0.8, 90, 260], [1, 18, y]] }
          : { n: j + 1, k: [18, y] })),
        ...[120, 185, 250, 315, 380].map((y, j) => (j === 2
          ? { team: 'w', n: 3, k: [[0, 482, y], [0.1, 482, y], [0.24, 300, 300], [0.3, 180, 272], [0.42, 231, 165], [0.52, 290, 78], [0.6, 290, 78], [0.78, 420, 200], [0.9, 482, y], [1, 482, y]] }
          : { team: 'w', n: j + 1, k: [482, y] })),
      ],
      balls: [[[0, 0, 'h'], [0.22, 0], [0.3, 3], [0.52, 3], [0.58, 'hoop'], [0.62, 'hoop'], [0.68, [250, 90]], [1, [250, 90]]]],
      cap: [[0, 0.12, '"Number 3!"'], [0.12, 0.3, 'Both 3s run out. You pass to one'], [0.3, 0.6, 'They attack. The other defends'], [0.6, 1, 'Basket = 1 point. Back to your sideline']],
      key: { a: 'Team 1', w: 'Team 2 (bibs)' },
    },
  },
];

/* The huddle is the same every session; the question and home
   challenge change with the focus. */
const HUDDLE = {
  id: 'huddle', name: 'Huddle and Cheer',
  steps: [
    'Everyone grabs a drink and sits in a circle.',
    'Ask today\'s question (below). Let a few players answer.',
    'Shout-out: "Who saw a teammate do something great today?"',
    'Give them the home challenge (below).',
    'Hands in the middle: "1, 2, 3... TEAM!"',
  ],
  byTheme: {
    sense:   { q: 'What should you do if you\'re standing right next to a teammate?', a: 'Move away and find empty space.', home: 'Watch 5 minutes of any basketball game. Spot the players spreading out.' },
    ball:    { q: 'What do your feet do when you stop dribbling?', a: 'Jump stop: both feet land together. Then pivot on one foot.', home: '50 dribbles with each hand, eyes up, while the TV is on.' },
    score:   { q: 'What are the layup steps on the right side?', a: 'Right, left, UP!', home: 'Practise "right, left, UP" steps in the hallway. No ball needed!' },
    defence: { q: 'Where should a defender stand?', a: 'Between their player and the hoop.', home: 'Hold your defence stance for 30 seconds while you brush your teeth.' },
  },
  anim: {
    dur: 5,
    paths: false,
    // each player comes to the spot in the circle on their side, so nobody crosses
    p: [[70, 120, 225], [430, 140, 315], [120, 400, 135], [380, 410, 45], [250, 120, 270], [60, 300, 180], [440, 300, 0], [250, 420, 90]].map(([x, y, deg]) => {
      const ang = deg * Math.PI / 180;
      const spot = [250 + Math.cos(ang) * 72, 270 + Math.sin(ang) * 72];
      return { k: [[0, x, y], [0.5, ...spot], [1, ...spot]] };
    }).concat([{ team: 'c', k: [250, 270] }]),
    cap: [[0, 0.5, 'Bring it in!'], [0.5, 1, '"1, 2, 3... TEAM!"']],
  },
};
