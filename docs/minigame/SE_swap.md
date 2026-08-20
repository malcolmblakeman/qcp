# SE corner - Swap puzzle

The two pawns allowed on the corner cell trade places; the other two stay put.

- corner: bottom-right | corner cell: (8,8)
- corner piece (moves first): **Black**
- optimal solution: **11 moves** | return trip: 10 moves | round trip: 21
- engine-verified: YES

## Start

```
  col7  col8
  Bl   Ye    (row 7)
  Gr   Bk    (row 8)
```

## Target

```
  col7  col8
  Bk   Ye    (row 7)
  Gr   Bl    (row 8)
```

## Solution

1. **Black** -> (8,6) (jump)
2. **Blue** -> (6,7) (step)
3. **Green** -> (7,7) (step)
4. **Yellow** -> (6,8) (step)
5. **Black** -> (7,6) (step)
6. **Blue** -> (8,7) (jump)
7. **Green** -> (6,7) (step)
8. **Yellow** -> (7,8) (step)
9. **Black** -> (7,7) (step)
10. **Blue** -> (8,8) (step)
11. **Green** -> (8,7) (jump)

## Return trip

1. **Yellow** -> (6,8) (step)
2. **Black** -> (6,7) (step)
3. **Blue** -> (7,8) (step)
4. **Green** -> (8,6) (step)
5. **Yellow** -> (5,8) (step)
6. **Black** -> (6,8) (step)
7. **Blue** -> (7,7) (step)
8. **Green** -> (8,7) (step)
9. **Yellow** -> (7,8) (jump)
10. **Black** -> (8,8) (jump)
