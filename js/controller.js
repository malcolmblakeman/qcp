"use strict";

/*
* Controller for the corner-puzzle minigame.
* Pawn-only moves (no walls), turn order continues Y->Bk->Bl->Gr from the
* puzzle's designated first mover; win = target arrangement reached.
*/
class Controller {
    constructor() {
        this.puzzle = null;
        this.game = null;
        this.history = [];          // [{pos:[4], turn}]
        this.movesDone = 0;
        this.hintsUsed = 0;
        this.solved = false;
        this.hintWorker = null;
        this.hintSerial = 0;
        this.view = null;           // assigned after construction
        this.moveLog = [];          // [{pi, dest}] the player's actual moves
        this.playingBack = false;
        this.playbackTimer = null;
        this.lastWin = null;        // {moves, par, hints}
        this.streak = null;         // {mode: easy|medium|hard|steep, tier: 0-2, count}
        this.roundTrip = false;     // there-and-back mode
        this.phase = 1;             // 1 = going, 2 = coming back
        this.legPar2 = null;        // return-leg par (computed at arrival)
        this.leg1Moves = 0;         // moves used on leg 1
        this.tour = null;           // grand tour state
        this._tourLoading = false;
        this.streakTimer = null;
        this._streakLoading = false;
        try { this.roundTrip = localStorage.getItem("cp_round_trip") === "1"; } catch (e) {}
    }

    /* ------- random & streak ------- */
    static tierOf(pz) {
        return pz.par <= 7 ? 0 : (pz.par <= 10 ? 1 : 2);
    }
    tierPool(tier) {
        return PUZZLES.filter(p => !p.featured && Controller.tierOf(p) === tier);
    }
    currentTarget() {
        if (this.tour !== null) {
            const t = this.tourNextTarget();
            return t !== null ? t : this.puzzle.target;
        }
        return (this.roundTrip && this.phase === 2) ? this.puzzle.start : this.puzzle.target;
    }
    totalPar() {
        return this.puzzle.par + (this.legPar2 || 0);
    }
    toggleRoundTrip() {
        if (this.tour !== null) return;   // tour is its own mode
        this.roundTrip = !this.roundTrip;
        try { localStorage.setItem("cp_round_trip", this.roundTrip ? "1" : "0"); } catch (e) {}
        if (this.puzzle !== null) this.loadPuzzle(this.puzzle.id);
        if (this.view) this.view.updateModeButton(); // ADDED
    }

    // ADDED: Central function to cycle modes based on current state
    cycleMode() {
        if (this.playingBack) return;
        
        // 1. If streak is active, cycle streak difficulty
        if (this.streak !== null) {
            const modes = ['easy', 'medium', 'hard', 'steep'];
            const curIdx = modes.indexOf(this.streak.mode);
            const nextMode = modes[(curIdx + 1) % modes.length];
            this.startStreak(nextMode); // startStreak handles UI updates
            return;
        }

        // 2. If tour is active, exit to normal
        if (this.tour !== null) {
            this.exitTour();
            return;
        }

        // 3. If round trip is active, turn it off and start tour
        if (this.roundTrip) {
            this.roundTrip = false;
            try { localStorage.setItem("cp_round_trip", "0"); } catch (e) {}
            if (this.puzzle !== null) this.loadPuzzle(this.puzzle.id);
            this.startTour();
            return;
        }

        // 4. If normal mode, switch to round trip
        this.toggleRoundTrip();
    }

