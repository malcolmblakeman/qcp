/* Ladder generator: all 30 ordered arrangement pairs per corner (120 puzzles),
*  each solved (BFS par) and validated by engine replay, then written to
*  js/puzzles.js together with the 8 curated/featured puzzles.
*
*  Run: cat js/game.js js/solver.js js/puzzles.js tools/generate_ladder.js > /tmp/gen.js \
*       && node /tmp/gen.js
*  (reads the existing puzzles.js to preserve the featured 8 as-is)
*/
"use strict";

const NAMES = ["Yellow", "Red", "Blue", "Green"];

const CORNERS = [
    { id: "SW", tl: 63, tr: 64, bl: 72, br: 73, cornerCell: 72, region: { r0: 3, r1: 8, c0: 0, c1: 4 } },
    { id: "SE", tl: 70, tr: 71, bl: 79, br: 80, cornerCell: 80, region: { r0: 3, r1: 8, c0: 4, c1: 8 } },
    { id: "NW", tl: 0,  tr: 1,  bl: 9,  br: 10, cornerCell: 0,  region: { r0: 0, r1: 5, c0: 0, c1: 4 } },
    { id: "NE", tl: 7,  tr: 8,  bl: 16, br: 17, cornerCell: 8,  region: { r0: 0, r1: 5, c0: 4, c1: 8 } }
];

function onOwnGoal(pi, r, c) {
    return (pi === 0 && r === 8) || (pi === 1 && c === 0) || (pi === 2 && r === 0) || (pi === 3 && c === 8);
}

function arrangementsFor(corner) {
    const cells = [corner.tl, corner.tr, corner.bl, corner.br];
    const out = [];
    (function perm(arr) {
        if (arr.length === 4) {
            const pos = [0, 0, 0, 0];
            arr.forEach((pi, slot) => { pos[pi] = cells[slot]; });
            if (pos.every((p, pi) => !onOwnGoal(pi, Math.floor(p / 9), p % 9))) out.push(pos);
            return;
        }
        for (const pi of [0, 1, 2, 3]) if (!arr.includes(pi)) perm(arr.concat(pi));
    })([]);
    out.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]) || (a[3] - b[3]));
    return out;
}

function engineReplayOK(start, firstMover, moves, target) {
    const g = new Game();
    for (let i = 0; i < 4; i++) {
        g.board.pawns[i].position.row = Math.floor(start[i] / 9);
        g.board.pawns[i].position.col = start[i] % 9;
    }
    g.turn = firstMover;
    for (const mv of moves) {
        if (g.winner !== null) return false;
        if (!g.doMove([[Math.floor(mv.dest / 9), mv.dest % 9], null, null], true)) return false;
    }
    return g.board.pawns.map(p => p.position.row * 9 + p.position.col).join(",") === target.join(",");
}

/* keep featured 8 from the existing puzzles.js (already validated) */
const FEATURED_IDS = ["SE_rotate", "SW_rotate", "NW_rotate", "NE_rotate", "SW_swap", "SE_swap", "NW_swap", "NE_swap"];
const _seen = new Set();
const featured = PUZZLES
    .filter(p => FEATURED_IDS.includes(p.id) && !_seen.has(p.id) && _seen.add(p.id))
    .map(p => Object.assign({}, p, { featured: true }));
