
// ---- logic test: every puzzle solvable at par via engine replay ----
let pass = 0, fail = 0;
const assert = (c, n) => { if (c) pass++; else { fail++; console.log("FAIL:", n); } };
for (const pz of PUZZLES) {
    const sol = cpSolve(pz.start, pz.firstMoverIndex, pz.target, pz.region);
    assert(sol !== null && sol.length === pz.par, pz.id + " par match");
    const g = new Game();
    for (let i = 0; i < 4; i++) {
        g.board.pawns[i].position.row = Math.floor(pz.start[i] / 9);
        g.board.pawns[i].position.col = pz.start[i] % 9;
    }
    g.turn = pz.firstMoverIndex;
    let ok = true;
    for (const mv of sol) {
        if (g.winner !== null || !g.doMove([[Math.floor(mv.dest / 9), mv.dest % 9], null, null], true)) { ok = false; break; }
    }
    assert(ok && g.board.pawns.map(p => p.position.row * 9 + p.position.col).join(",") === pz.target.join(","), pz.id + " engine replay");
}
// opener variants: id suffix encodes the opener; first mover matches; not the corner piece
const INITIAL_POS = { "Y": 0, "R": 1, "B": 2, "G": 3 };
const openers = PUZZLES.filter(p => /_(Y|R|B|G)$/.test(p.id));
assert(openers.length === 360, "360 opener puzzles (got " + openers.length + ")");
assert(openers.every(p => p.firstMoverIndex === INITIAL_POS[p.id.slice(-1)]), "id suffix matches opener");
assert(openers.every(p => p.start[p.firstMoverIndex] !== p.cornerCell), "opener not on the corner cell");
assert(openers.every(p => p.par >= 5 && p.par <= 14), "opener pars in range");
// round trip: canonical return leg solvable for every puzzle
let rtOk = 0, rtTot = 0;
for (const pz of PUZZLES.filter(p => !p.featured)) {
    rtTot++;
    const sol2 = cpSolve(pz.target, (pz.firstMoverIndex + pz.par) % 4, pz.start, pz.region);
    if (sol2 !== null) rtOk++;
}
assert(rtOk === rtTot, "round-trip return solvable for all " + rtTot + " (got " + rtOk + ")");
const tiers = PUZZLES.filter(p => !p.featured).reduce((a, p) => {
    const t = p.par <= 7 ? 0 : (p.par <= 10 ? 1 : 2);
    a[t] = (a[t] || 0) + 1; return a;
}, {});
assert(tiers[0] > 0 && tiers[1] > 0 && tiers[2] > 0, "all streak tiers non-empty: " + JSON.stringify(tiers));
// grand tour data integrity
for (const cid of Object.keys(TOURS)) {
    const T = TOURS[cid];
    assert(T.arrangements.length === 6 && T.par.length === 6 && T.order.length === 6, cid + " tour data shape");
    assert(T.par.every(p => p >= 30 && p <= 45), cid + " tour pars plausible: " + T.par.join(","));
    for (const ord of T.order) {
        assert(new Set(ord).size === 6 && ord.every(x => x >= 0 && x < 6), cid + " order is a permutation");
    }
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j) {
        for (let t = 0; t < 4; t++) {
            const d = T.dist[i * 24 + j * 4 + t];
            assert(d >= 5 && d <= 20, cid + " dist " + i + "->" + j + "@" + t + " = " + d);
        }
    }
}
console.log("LOGIC RESULT:", pass, "passed,", fail, "failed");
if (fail) process.exit(1);