    /* ------- grand tour ------- */
    tourDist(i, j, t) {
        const d = TOURS[this.tour.cornerId].dist;
        return d[i * 24 + j * 4 + (((t % 4) + 4) % 4)];
    }
    tourDP(mask, last, ply) {
        const memo = this._tourMemo || (this._tourMemo = new Map());
        const key = mask * 24 + last * 4 + (((ply % 4) + 4) % 4);
        if (memo.has(key)) return memo.get(key);
        if (mask === 63) { const r = [0, -1]; memo.set(key, r); return r; }
        let bl = Infinity, bj = -1;
        for (let j = 0; j < 6; j++) {
            if (mask & (1 << j)) continue;
            const leg = this.tourDist(last, j, ply);
            const sub = this.tourDP(mask | (1 << j), j, ply + leg)[0];
            if (leg + sub < bl) { bl = leg + sub; bj = j; }
        }
        const r = [bl, bj];
        memo.set(key, r);
        return r;
    }
    tourPly() {
        return (((this.tour.firstMover + this.movesDone) % 4) + 4) % 4;
    }
    /*
    * Position-aware next-stop choice: evaluate every unvisited stop from the
    * ACTUAL board position (not from the last stop), then add the DP value of
    * the remaining tour. Without this, the stop choice oscillates every move
    * once the turn drifts mid-leg, and hints zigzag forever.
    */
    tourNextTargetIdx() {
        const T = TOURS[this.tour.cornerId];
        const pos = this.positions();
        const ply = this.game.pawnIndexOfTurn;
        const cacheKey = pos.join(",") + ":" + ply;
        if (this._tourTargetCache && this._tourTargetCache.key === cacheKey) {
            return this._tourTargetCache.idx;
        }
        let bestIdx = -1, bestTotal = Infinity;
        for (let j = 0; j < 6; j++) {
            if (this.tour.visitedMask & (1 << j)) continue;
            const sol = cpSolve(pos, ply, T.arrangements[j], this.puzzle.region);
            if (!sol) continue;
            const rest = this.tourDP(this.tour.visitedMask | (1 << j), j, ply + sol.length)[0];
            if (sol.length + rest < bestTotal) { bestTotal = sol.length + rest; bestIdx = j; }
        }
        this._tourTargetCache = { key: cacheKey, idx: bestIdx, total: bestTotal };
        return bestIdx;
    }
    tourNextTarget() {
        const j = this.tourNextTargetIdx();
        return j < 0 ? null : TOURS[this.tour.cornerId].arrangements[j];
    }
    startTour(explicitIdx) {
        if (this.puzzle === null || this.playingBack) return;
        const cornerId = this.puzzle.corner;
        const T = TOURS[cornerId];
        let startIdx = explicitIdx !== undefined ? explicitIdx
            : T.arrangements.findIndex(a => a.join(",") === this.puzzle.start.join(","));
        if (!(startIdx >= 0 && startIdx < 6)) return;
        this.stopStreak();
        this.stopPlayback();
        this._tourMemo = new Map();
        this._tourTargetCache = null;
        this.tour = {
            cornerId: cornerId,
            startIdx: startIdx,
            firstMover: T.movers[startIdx],
            par: T.par[startIdx],
            visitedMask: 1 << startIdx,
            lastIdx: startIdx,
            boundaries: [],
            visitedOrder: [startIdx]
        };
        this.game = new Game();
        for (let i = 0; i < 4; i++) {
            this.game.board.pawns[i].position.row = Math.floor(T.arrangements[startIdx][i] / 9);
            this.game.board.pawns[i].position.col = T.arrangements[startIdx][i] % 9;
        }
        this.game.turn = this.tour.firstMover;
        this.history = [];
        this.movesDone = 0;
        this.hintsUsed = 0;
        this.solved = false;
        this.phase = 1;
        this.moveLog = [];
        this.view.clearHint();
        this.view.showHintText("");
        this.view.removeWinBox();
        this.view.loadTour(this.tour, T);
        this.view.render();
        if (this.view) this.view.updateModeButton(); // ADDED
    }
    exitTour() {
        if (this.tour === null) return;
        this.tour = null;
        this._tourMemo = null;
        this.view.restoreTargetArea();
        if (this.puzzle !== null) {
            this._tourLoading = true;
            this.loadPuzzle(this.puzzle.id);
            this._tourLoading = false;
        }
        if (this.view) this.view.updateModeButton(); // ADDED
    }