if (featured.length !== 8) { console.log("FEATURED != 8: " + featured.length); process.exit(1); }
const ladder = [];
const steps = [];   // opener-variant family
const dist = {};
const distSteps = {};
for (const corner of CORNERS) {
    const arrs = arrangementsFor(corner);
    if (arrs.length !== 6) { console.log("ARRANGEMENTS != 6 for " + corner.id); process.exit(1); }
    "ABCDEF".split("").forEach((L, i) => { if (arrs[i].join(",") !== undefined) arrs[i]._label = L; });
    for (let s = 0; s < 6; s++) {
        for (let t = 0; t < 6; t++) {
            if (s === t) continue;
            const start = arrs[s], target = arrs[t];
            const firstMover = start.indexOf(corner.cornerCell);
            const sol = cpSolve(start, firstMover, target, corner.region);
            if (!sol) { console.log("UNSOLVABLE " + corner.id + " " + arrs[s]._label + "->" + arrs[t]._label); process.exit(1); }
            if (!engineReplayOK(start, firstMover, sol, target)) {
                console.log("REPLAY FAILED " + corner.id + " " + arrs[s]._label + "->" + arrs[t]._label); process.exit(1);
            }
            const par = sol.length;
            dist[par] = (dist[par] || 0) + 1;
            ladder.push({
                id: corner.id + "_" + arrs[s]._label + arrs[t]._label,
                label: corner.id + " \u00b7 " + arrs[s]._label + " \u2192 " + arrs[t]._label + "  (par " + par + ")",
                corner: corner.id,
                region: corner.region,
                start: start.slice(),
                target: target.slice(),
                par: par,
                firstMoverIndex: firstMover,
                cornerCell: corner.cornerCell
            });
            // opener variants: every pawn (not just the corner piece) gets to open
            const INITIALS = ["Y", "R", "B", "G"];
            for (let m = 0; m < 4; m++) {
                if (m === firstMover) continue;   // that's the classic entry
                const solM = cpSolve(start, m, target, corner.region);
                if (solM === null) continue;
                const gm = new Game();
                for (let i = 0; i < 4; i++) {
                    gm.board.pawns[i].position.row = Math.floor(start[i] / 9);
                    gm.board.pawns[i].position.col = start[i] % 9;
                }
                gm.turn = m;
                let okM = true;
                for (const mv of solM) {
                    if (gm.winner !== null || !gm.doMove([[Math.floor(mv.dest / 9), mv.dest % 9], null, null], true)) { okM = false; break; }
                }
                if (okM && gm.board.pawns.map(p => p.position.row * 9 + p.position.col).join(",") === target.join(",")) {
                    distSteps[solM.length] = (distSteps[solM.length] || 0) + 1;
                    steps.push({
                        id: corner.id + "_" + arrs[s]._label + arrs[t]._label + "_" + INITIALS[m],
                        label: corner.id + " \u00b7 " + arrs[s]._label + " \u2192 " + arrs[t]._label +
                               " \u00b7 " + NAMES[m] + " opens  (par " + solM.length + ")",
                        corner: corner.id,
                        region: corner.region,
                        start: start.slice(),
                        target: target.slice(),
                        par: solM.length,
                        firstMoverIndex: m,
                        cornerCell: corner.cornerCell
                    });
                }
            }
        }
    }
    console.log(corner.id + ": 30 pairs solved + validated");
}
console.log("par distribution:", JSON.stringify(dist));
console.log("opener variants:", steps.length, "puzzles, par distribution:", JSON.stringify(distSteps));
console.log("opener solutions engine-validated");
const easy = ladder.filter(p => p.par <= 7).length;
const medium = ladder.filter(p => p.par >= 8 && p.par <= 10).length;
const hard = ladder.filter(p => p.par >= 11).length;
console.log("tiers -> easy(<=7): " + easy + " | medium(8-10): " + medium + " | hard(11+): " + hard);

