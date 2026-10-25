# Ludi Online: notes for Claude Code

A family web app for playing **Jamaican Ludi**: pass one phone around (v1), or join a shared game with a code (v1.1). No accounts, no ads, not monetized. Optimize for "grandma can join in 10 seconds."

## Read these first
1. `SPEC.md`: product spec and the **full rules**. The rules are the source of truth.
2. `RULES-TESTS.md`: rule scenarios. Each one becomes a unit test.
3. `design/board-geometry.json`: the exact board layout (48-square track, L corners, home lanes, yards, start squares).
4. `design/themes.json`: the 4 board themes (colors, yard names, center words, piece shapes).
5. `design/SCREENS.md` + `design/screens/*.dc.html`: the approved mockups, one file per screen.
6. `design/COPY.md`: UI text, including the Patois lines.

## Stack
- Vite + React + TypeScript. Board drawn in SVG from `board-geometry.json` (never hard-code positions in components).
- Game engine: `src/engine/`, pure TypeScript, **no React, no DOM, no randomness inside**. Shape: `applyAction(state, action) -> state` plus `legalMoves(state)`. Dice values come in as action data so tests are deterministic.
- Tests: Vitest. Every scenario in `RULES-TESTS.md` gets a test before its UI exists.
- Pass-and-play state: saved to `localStorage` after every action, restored on load.
- Online (v1.1, later): server owns dice and state. PartyKit or Supabase Realtime. Design the engine so the server can run it unchanged.
- Hosting: Vercel or Cloudflare Pages.

## Build order
1. Scaffold the project, lint, test runner.
2. Engine + tests (blocks and two-dice moves are the hard parts; do them carefully).
3. Board renderer from geometry + themes. Check it against `design/screens/Main.dc.html`.
4. Pass-and-play flow: Home -> Setup -> Board <-> Pass the phone -> Big moments -> Game over. Rules sheet from the board.
5. Polish: sounds (mute toggle), animations, Patois on/off.
6. Online rooms (v1.1): Join screen, host lobby, reconnect to same seat.

## Design rules
- Phone first, portrait, 390px wide reference. Tap targets at least 44px.
- Fonts: Caveat Brush (display, yard names, shouts), Nunito (UI).
- Men are bottle caps; every player also has a shape (diamond, triangle, circle, square) so color is never the only signal.
- The "Exclusive" badge shows **only in the setup board picker**, never on the board during play.
- Only legal pieces are highlighted (gold glow). Blocks show a "2" (or "3") badge.

## About the mockups
The `.dc.html` files are Claude Design canvas files. They are **visual references**, not code to ship. They use a small template runtime (`<x-dc>`, `{{holes}}`, `<sc-for>`); read the markup and inline styles for layout, sizes and colors, and rebuild them as React components. The live canvas is the "Ludi Online" design in Claude.

## Confirmed board rules
- The long bar at the outer end of each arm is a normal track square for everyone.
- Each player turns into their home lane right after their `lastTrackIndex` (that long bar). It is the last square where their man can be killed.

- Heaven is 6 steps past `lastTrackIndex`: five lane bars, then heaven. From his start square a man needs exactly 53.
- Nothing passes another color's block, not even a block moving together on a double. A moving block may only land exactly on it (and kill it).
- A block of 3 on a double: two men move together, the third stays.
- Two dice, only one usable: it must be the bigger die if the bigger die can move.
- Both dice on one man is two hops: he can kill on the first landing square (from the Main mockup hint).
- Every player has exactly one color. Two-player games sit diagonally (red/green or gold/black); the other two yards stay empty. There is no "each player controls two colors" option, despite SPEC section 2.

## Engine assumptions (not yet confirmed by Jacques)
- A player's own men can pass and land on their own block (stacks of 3 or 4 are fine).
- A 6 still gives the extra roll even if no move was possible with it.
- Being born kills a single opponent man sitting on your start square.
- Heaven-less draw only applies if nobody has finished yet.

## Open questions (ask Jacques, don't guess)
- One-die mode: a block parked on someone's start square could stall them for a long time. Watch in playtesting; a turn limit may be added.
