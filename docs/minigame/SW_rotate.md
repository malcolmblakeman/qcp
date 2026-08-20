# SW corner - Rotate puzzle

All four pawns shift one seat around the block (a 4-cycle rotation).

- corner: bottom-left | corner cell: (8,0)
- corner piece (moves first): **Blue**
- optimal solution: **5 moves** | return trip: 7 moves | round trip: 12
- engine-verified: YES

## Start

```
  col0  col1
  Gr   Ye    (row 7)
  Bl   Bk    (row 8)
```

## Target

```
  col0  col1
  Ye   Bk    (row 7)
  Gr   Bl    (row 8)
```

## Solution

1. **Blue** -> (8,2) (jump)
2. **Green** -> (8,0) (step)
3. **Yellow** -> (7,0) (step)
4. **Black** -> (7,1) (step)
5. **Blue** -> (8,1) (step)

## Return trip

1. **Green** -> (6,0) (jump)
2. **Yellow** -> (7,2) (jump)
3. **Black** -> (6,1) (step)
4. **Blue** -> (8,0) (step)
5. **Green** -> (7,0) (step)
6. **Yellow** -> (7,1) (step)
7. **Black** -> (8,1) (jump)