const all = featured.concat(ladder, steps);
// ---- grand tour data (per corner): turn-aware leg distances + optimal tours ----
const TOURS = {};
for (const corner of CORNERS) {
    const tarrs = arrangementsFor(corner);
    const movers = tarrs.map(a => a.indexOf(corner.cornerCell));
    const dist = [];
    for (let i = 0; i < 6; i++) {
        dist.push([]);
        for (let j = 0; j < 6; j++) {
            dist[i].push([]);
            if (i !== j) {
                for (let t = 0; t < 4; t++) {
                    const s = cpSolve(tarrs[i], t, tarrs[j], corner.region);
                    dist[i][j][t] = s ? s.length : -1;
                }
            }
        }
    }
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j) {
        for (let t = 0; t < 4; t++) if (dist[i][j][t] < 0) { console.log("TOUR LEG UNSOLVABLE " + corner.id); process.exit(1); }
    }
    const INF = 1e9;
    const memo = new Map();
    const bestArr = function (mask, last, ply) {
        if (mask === 63) return [0, -1];
        const key = (mask * 24) + (last * 4) + ply;
        if (memo.has(key)) return memo.get(key);
        let bl = INF, bj = -1;
        for (let j = 0; j < 6; j++) {
            if (mask & (1 << j)) continue;
            const leg = dist[last][j][ply];
            const sub = bestArr(mask | (1 << j), j, (ply + leg) % 4)[0];
            if (leg + sub < bl) { bl = leg + sub; bj = j; }
        }
        memo.set(key, [bl, bj]);
        return [bl, bj];
    };
    const par = [], order = [];
    for (let s = 0; s < 6; s++) {
        par.push(bestArr(1 << s, s, movers[s])[0]);
        const ord = [s];
        let mask = 1 << s, last = s, ply = movers[s];
        while (mask !== 63) {
            const j = bestArr(mask, last, ply)[1];
            ply = (ply + dist[last][j][ply]) % 4;
            ord.push(j);
            mask |= (1 << j);
            last = j;
        }
        order.push(ord);
    }
    for (let s = 0; s < 6; s++) {
        const g = new Game();
        for (let i = 0; i < 4; i++) {
            g.board.pawns[i].position.row = Math.floor(tarrs[s][i] / 9);
            g.board.pawns[i].position.col = tarrs[s][i] % 9;
        }
        let ply = movers[s];
        g.turn = ply;
        let total = 0, visitedMask = 1 << s, ok = true;
        for (let k = 1; k < 6 && ok; k++) {
            const from = order[s][k - 1], to = order[s][k];
            const sol = cpSolve(tarrs[from], ply, tarrs[to], corner.region);
            if (!sol) { ok = false; break; }
            for (const mv of sol) {
                if (g.winner !== null || !g.doMove([[Math.floor(mv.dest / 9), mv.dest % 9], null, null], true)) { ok = false; break; }
            }
            if (!ok) break;
            total += sol.length;
            ply = (ply + sol.length) % 4;
            const posKey = g.board.pawns.map(p => p.position.row * 9 + p.position.col).join(",");
            const hit = tarrs.findIndex(a => a.join(",") === posKey);
            if (hit < 0 || (visitedMask & (1 << hit))) { ok = false; break; }
            visitedMask |= 1 << hit;
        }
        if (!ok || total !== par[s] || visitedMask !== 63) {
            console.log("TOUR VALIDATION FAILED " + corner.id + " start " + s); process.exit(1);
        }
    }
    const flat = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) for (let t = 0; t < 4; t++) {
        flat.push(i === j ? 0 : dist[i][j][t]);
    }
    TOURS[corner.id] = { arrangements: tarrs, movers, dist: flat, par, order };
    console.log(corner.id + " grand tour pars: " + par.join(","));
}

const js = '"use strict";\n' +
    '/* Puzzle data: 8 featured + full 120-puzzle ladder (every ordered pair of the\n' +
    ' *  6 valid arrangements per corner), generated and engine-validated by\n' +
    ' *  tools/generate_ladder.js. Difficulty tiers: easy = par <= 7,\n' +
    ' *  medium = 8-10, hard = 11+. TOURS = grand-tour data per corner:\n' +
    ' *  arrangements, corner-piece movers, turn-aware leg distances\n' +
    ' *  [i][j][t] flattened to i*24+j*4+t, optimal-tour par + order per start. */\n' +
    'const PUZZLES = ' + JSON.stringify(all) + ';\n' +
    'const TOURS = ' + JSON.stringify(TOURS) + ';\n';
require("fs").writeFileSync(process.env.PUZZLES_OUT || (__dirname + "/../js/puzzles.js"), js);
console.log("wrote js/puzzles.js (" + all.length + " puzzles)");
