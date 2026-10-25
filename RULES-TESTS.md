# Rule scenarios (write each as a unit test)

Positions use track indexes from `design/board-geometry.json` (0 to 47, clockwise). Dice are given explicitly.

## Getting born
1. Pawn in yard, roll 5 (one die): no legal move for that pawn.
2. Pawn in yard, roll 6: pawn moves to its start square. Player rolls again.
3. Two dice, roll 6 + 3: born one pawn with the 6, move any pawn 3 with the other die (both dice must be used if possible).
4. Two dice, roll 6 + 6: may born two pawns, which land together as a block.
5. Opponent's block sits on my start square, I roll a single 6: I cannot born.
6. Opponent's block sits on my start square, I roll 6 + 6: I born two pawns as a block on top of theirs and kill both of their pawns.

## Moving and dice
7. Two dice must both be used when any legal way exists. If only one can be used, use it. If neither, turn passes.
8. Each die can move a different pawn, or both dice can move the same pawn.
9. Exact finish: a pawn 3 away from heaven with a roll of 5 cannot move; another pawn must move, or the turn is skipped.
10. No legal moves at all: turn passes automatically.

## Sixes
11. One die, roll 6: one extra roll.
12. Two dice, roll 6 + 2: one extra roll.
13. Two dice, roll 6 + 6: still only one extra roll.
14. Sixes chain with no limit (6, then 6, then 6 keeps rolling).

## Killing
15. Landing exactly on a single opponent pawn sends it back to its yard.
16. A pawn on its own start square can still be killed (no safe squares on the track).
17. Squares inside a player's home lane are safe (only that player can enter).
18. Killing does not give a bonus roll.

## Blocks
19. Two (or three) of my pawns on one square form a block.
20. A single pawn cannot pass or land on an opponent's block.
21. Two dice, double 4: block moves together 4 squares (each pawn 4).
22. Two dice, double 4: alternatively one pawn of the block moves 8 and the rest stay.
23. Splitting: a normal (non-double) roll can move one pawn off my block, if the path is not blocked.
24. Only a block can kill a block: my block landing exactly on an opponent block kills all of its pawns.
25. My block landing on a single opponent pawn kills it.

## Last square before home
26a. A man sitting on his own long crossing bar (his lastTrackIndex) can be killed by any opponent who lands there. It is the last square before he turns into his home lane.
26b. A man that has moved into his home lane can no longer be killed.

## One-die mode
26. Blocks can still form.
27. Blocks cannot be passed, cannot be killed, and cannot move together.
28. A block breaks only when its owner moves one pawn off it, by choice or because it is the only legal move.

## Winning
29. First player with all 4 pawns in heaven wins; play may continue for 2nd and 3rd.
30. Heaven-less mode ON: the moment every player has at least one pawn in heaven, the game ends as a draw for everyone.
31. Heaven-less mode OFF: rule 30 never triggers.

## Persistence
32. Save to localStorage after an action, reload, state is identical.
