# Corner Puzzle Minigame - 8 Puzzles

Four board corners x two puzzle types (Swap, Rotate). Every solution is BFS-shortest
(provably optimal) and re-validated against the real game engine.

Rules: no walls; turn order Yellow -> Black -> Blue -> Green; everyone must move each
turn (step / jump / diagonal jump); no pawn may land on its own goal line;
the corner piece (pawn on the board-corner cell) always moves first.

| puzzle | corner | type | first mover | moves | return | round trip | files |
|---|---|---|---|---|---|---|---|
| SW_swap | bottom-left | swap | Blue | 11 | 10 | 21 | [gif](SW_swap.gif) [solution](SW_swap.md) |
| SW_rotate | bottom-left | rotate | Blue | 5 | 7 | 12 | [gif](SW_rotate.gif) [solution](SW_rotate.md) |
| SE_swap | bottom-right | swap | Black | 11 | 10 | 21 | [gif](SE_swap.gif) [solution](SE_swap.md) |
| SE_rotate | bottom-right | rotate | Black | 5 | 7 | 12 | [gif](SE_rotate.gif) [solution](SE_rotate.md) |
| NW_swap | top-left | swap | Green | 11 | 10 | 21 | [gif](NW_swap.gif) [solution](NW_swap.md) |
| NW_rotate | top-left | rotate | Green | 7 | 6 | 13 | [gif](NW_rotate.gif) [solution](NW_rotate.md) |
| NE_swap | top-right | swap | Black | 10 | 11 | 21 | [gif](NE_swap.gif) [solution](NE_swap.md) |
| NE_rotate | top-right | rotate | Yellow | 7 | 6 | 13 | [gif](NE_rotate.gif) [solution](NE_rotate.md) |

Difficulty spread: Rotate puzzles are the quick ones (5-7 moves);
Swap puzzles are the meaty ones (10-11 moves). The four corners are NOT identical -
turn order breaks the symmetry, so each corner plays differently.

