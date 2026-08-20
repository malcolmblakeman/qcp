# NW corner - Rotate puzzle

All four pawns shift one seat around the block (a 4-cycle rotation).

- corner: top-left | corner cell: (0,0)
- corner piece (moves first): **Green**
- optimal solution: **7 moves** | return trip: 6 moves | round trip: 13
- engine-verified: YES

## Start

```
  col0  col1
  Gr   Bk    (row 0)
  Ye   Bl    (row 1)
```

## Target

```
  col0  col1
  Ye   Gr    (row 0)
  Bl   Bk    (row 1)
```

## Solution

1. **Green** -> (0,2) (jump)
2. **Yellow** -> (2,0) (step)
3. **Black** -> (2,1) (jump)
4. **Blue** -> (1,0) (step)
5. **Green** -> (0,1) (step)
6. **Yellow** -> (0,0) (jump)
7. **Black** -> (1,1) (step)

## Return trip

1. **Blue** -> (1,2) (jump)
2. **Green** -> (0,2) (step)
3. **Yellow** -> (1,0) (step)
4. **Black** -> (0,1) (step)
5. **Blue** -> (1,1) (step)
6. **Green** -> (0,0) (jump)
