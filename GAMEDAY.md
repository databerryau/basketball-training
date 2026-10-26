# Game day: spec

A **Game day** screen that manages subs during weekly games, so every girl gets a fair go and the coach doesn't have to keep it all in their head.

This spec comes from an interview with the team's parent helper (26 October 2026). **Built 26 October 2026** in `assets/js/gameday.js`; [SPEC.md](SPEC.md) points here for the details.

---

## 1. Who it's for

| | |
|---|---|
| **Who** | The head coach, on the bench, with the phone in their hand while coaching the game |
| **When** | Weekly games |
| **Players** | Usually 8–10 at a game, 5 on court |
| **Game length** | Varies by league, so it's set at the start of each game |
| **Sound** | None. The screen shows when subs are due: no beeps, no buzz |

The coach is watching the game, not the phone. Everything has to work at a glance, with big buttons and one tap at a time.

---

## 2. Where it lives

- A third tab, **Game day**, next to *Session* and *Coach help*.
- Works with no internet, like the rest of the app.
- The screen stays on while a game is running (where the phone allows it).

---

## 3. Before the game

### 3.1 The squad (saved on this phone)

- The coach types the girls' **first names** once. A jersey number is optional, which helps when telling the scorer who's going on.
- The squad is saved **in this browser only**, never sent anywhere. Names can be added or removed any time, and a *Clear the squad* button removes them all.
- Up to 15 names.

### 3.2 Each game

1. **Tick who's here.**
2. **Game length**: 4 quarters or 2 halves, and how many minutes each. Quick picks: *4 × 8*, *4 × 10*, *2 × 20*, or type your own. The last choice is remembered.
3. **Mode**: **Even split** (the default) or **Manual** (for more serious teams).
4. **Starting five**: the app picks one (even split) and the coach can tap to change it. In manual mode the coach picks.
5. Tap **Start game** at the tip-off.

---

## 4. During the game

### 4.1 The screen

- **The period and the time**: "Quarter 2 · 6:40 left". This is the app's own timer, not the scoreboard.
- **Pause / Resume**: for breaks, time-outs and long stoppages.
- **On court**: the 5 girls playing, each with her minutes so far.
- **Bench**: everyone else, with her minutes so far.
- At the end of a quarter or half the timer stops: *"End of quarter 1. Tap Start for quarter 2."*

### 4.2 Even split

Everyone gets the same time on court, as near as possible.

- **When subs happen**: at every break between quarters or halves, and part-way through each one, so nobody plays much more than **6 minutes in a row**. Each quarter or half is split into equal parts of 6 minutes or less:

  | Game | Subs |
  |---|---|
  | 4 × 8 | half way through each quarter (every 4 minutes) and at each break |
  | 4 × 10 | half way through each quarter (every 5 minutes) and at each break |
  | 2 × 20 | every 5 minutes, and at half time |

- **Who goes on**: at each sub moment, the girls who've played the **fewest minutes** come on and the girls who've played the **most** come off. (Strictly, it's minutes compared with a fair share of the time she's been here, so a late arrival or a girl back from a rest gets a fair share of what's left, without the others sitting out to make up her missed time.)
- **How even it ends up**: with 8 or 10 girls, everyone ends within about 2 minutes of each other (exactly equal if the coach taps *Done* straight away). With 6, 7, 9 or 11, the minutes can't divide evenly into the sub moments, so some girls get one more stint than others (4–6 minutes, depending on the game length). Checked by simulating thousands of games.
- **When subs are due**: no sound. The screen changes to a big orange **Subs due** panel:

  > **OFF:** Mia, Zoe → **ON:** Ava, Lily

  The timer keeps running. The coach makes the change at the next whistle and taps **Done**. Minutes are counted from *Done*, so time spent waiting for a whistle is fair to everyone.
- **Coach knows best**: tap a name on the panel to swap who goes on or off. The plan works around it.

### 4.3 Manual

For teams that want the coach to decide.

- Tap a girl on the bench, then the girl she's replacing. That's a sub.
- Each girl's **minutes played** count up live. Nothing else: no suggestions, no warnings.
- The coach can switch between *Even split* and *Manual* at any time. Going back to even split plans the rest of the game from now.

### 4.4 Changes during the game

- **Late arrival**: tap *＋ A girl arrived late* and pick her from the squad (or type a new name). She joins the bench, and the even split re-plans the rest of the game so everyone still gets a fair share.
- **Hurt, or needs a rest**: tap *Out* beside her name (and *Back in* later). If she was on court, the even split straight away asks for a replacement ("Subs due: ON …"). The plan re-balances from now.

### 4.5 Safe if the page reloads

Like *Start session*: the game is saved after every tap, so if the phone reloads the page it carries on at the same point, with the timer where it should be.

---

## 5. After the game

- A **minutes summary**: every girl and how long she played, so the coach can see (and show parents) that it was fair.
- It's kept on this phone until the next game, then replaced.

---

## 6. Left out on purpose (to keep it simple)

- No score, fouls, time-outs or stats.
- No sound or buzz.
- No balancing of who plays together (e.g. spreading out the stronger girls).
- No sharing or printing.

---

## 7. Privacy

- First names (and optional jersey numbers) only, saved in this browser on this phone, never sent anywhere.
- This changes one of the app's non-goals ("No accounts, logins, player names or personal data"). [SPEC.md](SPEC.md) now says: still no accounts or logins, and names stay on the phone.
- On iPhone the home screen app keeps its own storage, so the squad is saved separately there from Safari (the same as saved sessions).

---

## 8. Calls made that the interview didn't cover

Built this way; easy to change:

1. **When subs happen**: every break, plus equal parts of 6 minutes or less (the table in 4.2). For 4 × 8 that means subs every 4 minutes, not 8.
2. **Minutes count from Done**, not from when the panel appears.
3. **The app suggests the starting five** in even split; the coach can change it.
4. **Optional jersey numbers**, alongside first names.
5. **Fewer than 6 girls**: nobody can sit, so there's nothing to plan. The screen just runs the timer and counts minutes.
6. **The timer is the app's own.** The coach pauses it for breaks and time-outs, and can tap the time to nudge it if it drifts from the scoreboard.
7. **A how-to card in Coach help → Game day**, explaining the two modes in a few lines.

---

## 9. Done when

- [x] A *Game day* tab sits next to *Session* and *Coach help* (on a phone the three tabs get their own row under the name).
- [x] The squad is saved on the phone; each game the coach ticks who's here, picks the game length and mode, and starts.
- [x] Even split shows **Subs due** with who's off and on at the right moments, silently, and *Done* swaps them.
- [x] At the end of a game played in even split with 8 or 10 girls, every girl's minutes are within about 2 minutes of each other (when nobody arrived late or got hurt). Other squad sizes: within one stint.
- [x] Manual mode swaps any girl with a tap and counts each girl's minutes.
- [x] Late arrivals and injuries re-balance the rest of the game.
- [x] Pause, end-of-period stops and reload-safety all work, with the screen kept on.
- [x] A minutes summary appears at the end of the game.
- [x] Works offline, at 360px wide, with no console errors.
