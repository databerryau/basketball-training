# Easy Basketball Training: spec

A one-button training session generator for a **brand-new coach** of a **brand-new junior girls' team**. Everything has to be super basic and clear: if the coach has to think about how to use it, it's too complicated.

This spec comes from an interview with the team's parent helper (25 October 2026).

---

## 1. Who it's for

| | |
|---|---|
| **Coach** | Brand new to coaching. Uses the tool **on a phone, at the court**. |
| **Players** | Girls, **Under 12 (about 10–11 years old)** |
| **Squad size** | Usually **8–10 players** at training |
| **Experience** | Mostly beginners: **one or two girls** have played before |
| **Session length** | **60 minutes** |
| **Court** | **Half court, 1 hoop** |
| **Equipment** | **A ball for every player**, cones/markers, two sets of bibs |
| **Games** | Already playing **weekly games** |

### What's going wrong in games (all four)

1. **Everyone chases the ball**: they bunch up instead of spreading out.
2. **Lots of turnovers**: travelling, double dribbles, passes to the other team.
3. **Can't score**: missed layups, or not getting shots at all.
4. **Defence is lost**: they don't know who to guard or where to stand.

---

## 2. Goals and non-goals

**Goals**

- **One button.** Tap *Make today's session* and get a complete, sensible 60-minute plan. No settings. (The coach *can* pick a different focus for a week, but never has to.)
- **Clear enough for someone who has never coached.** Short sentences, numbered steps, words a 10-year-old would understand.
- **Show, don't just tell.** Every drill has a small **animated court diagram** showing the movement.
- **Run it at the court.** A *Start session* mode with one drill per screen, a big countdown timer and a beep when time's up.
- **Fix the real problems.** Every session targets one of the four game problems above, and the focus rotates so all four get covered.
- **Help a new coach grow.** A *Coach help* section with the basics, simple rules, basketball words and game-day tips.
- **Game day.** A *Game day* tab that manages subs during games so every girl gets a fair go: an even split that says who goes on and off every few minutes, or a manual mode that just counts minutes. Full details in [GAMEDAY.md](GAMEDAY.md).

**Non-goals (deliberately left out to keep it simple)**

- No settings for age, squad size, session length or court. The tool is built for this team's setup.
- No accounts or logins. The only personal data is the *Game day* squad: first names (and optional jersey numbers), kept on that phone and never sent anywhere.
- No sharing links, printing or saved favourites. (They can be added later if wanted.)
- No Spanish or other languages. **English only, Australian spelling.**
- No drill editor.

---

## 3. The session

### 3.1 Same shape every time

Every session has the same ten parts, so the girls learn the routine and the coach always knows what comes next. After the head coach's feedback (26 October 2026), the skill drills are short (7 minutes) so five fit in and the girls stay interested, the drinks are short and more often, and the team game is short too.

| # | Part | Minutes | What it is |
|---|---|---|---|
| 1 | **Warm-up game** | 6 | A fun, active game. Everyone moving, lots of ball touches. |
| 2 | **Skill 1** | 7 | A drill on **today's focus**. |
| 3 | **Skill 2** | 7 | **Shooting or layups**, because every session needs some. (On a scoring day, another skill.) |
| 4 | **Drink break** | 1 | A quick drink. The screen says what's next and what to set out. |
| 5 | **Skill 3** | 7 | A drill on **another skill**. |
| 6 | **Skill 4** | 7 | A drill on **the last skill**, so every session works on all four. |
| 7 | **Drink break** | 1 | Another quick drink. |
| 8 | **Skill 5** | 7 | A **second drill on today's focus**, building on Skill 1. |
| 9 | **Team game** | 12 | A small-sided game with one special rule that works on today's focus. |
| 10 | **Huddle** | 5 | A drink, a question about today's focus, a shout-out, a home challenge, a team cheer. |
| | **Total** | **60** | |

### 3.2 Today's focus (automatic, or the coach's pick)

Each session picks **one focus**, and each focus fixes one of the game problems:

| Focus | Fixes | Skill drills about |
|---|---|---|
| **Spread out & get open** | Everyone chases the ball | Spacing, passing and cutting, 2 v 1, throw-ins |
| **Look after the ball** | Lots of turnovers | Dribbling, jump stops and pivots, passing and catching |
| **Put it in the hoop** | Can't score | Layups, close shots |
| **Stop them scoring** | Defence is lost | Stance, slides, "find your player", closeouts, boxing out |

