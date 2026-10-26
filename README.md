# Easy Basketball Training 🏀

**One tap makes a full 60-minute junior basketball training session.** Built for a brand-new coach running a brand-new Under 12 girls' team on a half court with one hoop.

Live site: **https://databerryau.github.io/basketball-training/**

## What it does

| | |
|---|---|
| **Make today's session** | One button. You get a 60-minute plan in the same ten parts every time: warm-up game, five short (7-minute) skill drills covering all four skills with two quick drinks in between, a 12-minute team game and the huddle. |
| **Today's focus** | Each session works on one problem from games (bunching, turnovers, scoring or defence). The focus rotates automatically, or the coach can pick a different one for the week. |
| **Animated drills** | Every drill has a little half-court animation, numbered steps, "what to say" coaching cues and the equipment needed. |
| **Swap** | Don't like a drill? Swap it for another one that fits the same slot. There are 42 drills to mix in and out. |
| **Start session** | At the court: one part per screen, a big countdown timer, beeps when time's up, and the screen stays on. If the phone reloads the page, it carries on where it was. |
| **No internet needed** | After one visit it opens with no reception. Add it to the home screen and it opens like an app. |
| **Game day** | Manages subs during games. Even split tells the coach who goes on and off every few minutes so every girl plays the same time; manual just counts everyone's minutes. The squad's first names stay on the phone. |
| **Coach help** | New coach basics, simple rules, basketball words and game-day tips. |

The full spec (from the interview) is in [SPEC.md](SPEC.md).

## Run it locally

It's a static site with no build step and no dependencies:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

The offline copy (`sw.js`) is switched off on `localhost`, so it can't get in the way of other projects on the same port. To test it, open `http://localhost:8000/?sw`. With it on, a change shows up on the **second** reload, or tick *Update on reload* in the browser's DevTools (Application → Service workers).

## Files

```
index.html             page structure
SPEC.md                the spec
GAMEDAY.md             the Game day spec
sw.js                  offline copy (service worker)
manifest.webmanifest   home screen name, colours and icons
assets/css/style.css   bright, friendly theme
assets/js/court.js     half-court drawing and animation engine
assets/js/drills.js    every drill: steps, cues, equipment, animation
assets/js/help.js      Coach help content
assets/js/gameday.js   Game day: squad, sub timer, even split and manual subs
assets/js/app.js       generator, session view, Start session mode
assets/icons/          home screen icons
```

## Adding or changing a drill

Everything lives in `assets/js/drills.js`. Each drill has:

- `slot`: `warmup`, `skill` or `game`
- `theme`: `sense`, `ball`, `score` or `defence` (skills and games)
- `steps` and `say`: plain-English steps and 2–3 short cues
- `need`: balls, cones, bibs
- `anim`: the animation. Players move between keyframes `[time, x, y]`. Time runs from 0 to 1 over the loop, and the half court is 500 wide × 467 deep with the basket at the top (1 big step ≈ 27 units). Players can also turn (`face`, for a pivot), hold their ball (`hold`, for a jump stop) and swap dribbling hands (`hands`). The format is explained at the top of `court.js`.

## Publishing

GitHub Pages serves the `main` branch as-is (no build step), so every push to `main` updates the live site. Phones that have visited before open their offline copy first and pick up the new version in the background, so they see it the next time the page is opened.

If you add, rename or remove a file, update the list in `sw.js` and change its `VERSION` (for example `basketball-training-v1` → `basketball-training-v2`).
