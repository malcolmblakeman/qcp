"use strict";

/*
* Corner-puzzle solver (standalone BFS; mirrors the move rules of game.js):
*  - turn order Y -> Bk -> Bl -> Gr, everyone must move
*  - steps / straight jumps / diagonal jumps (diagonal only when straight is impossible)
*  - no pawn may land on its own goal line
*  - movement restricted to the puzzle region
* Dense typed-array BFS: optimal solution or null. Used by the hint worker.
*/

const CP_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CP_KINDS = ["step", "jump", "diagonal"];

function cpOnOwnGoal(pi, r, c) {
    return (pi === 0 && r === 8) || (pi === 1 && c === 0) || (pi === 2 && r === 0) || (pi === 3 && c === 8);
}

/*
* startPos: array of 4 cell ids (r*9+c), pawn order [Y, Bk, Bl, Gr]
* startTurn: index of the player to move
* targetPos: array of 4 cell ids (the arrangement to reach; instant after a move)
* region: {r0, r1, c0, c1}
* Returns array of moves [{pi, dest, kind}] or null (no solution / timeout).
*/
function cpSolve(startPos, startTurn, targetPos, region) {
    startTurn = ((startTurn % 4) + 4) % 4;   // engine turn is an absolute ply counter
    const inRegion = (r, c) => r >= region.r0 && r <= region.r1 && c >= region.c0 && c <= region.c1;
    // region cell tables
    const cellToIdx = new Int8Array(81).fill(-1);
    const idxToCell = [];
    for (let r = region.r0; r <= region.r1; r++) {
        for (let c = region.c0; c <= region.c1; c++) {
            cellToIdx[r * 9 + c] = idxToCell.length;
            idxToCell.push(r * 9 + c);
        }
    }
    const RN = idxToCell.length;
    // move candidates per cell: [destIdx, kind]
    const table = [];
    for (let ci = 0; ci < RN; ci++) {
        table.push([]);
        const r = Math.floor(idxToCell[ci] / 9), c = idxToCell[ci] % 9;
        for (let d = 0; d < 4; d++) {
            const nr = r + CP_DIRS[d][0], nc = c + CP_DIRS[d][1];
            if (!inRegion(nr, nc)) continue;
            table[ci].push([cellToIdx[nr * 9 + nc], 0]);
            const sr = nr + CP_DIRS[d][0], sc = nc + CP_DIRS[d][1];
            if (inRegion(sr, sc)) table[ci].push([cellToIdx[sr * 9 + sc], 1]);
            for (const e of (d < 2 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]])) {
                const dr = nr + e[0], dc = nc + e[1];
                if (inRegion(dr, dc)) table[ci].push([cellToIdx[dr * 9 + dc], 2]);
            }
        }
    }
    const key4 = (a, b, c, d, t) => ((a * RN + b) * RN + c) * RN * 4 + d * 4 + t;

    const targetKey = targetPos.join(",");
    const total = RN * RN * RN * RN * 4;
    const sIdx = startPos.map(p => cellToIdx[p]);
    const startKey = key4(sIdx[0], sIdx[1], sIdx[2], sIdx[3], startTurn);
    const dist = new Int32Array(total).fill(-1);
    const parent = new Int32Array(total).fill(-1);
    const moveEnc = new Int32Array(total).fill(-1);
    const queue = new Int32Array(total);
    let qh = 0, qt = 0;
    parent[startKey] = startKey;
    dist[startKey] = 0;
    queue[qt++] = startKey;
    let goalState = -1;
    const posIdx = [0, 0, 0, 0];
    const cellOf = new Int8Array(4);

    while (qh < qt && goalState === -1) {
        const v = queue[qh++];
        const t = v & 3;
        const rest = (v - t) / 4;
        posIdx[3] = rest % RN;
        const r3 = (rest - posIdx[3]) / RN;
        posIdx[2] = r3 % RN;
        const r2 = (r3 - posIdx[2]) / RN;
        posIdx[1] = r2 % RN;
        posIdx[0] = (r2 - posIdx[1]) / RN;
        for (let i = 0; i < 4; i++) cellOf[i] = idxToCell[posIdx[i]];
        const d0 = dist[v];
        const occ0 = posIdx[(t + 1) % 4], occ1 = posIdx[(t + 2) % 4], occ2 = posIdx[(t + 3) % 4];
        const mr = Math.floor(cellOf[t] / 9), mc = cellOf[t] % 9;
        for (const [destIdx, kind] of table[posIdx[t]]) {
            if (destIdx === occ0 || destIdx === occ1 || destIdx === occ2) continue;
            const destCell = idxToCell[destIdx];
            const dr = Math.floor(destCell / 9), dc = destCell % 9;
            if (cpOnOwnGoal(t, dr, dc)) continue;
            if (kind > 0) {
                const midR = (mr + dr) / 2, midC = (mc + dc) / 2;
                let midIsPawn = false;
                for (let i = 0; i < 4; i++) {
                    if (i === t) continue;
                    if (Math.floor(cellOf[i] / 9) === midR && cellOf[i] % 9 === midC) midIsPawn = true;
                }
                if (!midIsPawn) continue;
                if (kind === 2) {
                    const beyondR = 2 * midR - mr, beyondC = 2 * midC - mc;
                    let beyondOpen = inRegion(beyondR, beyondC) && beyondR >= 0 && beyondR <= 8 && beyondC >= 0 && beyondC <= 8;
                    if (beyondOpen) {
                        const beyondCell = beyondR * 9 + beyondC;
                        for (let i = 0; i < 4; i++) if (i !== t && cellOf[i] === beyondCell) beyondOpen = false;
                    }
                    if (beyondOpen) continue;
                }
            }
            const np = posIdx.slice();
            np[t] = destIdx;
            const w = key4(np[0], np[1], np[2], np[3], (t + 1) % 4);
            if (dist[w] !== -1) continue;
            dist[w] = d0 + 1;
            parent[w] = v;
            moveEnc[w] = (t << 16) | (destCell << 2) | kind;
            const k2 = idxToCell[np[0]] + "," + idxToCell[np[1]] + "," + idxToCell[np[2]] + "," + idxToCell[np[3]];
            if (k2 === targetKey) { goalState = w; break; }
            queue[qt++] = w;
        }
    }
    if (goalState === -1) return null;
    const seq = [];
    let v = goalState;
    while (parent[v] !== v) {
        const enc = moveEnc[v];
        seq.push({ pi: enc >> 16, dest: (enc >> 2) & 127, kind: CP_KINDS[enc & 3] });
        v = parent[v];
    }
    return seq.reverse();
}