    randomPuzzle() {
        const pool = PUZZLES.filter(p => !p.featured);
        const pz = pool[Math.floor(Math.random() * pool.length)];
        this.loadPuzzle(pz.id);
    }
    startStreak(mode) {
        this.stopStreakTimer();
        this.streak = { mode: mode, tier: mode === 'steep' ? 0 : (mode === 'medium' ? 1 : (mode === 'hard' ? 2 : 0)), count: 0 };
        this.view.closeStreakDialog();
        this.view.updateStreakUI();
        if (this.view) this.view.updateModeButton(); // ADDED
        this.streakLoadNext();
    }
    stopStreak() {
        this.stopStreakTimer();
        if (this.streak !== null) {
            this.streak = null;
            this.view.updateStreakUI();
            if (this.view) this.view.updateModeButton(); // ADDED
        }
    }
    stopStreakTimer() {
        if (this.streakTimer !== null) {
            clearTimeout(this.streakTimer);
            this.streakTimer = null;
        }
    }
    streakLoadNext() {
        if (this.streak === null) return;
        const pool = this.tierPool(this.streak.tier);
        if (pool.length === 0) return;
        let pz = pool[Math.floor(Math.random() * pool.length)];
        if (pool.length > 1 && this.puzzle && pz.id === this.puzzle.id) {
            pz = pool[(pool.indexOf(pz) + 1) % pool.length];
        }
        this._streakLoading = true;
        this.loadPuzzle(pz.id);
        this._streakLoading = false;
    }
    streakAfterWin() {
        if (this.streak === null) return;
        this.streak.count++;
        const nearPar = this.movesDone <= (this.roundTrip ? this.totalPar() + 2 : this.puzzle.par + 2);
        if (this.streak.mode === 'steep') {
            this.streak.tier = nearPar ? Math.min(2, this.streak.tier + 1) : 0;
        }
        try {
            const key = 'cp_best_streak_' + this.streak.mode;
            const best = parseInt(localStorage.getItem(key) || '0', 10);
            if (this.streak.count > best) localStorage.setItem(key, String(this.streak.count));
        } catch (e) { /* storage unavailable */ }
        this.view.updateStreakUI();
        this.view.showHintText('streak ' + this.streak.count + ' - next puzzle coming...');
        this.streakTimer = setTimeout(() => this.streakLoadNext(), 2400);
    }

    loadPuzzle(id) {
        const pz = PUZZLES.find(p => p.id === id);
        if (!pz) return;
        if (!this._streakLoading) {
            this.stopStreak();
        }
        if (!this._tourLoading && this.tour !== null) {
            this.tour = null;
            this._tourMemo = null;
            this.view.restoreTargetArea();
        }
        this.puzzle = pz;
        this.view.syncSelector(id);
        this.setNewHintWorker();
        this.game = new Game();
        for (let i = 0; i < 4; i++) {
            this.game.board.pawns[i].position.row = Math.floor(pz.start[i] / 9);
            this.game.board.pawns[i].position.col = pz.start[i] % 9;
        }
        this.game.turn = pz.firstMoverIndex;   // turn setter invalidates caches
        this.history = [];
        this.movesDone = 0;
        this.hintsUsed = 0;
        this.solved = false;
        this.phase = 1;
        this.leg1Moves = 0;
        this.legPar2 = null;
        if (this.roundTrip) {
            const sol2 = cpSolve(pz.target, (pz.firstMoverIndex + pz.par) % 4, pz.start, pz.region);
            this.legPar2 = sol2 ? sol2.length : 0;
        }
        this.stopPlayback();
        this.moveLog = [];
        this.view.loadPuzzle(pz);
        if (this.view) this.view.updateModeButton(); // ADDED to sync state on new load
    }

