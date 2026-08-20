# SW corner - Swap puzzle

The two pawns allowed on the corner cell trade places; the other two stay put.

- corner: bottom-left | corner cell: (8,0)
- corner piece (moves first): **Blue**
- optimal solution: **11 moves** | return trip: 10 moves | round trip: 21
- engine-verified: YES

## Start

```
  col0  col1
  Ye   Gr    (row 7)
  Bl   Bk    (row 8)
```

## Target

```
  col0  col1
  Ye   Bl    (row 7)
  Gr   Bk    (row 8)
```

## Solution

1. **Blue** -> (6,0) (jump)
2. **Green** -> (7,2) (step)
3. **Yellow** -> (5,0) (jump)
4. **Black** -> (7,1) (step)
5. **Blue** -> (7,0) (step)
6. **Green** -> (8,2) (step)
7. **Yellow** -> (6,0) (step)
8. **Black** -> (8,1) (step)
9. **Blue** -> (7,1) (step)
10. **Green** -> (8,0) (jump)
11. **Yellow** -> (7,0) (step)

## Return trip

1. **Black** -> (8,2) (step)
2. **Blue** -> (7,2) (step)
3. **Green** -> (8,1) (step)
4. **Yellow** -> (6,0) (step)
5. **Black** -> (8,3) (step)
6. **Blue** -> (8,2) (step)
7. **Green** -> (7,1) (step)
8. **Yellow** -> (7,0) (step)
9. **Black** -> (8,1) (jump)
10. **Blue** -> (8,0) (jump)
