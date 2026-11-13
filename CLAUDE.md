# Easy Basketball Training

A one-tap 60-minute junior session builder plus a Game day subs manager. A real coach uses it on their phone at the court. Static PWA: plain HTML, CSS and JS, no build step, no dependencies. [SPEC.md](SPEC.md) and [GAMEDAY.md](GAMEDAY.md) are the source of truth: change them when behaviour changes, and tick their "Done when" lists.

## Publishing

- GitHub Pages serves `main` as-is: https://databerryau.github.io/basketball-training/
- Commit and push to `main` after every change once it's checked (tests pass, and a look in the preview if the coach sees it). The user tests on their phone against the live site.
- The coach's phone opens its offline copy first and fetches every file again in the background, so a change shows up on the **second** open after a push, not the first.
- Something that changes what the coach sees and isn't a fix (a new feature, a new screen): build it on a branch and ask the user before merging.

## The offline copy (`sw.js`)

- Adding, renaming or removing a file: update `APP_FILES` and bump `VERSION` (`basketball-training-v2` → `-v3`). A test checks the list against `index.html` and the manifest.
- Changing a file's content needs no bump: every open refetches all the files. A bump does no harm.
- The service worker is off on `localhost`, `127.0.0.1` and `[::1]` unless the address has `?sw` (bottom of `assets/js/app.js`).

## Words the coach reads

- Say **player** and **they / them**, never "girl" or "she" (SPEC §7). A test scans the coach-facing files. `court.js` comments are for developers and are left out.
- Australian spelling. Short sentences a brand-new coach (and a 10-year-old) would follow. Distances in "big steps".
- Phone first: works at 360px wide, body text 18px or more, buttons 48px or taller, light theme only.

## Drills and animations

- Every drill lives in `assets/js/drills.js`; its fields are listed at the top of that file.
- The animation format (keyframes `[t, x, y]` on a 500 × 467 half court, `hold`, `hands`, `face`, `guard`, `balls`, `cap`, `key`) is described at the top of `assets/js/court.js`. README "Adding or changing a drill" has the short version.
- SPEC §4.1 lists every drill by name. Tests compare the library with that table, so update both together.

## Saved data

Everything is in `localStorage` under `ebt.*.v1` keys, on the phone only. Never break a saved session or game: `load()` in `app.js` repairs sessions saved by older versions, and `loadGame()` in `gameday.js` checks a game before using it.

## Tests

- `node --test` from the repo root. Node 20+, nothing to install, about 40 seconds.
- `tests/harness.mjs` loads the real scripts into a sandbox with a fake page, storage and clock. The tests tap through them like the coach: hundreds of sessions checked against SPEC §3, and whole games simulated against GAMEDAY §4 (fair minutes, who goes on and off, the clock and minutes ticking together, late arrivals, injuries, reloads).
- Run them before every push. When a test finds a bug, fix the app and keep the test.

## Preview

- `.claude/launch.json` has `local`: `py -m http.server 8123` (on this PC `python3` is a Microsoft Store stub). Open http://localhost:8123/, or add `?sw` to test the offline copy.
- Check at phone width (360–390px) and stop the server when done.