- The focus **rotates** in that order. The first session ever is *Spread out & get open*, the most common beginner problem.
- The focus only moves on once a session has been **run** (the timer was started, or the coach got to the end). Making a new session before running the current one keeps the same focus and picks different drills, so no focus gets skipped.
- Some coaches only read the plan and never use *Start session*. So a session made **2 or more days ago** also counts as run when it's replaced, or their focus would never move on.
- **Picking a focus.** Under the focus card, a small *Work on something else this week?* link opens the other focuses. Tapping one makes a new plan on it straight away (no "Are you sure?"), for a week when the last game showed the girls need something else. The rotation then carries on from that focus. It's closed until asked for, so one tap still makes the whole plan.
- The page remembers the last focus on that phone.

### 3.3 How a session is put together

1. **Focus** = the next one in the rotation (or the same one again, if the session being replaced was never run), unless the coach picked one.
2. **Warm-up game** = any warm-up game, avoiding the ones used last session.
3. **Skill 1** and **Skill 5** = two different drills **for today's focus**.
4. **Skills 2, 3 and 4** = one drill from each of the **other three skills**, so every session works on all four. Skill 2 is the **Put it in the hoop** one (shooting or layups), so there's always shooting early on; on a scoring day, Skills 2–4 are the other three skills.
5. **Team game** = a team game that matches today's focus. Every focus has two, and the one used last session is avoided.
6. **Huddle** = always the same routine, with a question and home challenge that match today's focus.

No drill appears twice in one session.

Drills used in the last session that was run, and in the session being replaced, are avoided where possible, so back-to-back sessions feel different.

### 3.4 Swap a drill

Every drill (warm-up, skills, team game) has a **Swap** button. It replaces that one drill with another that fits the same slot:

- **Skill 1** and **Skill 5** swap to another drill on today's focus (never the same as each other).
- **Skills 2, 3 and 4** each swap to another drill on the same skill, so the session still covers all four.
- Swapping cycles through all the options before repeating. With 7 drills for each skill, there's plenty to mix in and out.

### 3.5 Remembering

- The current session is saved **on that phone**, so the coach can make it at home and open the same plan at the court. (On iPhone, the home screen icon keeps its own saved sessions, separate from Safari.)
- *Make a new session* replaces it. The page asks "Are you sure?" first.
- Once a session has been run, the plan page shows it as the **Last session** ("You ran this on Sunday 19 October"), with a big **Make today's session** button and the next focus under it, so nobody runs last week's plan by mistake. That button doesn't ask "Are you sure?". *Run this session again* is still there as a small link.
- If saving isn't possible (private browsing), everything still works. It just won't be remembered.

---

## 4. What each drill shows

Every drill card has:

1. **Name**: short and fun (for example *Sharks and Minnows*, *Find Your Player*).
2. **Animated court diagram**: a half court seen from above, with:
   - blue circles = our players or attackers (numbered when it matters)
   - red circles = defenders / taggers
   - green circles = the second team, or the team waiting to come on
   - a grey **C** = the coach
   - an orange dot = the ball. A player holding it has it in front of her ("at her chin"), so it turns with her when she pivots, and a player who's just caught it turns to face whoever she passes to next. A player dribbling has it bouncing at her side, in the hand the drill says (it crosses over when she swaps hands). Passes loop slightly, bounce passes go via the floor, and shots arc.
   - orange triangles = cones
   - faint dashed lines = where players run
   - a caption bar under the court saying what's happening right now ("Red light! Jump stop")
   - a small key under the caption naming each colour in that drill ("Shooter", "Rebounder", "Taggers"...)
   - tap the diagram to pause or play. Animations loop. With *reduce motion* switched on, the diagram starts paused on a moment that shows the drill.
   - the picture matches the words: distances in the steps are drawn to scale (1 big step ≈ 0.8 m), players join the right spot at the back of a line by going round it, defenders stay between their player and the hoop without standing on her, and passes go round defenders rather than through them.
3. **How it works**: 3–5 numbered steps in plain English.
4. **What to say**: 2–3 short coaching cues to shout ("Eyes up!", "Right, left, UP!").
5. **You need**: balls, cones, bibs.
6. **Swap** button.

Distances are given in **"big steps"**, not metres.

