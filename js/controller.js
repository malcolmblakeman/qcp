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
    }

    loadPuzzle(id) {
        const pz = PUZZLES.find(p => p.id === id);
        if (!pz) return;
        this.puzzle = pz;
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
        this.view.loadPuzzle(pz);
    }

    setNewHintWorker() {
        if (this.hintWorker !== null) {
            this.hintWorker.terminate();
        }
        this.hintSerial++;
        this.hintWorker = new Worker('js/hint_worker.js');
        this.hintWorker.onmessage = function (event) {
            const d = event.data;
            if (d && d.type === "hint") {
                this.view.hintThinking(false);
                if (d.moves && d.moves.length > 0) {
                    this.hintsUsed++;
                    this.view.showHint(d.moves[0], d.moves.length);
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
        if (this.game === null || this.solved) return;
        const to = move[0];
        if (!to) return;                        // pawn moves only in the minigame
        const pawn = this.game.pawnOfTurn;
        if (!this.inRegion(to[0], to[1])) return;
        if (this.game.isGoalPositionFor(pawn, to[0], to[1])) return;   // puzzle rule: never land on own goal line
        this.history.push({ pos: this.positions(), turn: this.game.turn });
        if (this.game.doMove([to, null, null], true)) {
            this.movesDone++;
            this.view.clearHint();
            if (this.positions().join(",") === this.puzzle.target.join(",")) {
                this.solved = true;
                this.view.render();
                this.view.showWin(this.movesDone, this.puzzle.par, this.hintsUsed);
            } else {
                this.view.render();
            }
        } else {
            this.history.pop();
            this.view.printImpossibleMessage();
        }
    }

    undo() {
        if (this.history.length === 0) return;
        const snap = this.history.pop();
        this.game = new Game();
        for (let i = 0; i < 4; i++) {
            this.game.board.pawns[i].position.row = Math.floor(snap.pos[i] / 9);
            this.game.board.pawns[i].position.col = snap.pos[i] % 9;
        }
        this.game.turn = snap.turn;
        this.movesDone = Math.max(0, this.movesDone - 1);
        this.solved = false;
        this.view.clearHint();
        this.view.removeWinBox();
        this.view.render();
    }

    restart() {
        this.loadPuzzle(this.puzzle.id);
    }

    requestHint() {
        if (this.game === null || this.solved) return;
        this.setNewHintWorker();    // fresh worker = cancel any in-flight hint
        this.view.hintThinking(true);
        this.hintWorker.postMessage({
            pos: this.positions(),
            turn: this.game.turn,
            target: this.puzzle.target,
            region: this.puzzle.region
        });
    }
}
