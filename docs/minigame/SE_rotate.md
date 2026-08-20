# SE corner - Rotate puzzle

All four pawns shift one seat around the block (a 4-cycle rotation).

- corner: bottom-right | corner cell: (8,8)
- corner piece (moves first): **Black**
- optimal solution: **5 moves** | return trip: 7 moves | round trip: 12
- engine-verified: YES

## Start

```
  col7  col8
  Gr   Ye    (row 7)
  Bl   Bk    (row 8)
```

## Target

```
  col7  col8
  Ye   Bk    (row 7)
  Gr   Bl    (row 8)
```

## Solution

1. **Black** -> (6,8) (jump)
2. **Blue** -> (8,8) (step)
3. **Green** -> (8,7) (step)
4. **Yellow** -> (7,7) (step)
5. **Black** -> (7,8) (step)

## Return trip

1. **Blue** -> (8,6) (jump)
2. **Green** -> (6,7) (jump)
3. **Yellow** -> (7,6) (step)
4. **Black** -> (8,8) (step)
5. **Blue** -> (8,7) (step)
6. **Green** -> (7,7) (step)
7. **Yellow** -> (7,8) (jump)