### 4.1 Drill library (version 2)

| Slot | Focus | Drills |
|---|---|---|
| Warm-up game | (any) | Dribble Tag · Red Light, Green Light · Sharks and Minnows · Coach Says · Ball Busters · Dribble Relay |
| Skill | Look after the ball | Cone Weave · Jump Stop and Pivot · Partner Passing · Pass and Follow · Piggy in the Middle · Catch and Triple Threat · Follow the Leader |
| Skill | Put it in the hoop | Layup Steps: Right-Left-Up · Layup Lines · Around the Hoop · Hot Spots · Jump Stop Finish · Beat the Coach · Three-Line Layups |
| Skill | Stop them scoring | Defence Mirror · Zig-Zag Slides · Find Your Player · Closeouts · Box Out Battle · 1 v 1 Gates · Ball Moves, You Move |
| Skill | Spread out & get open | Spacing Spots · Give-and-Go · 2 v 1 · No-Dribble Keepings Off · Throw-in Practice · V-Cut and Catch · Pass, Cut, Fill |
| Team game | Spread out & get open | Three-Pass Game · Freeze Game |
| Team game | Look after the ball | Rotating 3 v 3 · Jump Stop Game |
| Team game | Put it in the hoop | Inside Points · Rim Points |
| Team game | Stop them scoring | Matchup Game · Number Call |
| Huddle | (fixed) | Huddle and Cheer |

Every drill must work for **8–10 players on a half court with 1 hoop**, using only balls, cones and bibs.

**Coaching principles built into the drills**

- Short lines (no more than 3 waiting), lots of touches, nobody sits out for long.
- No "you're out" elimination games. If you're caught, you do a quick task and come straight back in.
- Safe spacing: no more than 2 pairs going for one ball or shooting at the hoop at once, finish lines at least 3 big steps from a wall, tap the ball and never the player, and spare balls in the bag during team games.
- Fun first. Competition is team-based and light ("first team to 10").

---

## 5. Start session (at the court)

A full-screen mode for running the session live.

- **One part per screen**: "Part 2 of 10 · Skill 1", the drill name, a big **countdown timer**, the animated diagram, *What to say* and *How it works*.
- **Timer**: starts when the coach taps **Start**. **Pause** and **+1 min** buttons.
- **Time's up**: two rounds of three long, loud beeps, a buzz (on phones that support it), and a **"Time's up! Tap Next"** message. The timer then counts **overtime** in red (+0:23), with a short double beep every extra minute, so the coach knows they're running over. It never skips ahead by itself.
- **iPhone silent mode** normally mutes a web page. While the alert plays, the app asks the phone to play it anyway (where the phone supports that), and before the timer starts the iPhone run screen says to turn silent mode off. If the phone stops the sound (after a screen lock, for example), the **Tap to turn the beep back on** button comes back.
- **Next / Back**: big buttons at the bottom. Tapping **Next** starts the next part's timer straight away, because the time for each part includes setting up and explaining.
- **Swap this drill** is available here too, in case something isn't working.
- **Screen stays on** while the session is running (where the phone allows it).
- After the huddle: a **"Great session!"** screen that names the next session's focus.
- **Exit** (✕) goes back to the plan at any time.
- **Safe if the page reloads.** Phones often reload a page that was in the background (the screen locked, or the coach answered a text). Once the timer has been started, the session opens again at the same part, and a running timer keeps counting. Sound needs a tap before the phone allows it, so a **Tap to turn the beep back on** button shows until the coach taps anything. A session nobody has tapped for 2 hours is treated as over. If the app is open twice (two tabs, or the browser and the home screen app on Android), both follow the latest tap instead of overwriting each other.

---

## 6. Coach help

A second tab with four short sections. Each is a list of small cards, readable in under a minute.

1. **New coach basics**: getting their attention, explaining a drill in 30 seconds, keeping lines short, praising out loud and correcting quietly, one fix at a time, safety and water, what to do if someone gets hurt, head knocks ("if in doubt, sit her out"), keeping kids safe (Working With Children Check, never alone with one child), hearing the beep, what to do when a drill isn't working, putting the app on the home screen.
2. **Rules made simple**: travelling, double dribble, fouls, 3 seconds, out of bounds and throw-ins, backcourt, held balls, free throws, scoring. Plus a reminder that junior leagues often have their own rules.
3. **Basketball words**: a small glossary (layup, jump stop, pivot, triple threat, box out, give-and-go, key, wing, baseline and more).
4. **Game day**: before the game, fair minutes for everyone with simple sub patterns, what to say at time-outs, staying positive, the after-game huddle.

