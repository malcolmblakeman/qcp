# NE corner - Swap puzzle

The two pawns allowed on the corner cell trade places; the other two stay put.

- corner: top-right | corner cell: (0,8)
- corner piece (moves first): **Black**
- optimal solution: **10 moves** | return trip: 11 moves | round trip: 21
- engine-verified: YES

## Start

```
  col7  col8
  Gr   Bk    (row 0)
  Ye   Bl    (row 1)
```

## Target

```
  col7  col8
  Gr   Ye    (row 0)
  Bk   Bl    (row 1)
```

## Solution

1. **Black** -> (2,8) (jump)
2. **Blue** -> (3,8) (jump)
3. **Green** -> (0,6) (step)
4. **Yellow** -> (1,8) (step)
5. **Black** -> (2,7) (step)
6. **Blue** -> (2,8) (step)
7. **Green** -> (0,7) (step)
8. **Yellow** -> (0,8) (step)
9. **Black** -> (1,7) (step)
10. **Blue** -> (1,8) (step)

## Return trip

1. **Green** -> (2,7) (jump)
2. **Yellow** -> (0,7) (step)
3. **Black** -> (1,6) (step)
4. **Blue** -> (2,8) (step)
5. **Green** -> (1,7) (step)
6. **Yellow** -> (2,7) (jump)
7. **Black** -> (0,6) (step)
8. **Blue** -> (1,8) (step)
9. **Green** -> (0,7) (step)
10. **Yellow** -> (1,7) (step)
11. **Black** -> (0,8) (jump)