    setNewHintWorker() {
        if (this.hintWorker !== null) {
            this.hintWorker.terminate();
        }
        this.hintSerial++;
        this.hintWorker = new Worker('js/hint_worker.js');
        this.hintWorker.onmessage = function (event) {
            const d = event.data;
            if (this.playingBack) { this.view.hintThinking(false); return; }
            if (d && d.type === "hint") {
                this.view.hintThinking(false);
                if (d.moves && d.moves.length > 0) {
                    this.hintsUsed++;
                    if (this.tour !== null && this._tourTargetCache) {
                        this.view.showHint(d.moves[0], this._tourTargetCache.total);
                    } else if (this.roundTrip && this.phase === 1) {
                        const mv = d.moves[0];
                        this.view.showHint(mv, d.moves.length);
                        this.view.showHintText(PAWN_COLOR_NAMES[mv.pi] + " -> (" + Math.floor(mv.dest / 9) + "," + mv.dest % 9 + ") (" + mv.kind + ") - " +
                            d.moves.length + " to the target, then " + this.legPar2 + " back (round trip)");
                    } else if (this.roundTrip && this.phase === 2) {
                        this.view.showHint(d.moves[0], d.moves.length);
                        this.view.showHintText(PAWN_COLOR_NAMES[mv.pi] + " -> (" + Math.floor(mv.dest / 9) + "," + mv.dest % 9 + ") (" + mv.kind + ") - " +
                            d.moves.length + " to finish the return leg");
                    } else {
                        this.view.showHint(d.moves[0], d.moves.length);
                    }
                    this.view.updateStats();
                } else {
                    this.view.showHintText("No solution from here - try undo.");
                }
            }
        }.bind(this);
        this.hintWorker.onerror = function (error) {
            console.log('Hint worker error: ' + error.message);
            this.view.hintThinking(false);
        }.bind(this);
    }

    positions() {
        return this.game.board.pawns.map(p => p.position.row * 9 + p.position.col);
    }

    inRegion(row, col) {
        const rg = this.puzzle.region;
        return row >= rg.r0 && row <= rg.r1 && col >= rg.c0 && col <= rg.c1;
    }

    doMove(move) {
        if (this.game === null || this.solved || this.playingBack) return;
        const to = move[0];
        if (!to) return;                        // pawn moves only in the minigame
        const pawn = this.game.pawnOfTurn;
        if (!this.inRegion(to[0], to[1])) return;
        if (this.game.isGoalPositionFor(pawn, to[0], to[1])) return;   // puzzle rule: never land on own goal line
        const moverIndex = this.game.pawnIndexOfTurn;
        this.history.push({
            pos: this.positions(), turn: this.game.turn,
            phase: this.phase, legPar2: this.legPar2, leg1Moves: this.leg1Moves,
            tourMask: this.tour ? this.tour.visitedMask : null,
            tourLast: this.tour ? this.tour.lastIdx : null
        });
        if (this.game.doMove([to, null, null], true)) {
            this.movesDone++;
            this.moveLog.push({ pi: moverIndex, dest: to[0] * 9 + to[1] });
            this.view.clearHint();
            if (this.tour !== null) {
                const key = this.positions().join(",");
                const T = TOURS[this.tour.cornerId];
                const hit = T.arrangements.findIndex(a => a.join(",") === key);
                if (hit >= 0 && !(this.tour.visitedMask & (1 << hit))) {
                    this.tour.visitedMask |= (1 << hit);
                    this.tour.lastIdx = hit;
                    this.tour.boundaries.push(this.movesDone);
                    this.tour.visitedOrder.push(hit);
                    this._tourTargetCache = null;
                    this.view.updateTourProgress();
                    if (this.tour.visitedMask === 63) {
                        this.solved = true;
                        this.lastWin = { moves: this.movesDone, par: this.tour.par, hints: this.hintsUsed, tour: true };
                        this.view.render();
                        this.view.showWin(this.lastWin);
                    }
                }
                if (!this.solved) this.view.render();
                return;
            }
            if (this.positions().join(",") === this.currentTarget().join(",")) {
                if (this.roundTrip && this.phase === 1) {
                    // halfway: lock leg 1, flip the target, keep playing
                    this.phase = 2;
                    this.leg1Moves = this.movesDone;
                    const fromArrival = cpSolve(this.positions(), this.game.turn, this.puzzle.start, this.puzzle.region);
                    this.legPar2 = fromArrival ? fromArrival.length : 0;
                    this.view.showHalfway(this.leg1Moves, this.puzzle.par, this.legPar2);
                    this.view.render();
                } else {
                    this.solved = true;
                    this.lastWin = {
                        moves: this.movesDone,
                        par: this.roundTrip ? this.totalPar() : this.puzzle.par,
                        hints: this.hintsUsed,
                        roundTrip: this.roundTrip,
                        leg1: { moves: this.leg1Moves, par: this.puzzle.par },
                        leg2: this.roundTrip ? { moves: this.movesDone - this.leg1Moves, par: this.legPar2 } : null
                    };
                    this.view.render();
                    this.view.showWin(this.lastWin);
                    this.streakAfterWin();
                }
            } else {
                this.view.render();
            }
        } else {
            this.history.pop();
            this.view.printImpossibleMessage();
        }
    }

