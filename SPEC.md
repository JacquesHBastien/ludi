# Ludi Online: Product Spec (v0.6)

A web app for families to play Jamaican Ludi together, either by passing one phone around or by joining a shared game with a code.

**Goal:** family fun. Not monetized, no accounts, no ads. Optimize for "grandma can join in 10 seconds."

---

## 1. Scope

### v1 (build first): Pass-and-play
- One device, 2 to 4 players take turns.
- Runs entirely in the browser. No server, no login.
- Game state saved locally so a game survives a refresh or a closed tab.

### v1.1: Online rooms
- Host creates a game, gets a short code (e.g. `MANGO-42`) and a share link.
- Others open the link or type the code, enter a name, pick a color.
- Mixed mode allowed: e.g. two people on one phone plus two on their own phones.
- Reconnect: if someone's phone locks, they rejoin the same seat.

### Out of scope (for now)
Accounts, stats, chat, matchmaking with strangers, AI opponents (nice later for practice), monetization.

---

## 2. Players and setup
- 2 to 4 players, each picks a name and a color.
- 2-player games: option to play diagonal colors (standard) or each player controls two colors.
- Host picks the board and house rules before starting. Active rules are shown on the lobby screen so nobody argues mid-game.

---

## 3. Glossary
- **Yard:** where a player's 4 pawns ("men") start.
- **Born:** a pawn leaves the yard onto its start square.
- **Cut / kill:** landing on an opponent sends their pawn(s) back to the yard.
- **Block (double):** two or three of the same player's pawns on one square.
- **Heaven gate:** a player's home column, entered after going all the way around.
- **Heaven:** the center finish.

---

## 4. Core rules (always on)

**Getting born**
- A pawn is born only on a roll of 6.
- In two-dice mode, a single 6 is enough to born one pawn. A double 6 can born two.

**Moving**
- Pawns move clockwise around the track by the roll, then up their own heaven gate into heaven.
- **Exact finish:** a pawn needs the exact count to reach heaven. If the roll would overshoot, that pawn can't move; the player moves a different pawn or the turn is skipped.
- If no legal move exists, the turn passes automatically.

**Cutting (killing)**
- Landing exactly on a single opponent pawn kills it (back to the yard).
- **No safe squares on the main track.** Start squares are not safe; a pawn sitting on its own start square can be killed.
- **Only safe squares:** squares inside a player's heaven gate (only that player can reach them anyway).
- Killing does **not** give a bonus roll.

**Rolling sixes**
- A 6 gives another roll. No limit; keep rolling as long as sixes come.
- In two-dice mode, a roll with any 6 gives **one** extra roll. Double 6 still gives only one extra roll, not two.

**Using the dice (two-dice mode)**
- **Both dice must be used** if there is any legal way to use them. If only one die can be used, use it; if neither can, the turn passes.
- Each die can move a different pawn, or both dice can move the same pawn.

**Winning**
- First player with all 4 pawns in heaven wins. Play can continue for 2nd and 3rd place.

---

## 5. Blocks (doubles)

Blocks are part of Jamaican Ludi and are the most important rule to get right in code.

- Two or three of a player's pawns on the same square form a **block**.
- **Nobody can pass or land on a block** with a single pawn.
- **Moving a block together:** only on a double. With 4-4, each pawn in the block moves 4 squares, so the block stays a block 4 squares ahead.
- **Splitting a block:** allowed. A player can move just one pawn off the block with a normal roll. With 4-4, they can also move one pawn 8 squares and leave the rest behind.
- **A block can only be killed by another block.** If a moving block lands exactly on an opponent's block, all of the opponent's pawns there are killed.
- **Block on someone's start square:** if an opponent sits a block on your start square, you can't born normally. You need a **double 6** to born two pawns at once, which lands as a block on their block and kills it.

---

## 6. House rule toggles (chosen per game)

| Rule | What it does | Default |
|---|---|---|
| **Two-dice mode** | Roll two dice. Both must be used. Each die can move a different pawn, or both can move the same pawn. Single 6 borns a pawn. | On |
| **Heaven-less mode** | The game ends as a **draw for everyone** once every player has at least one pawn in heaven. Only applies when this mode is selected. | Off |

Note: blocks and six-gives-extra-roll are now core rules, not toggles, since they're how the game is actually played.

---

## 7. One-die mode (blocks)

Two dice is the default. In one-die mode:
- Blocks can still form (a pawn lands on a square where you already have one).
- A block **can't be passed, can't be killed, and can't move together** (there are no doubles).
- A block only breaks when its owner moves one pawn off it. The owner can choose to, or is **forced to** when splitting the block is their only legal move.
- A block sitting on someone's start square stops that player from getting born until the block's owner moves off it.

