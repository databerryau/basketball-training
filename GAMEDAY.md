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
2. **Game length**: 2 halves or 4 quarters, and how many minutes each. Quick picks: *2 × 18* (the default), *2 × 20*, *4 × 8*, *4 × 10*, or type your own. The last choice is remembered.
3. **Mode**: **Even split** (the default) or **Manual** (for more serious teams).
4. **How often to sub** (even split): *Sub about every [−] 6 min [+]*, from 2 to 12 minutes. The app splits each half or quarter into equal stints as close to that as it can, and says what that means: "Subs every 4½ minutes: 3 in each half, plus half time".
   - It also says whether that **shares out evenly** for the girls who are here: "✓ With 8 girls, everyone gets the same time: 22.5 minutes each". If it doesn't (say 2 × 18 subbing every 6 with 8 girls: 6 turns of 6 minutes can't split 8 ways), it says so and offers the nearest interval that does, as one tap: *Sub every 5 min instead (even time)*.
5. **Starting five**: the app picks one (even split) and the coach can tap to change it. In manual mode the coach picks.
6. Tap **Start game** at the tip-off.

---

## 4. During the game

### 4.1 The screen

- **The period and the time**: "Quarter 2 · 6:40 left". This is the app's own timer, not the scoreboard.
- **Pause / Resume**: for breaks, time-outs and long stoppages.
- **On court**: the 5 girls playing. **Bench**: everyone else. **Hurt or resting**: anyone who can't play right now.
- **Each girl has her own colour**, kept from game to game: her whole row is a light wash of it, with a solid stripe down the side, so she's easy to spot. Her colour is also on the *Subs due* panel, the setup chips and the summary.
- **Every time moves together, in 5-second steps**: the clock, "Next subs in" and every girl's minutes all change at the same moment, every 5 seconds. Sub moments land on the same 5-second beat. (The app's clock can't match the scoreboard to the second anyway, since nobody presses the two at the same moment.)
- **Each row says Sub**: tap a girl to make a sub (see 4.3).
- At the end of a quarter or half the timer stops: *"End of quarter 1. Tap Start for quarter 2."*

### 4.2 Even split

Everyone gets the same time on court, as near as possible.

- **When subs happen**: at every break between quarters or halves, and part-way through each one, as often as the coach chose (3.2). Each quarter or half is split into equal stints as close to that as possible:

  | Game | Sub about every | Subs |
  |---|---|---|
  | 2 × 18 | 6 min (default) | every 6 minutes: 2 in each half, plus half time |
  | 2 × 18 | 5 min | every 4½ minutes: 3 in each half, plus half time |
  | 4 × 10 | 5 min | half way through each quarter, and at each break |
  | 4 × 8 | 6 min | at each break only; choose 4 to sub half way through each quarter too |

- **Who goes on**: at each sub moment, the girls who've played the **fewest minutes** come on and the girls who've played the **most** come off. (Strictly, it's minutes compared with a fair share of the time she's been here, so a late arrival or a girl back from a rest gets a fair share of what's left, without the others sitting out to make up her missed time.)
- **How even it ends up**: when setup shows the green "everyone gets the same time", everyone ends within about 2 minutes of each other (exactly equal if the coach taps *Done* straight away; the rest is time spent waiting for a whistle). Otherwise some girls get one more stint than others, which setup warns about. Checked by simulating thousands of games.
- **When subs are due**: no sound. The screen changes to a big orange **Subs due** panel:

  > **OFF:** Mia, Zoe → **ON:** Ava, Lily

  The timer keeps running. The coach makes the change at the next whistle and taps **Done**. Minutes are counted from *Done*, so time spent waiting for a whistle is fair to everyone.
- **Coach knows best**: tap a name on the panel to swap who goes on or off. Or ignore the panel and make a different sub (4.3). The plan never goes exactly to plan, so it simply carries on from whatever happened.

### 4.3 Making a sub (both modes)

- Tap a girl (her row says **Sub**), then the girl she swaps with: one on the bench and one on court, in either order. That's a sub.
- After the first tap, a bar in her colour stays at the bottom of the screen: *"Sub Ella off: tap the girl coming on."*, with **Cancel**.
- In even split, a sub the coach makes takes those girls out of any *Subs due* suggestion, and the next sub moment plans from there.

### 4.4 Manual

For teams that want the coach to decide.

- Subs as in 4.3. Each girl's **minutes played** count up live. Nothing else: no suggestions, no warnings.
- The coach can switch between *Even split* and *Manual* at any time. Going back to even split plans the rest of the game from now.

### 4.5 Changes during the game

- **Late arrival**: tap *＋ A girl arrived late* and pick her from the squad (or type a new name). She joins the bench, and the even split re-plans the rest of the game so everyone still gets a fair share.
- **Hurt, or needs a rest**: tap her, then **[Name] is hurt or resting** on the bar at the bottom. She moves to *Hurt or resting*, with a **Back in** button for later. If she was on court, the even split straight away asks for a replacement ("Subs due: ON …"). The plan re-balances from now. (This used to be an *Out* button on every row, which was too easy to mistake for "sub off".)

### 4.6 Safe if the page reloads

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

1. **When subs happen**: every break, plus equal stints as close as possible to the coach's "sub about every" (6 minutes unless changed).
2. **Minutes count from Done**, not from when the panel appears.
3. **The app suggests the starting five** in even split; the coach can change it.
4. **Optional jersey numbers**, alongside first names.
5. **Fewer than 6 girls**: nobody can sit, so there's nothing to plan. The screen just runs the timer and counts minutes.
6. **The timer is the app's own.** It won't match the scoreboard to the second (nobody starts the two together), so it counts in 5-second steps. The coach pauses it for breaks and time-outs, and can tap the time to nudge it if it drifts a long way.
7. **A how-to card in Coach help → Game day**, explaining the two modes in a few lines.

---

## 9. Done when

- [x] A *Game day* tab sits next to *Session* and *Coach help* (on a phone the three tabs get their own row under the name).
- [x] The squad is saved on the phone; each game the coach ticks who's here, picks the game length and mode, and starts.
- [x] Even split shows **Subs due** with who's off and on at the right moments, silently, and *Done* swaps them. The coach can also make any sub at any time.
- [x] At the end of a game played in even split, when setup said "everyone gets the same time", every girl's minutes are within about 2 minutes of each other (when nobody arrived late or got hurt). Otherwise within one stint, as setup warned.
- [x] Each girl's row is her own colour, and every time on screen moves together in 5-second steps.
- [x] Manual mode swaps any girl with a tap and counts each girl's minutes.
- [x] Late arrivals and injuries re-balance the rest of the game.
- [x] Pause, end-of-period stops and reload-safety all work, with the screen kept on.
- [x] A minutes summary appears at the end of the game.
- [x] Works offline, at 360px wide, with no console errors.