    undo() {
        if (this.history.length === 0 || this.playingBack) return;
        const snap = this.history.pop();
        this.phase = snap.phase;
        this.legPar2 = snap.legPar2;
        this.leg1Moves = snap.leg1Moves;
        if (this.tour !== null && snap.tourMask !== null) {
            this.tour.visitedMask = snap.tourMask;
            this.tour.lastIdx = snap.tourLast;
            this._tourTargetCache = null;
            const b = this.tour.boundaries;
            while (b.length > 0 && b[b.length - 1] > this.movesDone) b.pop();
            const vo = this.tour.visitedOrder;
            while (vo.length > 1 && vo.length - 1 > b.length) vo.pop();
            this.view.updateTourProgress();
        }
        this.game = new Game();
        for (let i = 0; i < 4; i++) {
            this.game.board.pawns[i].position.row = Math.floor(snap.pos[i] / 9);
            this.game.board.pawns[i].position.col = snap.pos[i] % 9;
        }
        this.game.turn = snap.turn;
        this.movesDone = Math.max(0, this.movesDone - 1);
        this.moveLog.pop();
        this.solved = false;
        this.view.clearHint();
        this.view.removeWinBox();
        this.view.render();
    }

    restart() {
        if (this.tour !== null) {
            this.startTour();
            return;
        }
        this.loadPuzzle(this.puzzle.id);
    }

    applyState(pos, turn) {
        this.game = new Game();
        for (let i = 0; i < 4; i++) {
            this.game.board.pawns[i].position.row = Math.floor(pos[i] / 9);
            this.game.board.pawns[i].position.col = pos[i] % 9;
        }
        this.game.turn = turn;
    }

    stopPlayback() {
        if (this.playbackTimer !== null) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
        if (this.playingBack) {
            this.playingBack = false;
            this.view.setPlaybackUI(false);
        }
    }

    startPlayback(moves, label, legBoundary, legsPlan) {
        if (this.game === null || moves === null || moves.length === 0) return;
        this.stopPlayback();
        this.view.removeWinBox();
        this.view.clearHint();
        this.view.showHintText("playback: " + label);
        this.playingBack = true;
        this.view.setPlaybackUI(true);
        if (legsPlan && legsPlan.length > 0) {
            const l0 = legsPlan[0];
            if (l0.initialMask !== undefined) {
                this.view.setTourPlaybackHighlight(l0.initialMask, l0.targetIdx, l0.caption);
            } else if (l0.fromTarget) {
                this.view.setPlaybackTargetGrid(l0.fromTarget, l0.caption);
            }
        } else if (legBoundary) {
            this.view.setPlaybackLeg(1);
        }
        this.applyState(this.puzzle.start, this.puzzle.firstMoverIndex);
        this.view.render();
        const self = this;
        let i = 0;
        const step = function () {
            if (!self.playingBack) return;
            const mv = moves[i];
            self.game.doMove([[Math.floor(mv.dest / 9), mv.dest % 9], null, null], true);
            self.view.render();
            self.view.highlightPawn(mv.pi);
            self.view.showHintText("playback " + (i + 1) + "/" + moves.length + ": " +
                PAWN_COLOR_NAMES[mv.pi] + " -> (" + Math.floor(mv.dest / 9) + "," + mv.dest % 9 + ")");
            i++;
            if (legBoundary && i === legBoundary && i < moves.length) {
                self.view.setPlaybackLeg(2);
                self.view.showHintText("playback halfway - now back! " + i + "/" + moves.length);
            }
            if (legsPlan) {
                for (const leg of legsPlan) {
                    if (i === leg.atMove && i < moves.length) {
                        if (leg.mask !== undefined && leg.targetIdx !== undefined) {
                            self.view.setTourPlaybackHighlight(leg.mask, leg.targetIdx, leg.caption);
                        } else if (leg.target) {
                            self.view.setPlaybackTargetGrid(leg.target, leg.caption);
                        }
                        self.view.showHintText("playback " + leg.caption + " - " + i + "/" + moves.length);
                    }
                }
            }
            if (i < moves.length) {
                self.playbackTimer = setTimeout(step, 950);
            } else {
                self.playbackTimer = setTimeout(function () {
                        self.playingBack = false;
                    self.view.setPlaybackUI(false);
                    self.view.setPlaybackLeg(null);
                    if (self.tour !== null) self.view.loadTour(self.tour, TOURS[self.tour.cornerId]);
                    self.view.updateTourProgress();
                    self.view.render();
                    if (self.lastWin) {
                        self.view.showWin(self.lastWin);
                    }
                }, 1200);
            }
        };
        self.playbackTimer = setTimeout(step, 800);
    }