Known risk to watch in playtesting: in one-die mode, a player with other pawns to move can keep a block on someone's start square for a long time. If this feels unfair at the table, add a rule like "a block can't stay on another player's start square for more than X turns."

---

## 8. Boards (2 to 3 to choose from)

Board geometry follows traditional Jamaican boards (not British Ludo):
- Each arm is a square lane on each side with **long rectangular bars** down the middle (the home lane).
- The four corners around the center are **shared squares**, so the track turns in a clean **L** with no diagonal jumps.
- One lap is **48 squares** per arm loop: 5 squares + 1 corner + 5 squares + 1 long crossing bar at the outer end of each arm (12 per arm). 48 divides evenly into eight rounds of the 6-color cycle.
- Home lane: 4 long bars plus the bar touching the center, then heaven (four triangles with an X).
- Yards are named after parishes: St. Elizabeth (red), St. Andrew (gold), St. Mary (green), St. Ann (black).
- **Confirmed:** the long bar at the outer end of each arm is a normal track square for everyone. It is each player's last track square before turning into their home lane, so it is the last chance for anyone to kill that player's man before it is safe.

What changes per board is the paint.

**Key detail from traditional Jamaican boards:** track squares are painted in a **repeating 6-color cycle** (e.g. red, green, blue, yellow, pink, white), so from one color to the same color again is 6 counts. Players use this to count moves at a glance. Every board design should keep this cycle.

1. **Roots (default):** red, gold, green and black with wood and cream squares, black lacquer frame, dark wood table, "One Love" center.
2. **Yard Classic:** the brighter family-board palette (red, yellow, green, sky blue, cream, black).
3. **St. Croix Edition (exclusive):** teal, coral, sand, gold, navy, white. Yards: Christiansted, Frederiksted, Cane Bay, Point Udall. Center: "Crucian Pride".
4. **Haitian Edition (exclusive):** flag blue and red, white, gold, palm green, tap-tap pink. Yards: Port-au-Prince, Saint-Marc, Jacmel, Gonaïves. Center: "Ayiti 1804".

The **Exclusive** badge appears only on the board picker in game setup, never on the in-game board. Yard names and center words come from the theme.

Men are drawn as **bottle caps**, each player also has a shape (diamond, triangle, circle, square) for color-blind players.

Design canvas: "Ludi Online" (Claude Design), 8 screens: Home, Game setup, Join with a code, Game board, Pass the phone, Big moments (Kill / Born / Block / Heaven), Game over (Winner / Heaven-less draw), Rules sheet.

---

## 9. Experience and feel
- **Look:** Caribbean, warm and hand-painted, like the boards people grew up on. Not a generic casino Ludo app.
- **Language:** English UI with Patois flavor in game moments ("Yuh born!", "Kill!", "Block!", "Reach heaven!"). Option to turn Patois off.
- **Phone-first:** portrait layout, big tap targets, board fills the screen.
- **Pass-and-play clarity:** a full-screen "Pass to Keisha (Green)" handoff between turns so nobody plays the wrong color.
- **Tap dice to roll, tap a highlighted pawn to move.** Only legal pawns light up. In two-dice mode, tap a die then a pawn to assign it.
- **Blocks are visually obvious:** stacked pawns with a clear "2" badge.
- **Sound:** dice rattle, kill sound, celebration on heaven. Mute toggle.
- **Accessibility:** player colors also marked with a shape for color-blind players; large text option.

---

## 10. Screens to design
1. Home: "Play on this phone" / "Create online game" / "Join with code"
2. Setup / lobby: players, colors, board choice, house rule toggles, share code
3. Join screen: code + name + color
4. Game board: board, dice, whose turn, pawn highlights, blocks
5. Pass-the-phone handoff overlay
6. Born / kill / block / heaven moments
7. Game over: winner, placings, or "Draw" for heaven-less mode; play again
8. Rules sheet (in-game reference showing the active rules)

---

## 11. Suggested tech (for Claude Code)
- **Frontend:** React + TypeScript, board drawn in SVG (scales cleanly on any phone, and swapping boards is just swapping a color theme).
- **Game engine:** pure TypeScript module with no UI code: `state + action -> new state`. Blocks, two-dice assignment, heaven-less draw and overshoot all live here, each with unit tests. Both modes reuse this engine.
- **Pass-and-play:** engine runs in the browser, state saved to localStorage.
- **Online (v1.1):** small real-time backend where the server owns the dice and state, so a refresh or dropped phone can't desync or fake a roll. Good fits: PartyKit/Cloudflare Durable Objects or Supabase Realtime.
- **Hosting:** Vercel or Cloudflare Pages, one URL.

---

## 12. Build order
1. Design the screens and 3 boards (Claude Design).
2. Claude Code: game engine + tests for every rule.
3. Pass-and-play UI on top of the engine. Play it with the family, fix rules.
4. Add online rooms.