---

## 7. Look and feel

- **Bright and friendly**: basketball orange, warm cream background, white cards, navy text, big rounded buttons.
- **Phone first**: designed for one hand at arm's length. Body text at least 18px, buttons at least 48px tall. Comfortable up to tablet and desktop width.
- **Light theme only**, for readability under gym lights.
- **Generic**: no team name, so the coach can share it with other new coaches.
- Plain, encouraging language. No jargon without an explanation.

---

## 8. Technical

- **A static site**: plain HTML, CSS and JavaScript. No build step, no frameworks, no tracking.
- **Works with no internet.** A service worker (`sw.js`) keeps a copy of the app and its font on the phone after the first visit, and the app always opens from that copy. Each time it's opened, a fresh copy of every file is fetched in the background, and the phone only switches over once all of them have arrived (so a weak signal can't leave a mix of old and new files). A new version therefore shows up the time after it's first opened. It's switched off on `localhost` unless the address has `?sw`.
- **Home screen.** A web app manifest and icons let the coach add it to the home screen, where it opens full screen like an app. On iPhone the home screen app keeps its own storage, separate from Safari, so the tip says to open the new icon once with internet and make sessions there. (That also stops Safari clearing saved sessions after a few weeks without a visit.) The start page and the plan page show how to do it on phones: an *Add to home screen* button where the browser offers one, otherwise short iPhone or Android steps, or "open it in your browser first" inside Facebook, Messenger or Instagram. Coach help says the same. The tip is hidden on computers and once the app is installed.
- **Files**

  ```
  index.html             page structure
  SPEC.md                this document
  README.md              how to run and update it
  sw.js                  offline copy (service worker)
  manifest.webmanifest   home screen name, colours and icons
  assets/css/style.css   bright, friendly theme
  assets/js/court.js     half-court drawing and animation engine
  assets/js/drills.js    every drill: steps, cues, equipment, animation
  assets/js/help.js      Coach help content
  assets/js/gameday.js   Game day: squad, sub timer, even split and manual subs
  GAMEDAY.md             the Game day spec
  assets/js/app.js       generator, session view, Start session mode
  assets/icons/          home screen icons
  ```

- **Animations** are data, not video. Each drill lists players, cones and the ball with keyframes (`[time, x, y]` on a 500 × 467 half court), and `court.js` draws and animates them with SVG. Defenders can be told to "guard" an attacker, which keeps them between that player and the hoop automatically.
- **Storage**: the current session, the last focus (and recent drills) of the last session that was run, the state of a running session, and the Game day squad, settings and game in progress are kept in `localStorage`, wrapped so the page still works without it.
- **Hosting: GitHub Pages**, from the `main` branch of its own repo (`databerryau/basketball-training`):
  **https://databerryau.github.io/basketball-training/**
  It started as a folder inside `databerryau/Spain-football-dashboard` and was moved here with its history.

---

## 9. Done when

- [ ] Opening the page on a phone shows one big **Make today's session** button and a 3-step "how it works".
- [ ] One tap makes a 60-minute, ten-part session (five 7-minute skill drills, two quick drinks, a 12-minute team game) with a clear focus and the problem it fixes.
- [ ] Every drill shows a working animated diagram, numbered steps, coaching cues and equipment.
- [ ] **Swap** changes one drill and keeps the slot's rules.
- [ ] The session is still there after closing and reopening the page.
- [ ] **Start session** runs every part with a timer, beeps at zero, shows overtime, and Next/Back work.
- [ ] Reloading the page during **Start session** carries on at the same part, with the timer where it should be.
- [ ] The focus doesn't move on when a session is replaced without being run.
- [ ] After one visit, the page opens with no internet, and it can be added to the home screen.
- [ ] **Coach help** has all four sections.
- [ ] No horizontal scrolling at 360px wide, and no console errors.
- [ ] Published on GitHub Pages.

## 10. Ideas for later


- Share a session link with an assistant coach.
- Printable one-page plan.
- Save favourite sessions.
- A short season plan (Week 1, 2, 3...) building skills in order.
- Optional settings for other teams (age, squad size, full court).