    playbackMine() {
        if (this.tour !== null && this.lastWin && this.lastWin.tour) {
            const T = TOURS[this.tour.cornerId];
            const ord = this.tour.visitedOrder.slice();   // the player's actual path
            let mask = 1 << ord[0];
            const legs = [{ atMove: 0, initialMask: mask, targetIdx: ord.length > 1 ? ord[1] : null, caption: "heading to stop 2/6" }];
            for (let k = 1; k < ord.length; k++) {
                mask |= (1 << ord[k]);
                legs.push({
                    atMove: this.tour.boundaries[k - 1],
                    mask: mask,
                    targetIdx: (k + 1 < ord.length) ? ord[k + 1] : null,
                    caption: "stop " + (k + 1) + "/6 visited"
                });
            }
            this.startPlayback(this.moveLog, "your tour", null, legs);
            return;
        }
        const boundary = (this.lastWin && this.lastWin.roundTrip) ? this.leg1Moves : null;
        this.startPlayback(this.moveLog, "your solution", boundary, boundary ? [
            { atMove: boundary, target: this.puzzle.start, caption: "leg 2 of 2" },
            { atMove: 0, fromTarget: this.puzzle.target, caption: "leg 1 of 2" }
        ] : null);
    }

    tourOrderVisited(k) {
        // k-th stop actually visited in this tour (reconstructed from boundaries via replay not needed:
        // store visited order while playing)
        return this.tour.visitedOrder ? this.tour.visitedOrder[k] : this.tour.lastIdx;
    }
    playbackOptimal() {
        if (this.tour !== null && this.lastWin && this.lastWin.tour) {
            const T = TOURS[this.tour.cornerId];
            const order = T.order[this.tour.startIdx];
            const moves = [];
            let mask = 1 << order[0];
            const legs = [{ atMove: 0, initialMask: mask, targetIdx: order[1], caption: "heading to stop 2/6" }];
            let ply = this.tour.firstMover;
            for (let k = 1; k < 6; k++) {
                const sol = cpSolve(T.arrangements[order[k - 1]], ply, T.arrangements[order[k]], this.puzzle.region);
                if (!sol) break;
                for (const mv of sol) moves.push(mv);
                ply = (ply + sol.length) % 4;
                mask |= (1 << order[k]);
                legs.push({ atMove: moves.length, mask: mask, targetIdx: (k + 1 < 6) ? order[k + 1] : null, caption: "stop " + (k + 1) + "/6 visited" });
            }
            this.startPlayback(moves, "optimal tour", null, legs);
            return;
        }
        const sol1 = cpSolve(this.puzzle.start, this.puzzle.firstMoverIndex, this.puzzle.target, this.puzzle.region);
        if (!this.roundTrip) {
            this.startPlayback(sol1, "optimal solution");
            return;
        }
        const sol2 = cpSolve(this.puzzle.target, (this.puzzle.firstMoverIndex + sol1.length) % 4, this.puzzle.start, this.puzzle.region);
        this.startPlayback(sol2 ? sol1.concat(sol2) : sol1, "optimal round trip", sol2 ? sol1.length : null);
    }

    requestHint() {
        if (this.game === null || this.solved || this.playingBack) return;
        this.setNewHintWorker();    // fresh worker = cancel any in-flight hint
        this.view.hintThinking(true);
        this.hintWorker.postMessage({
            pos: this.positions(),
            turn: this.game.turn,
            target: this.currentTarget(),
            region: this.puzzle.region
        });
    }
}