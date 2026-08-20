# NE corner - Rotate puzzle

All four pawns shift one seat around the block (a 4-cycle rotation).

- corner: top-right | corner cell: (0,8)
- corner piece (moves first): **Yellow**
- optimal solution: **7 moves** | return trip: 6 moves | round trip: 13
- engine-verified: YES

## Start

```
  col7  col8
  Bk   Ye    (row 0)
  Gr   Bl    (row 1)
```

## Target

```
  col7  col8
  Gr   Bk    (row 0)
  Bl   Ye    (row 1)
```

## Solution

1. **Yellow** -> (2,8) (jump)
2. **Black** -> (0,6) (step)
3. **Blue** -> (1,6) (jump)
4. **Green** -> (0,7) (step)
5. **Yellow** -> (1,8) (step)
6. **Black** -> (0,8) (jump)
7. **Blue** -> (1,7) (step)

## Return trip

1. **Green** -> (2,7) (jump)
2. **Yellow** -> (2,8) (step)
3. **Black** -> (0,7) (step)
4. **Blue** -> (1,8) (step)
5. **Green** -> (1,7) (step)
6. **Yellow** -> (0,8) (jump)
