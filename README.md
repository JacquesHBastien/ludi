# Ludi Online: Claude Code handoff

## How to use this package
1. Make a new empty folder for the project and unzip this package into it.
2. Open that folder in Claude Code.
3. Paste the kickoff prompt below.

## Kickoff prompt

> Read CLAUDE.md, SPEC.md, RULES-TESTS.md and everything in design/. Then build Ludi Online in the order CLAUDE.md lists. Start with step 1 (scaffold) and step 2 (the game engine with a test for every scenario in RULES-TESTS.md). Stop after the engine tests pass and show me the results before you build any UI. If a rule is unclear, ask me instead of guessing.

## What's inside
- `CLAUDE.md`: stack, build order, design rules, open questions.
- `SPEC.md`: product spec and full rules (v0.6).
- `RULES-TESTS.md`: 32 rule scenarios to turn into tests.
- `design/board-geometry.json`: board layout in grid units.
- `design/themes.json`: Roots, Yard Classic, St. Croix Edition, Haitian Edition.
- `design/SCREENS.md`, `design/COPY.md`: screen list and UI text.
- `design/screens/`: the mockup files from Claude Design.