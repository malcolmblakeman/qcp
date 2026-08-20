# NW corner - Swap puzzle

The two pawns allowed on the corner cell trade places; the other two stay put.

- corner: top-left | corner cell: (0,0)
- corner piece (moves first): **Green**
- optimal solution: **11 moves** | return trip: 10 moves | round trip: 21
- engine-verified: YES

## Start

```
  col0  col1
  Gr   Bk    (row 0)
  Bl   Ye    (row 1)
```

## Target

```
  col0  col1
  Ye   Bk    (row 0)
  Bl   Gr    (row 1)
```

## Solution

1. **Green** -> (0,2) (jump)
2. **Yellow** -> (2,1) (step)
3. **Black** -> (1,1) (step)
4. **Blue** -> (2,0) (step)
5. **Green** -> (1,2) (step)
6. **Yellow** -> (0,1) (jump)
7. **Black** -> (2,1) (step)
8. **Blue** -> (1,0) (step)
9. **Green** -> (1,1) (step)
10. **Yellow** -> (0,0) (step)
11. **Black** -> (0,1) (jump)

## Return trip

1. **Blue** -> (2,0) (step)
2. **Green** -> (2,1) (step)
3. **Yellow** -> (1,0) (step)
4. **Black** -> (0,2) (step)
5. **Blue** -> (3,0) (step)
6. **Green** -> (2,0) (step)
7. **Yellow** -> (1,1) (step)
8. **Black** -> (0,1) (step)
9. **Blue** -> (1,0) (jump)
10. **Green** -> (0,0) (jump)
