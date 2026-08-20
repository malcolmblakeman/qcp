"use strict";

/*
* View for the corner-puzzle minigame - same visual language as the main game
* (board table, pawn shadows, fade boxes, buttons), minus walls/AI/eval,
* plus: puzzle selector header, target diagram, move stats, hint highlight.
*/
class MinigameView {
    constructor(controller) {
        this.controller = controller;
        this.isHoverPossible = true;

        this.htmlBoardTable = document.getElementById("board_table");
        this._buildBoardTable();
        this.htmlPawns = [];
        for (let i = 0; i < 4; i++) {
            this.htmlPawns.push(document.getElementById("pawn" + i));
        }
        this.htmlMessageBox = document.getElementById("message_box");
        this.htmlAboutBox = document.getElementById("about_box");
        this.htmlHintText = document.getElementById("hint_text");

        // puzzle selector (below the title)
        this.htmlSelect = document.getElementById("puzzle_select");
        for (const pz of PUZZLES) {
            const opt = document.createElement("option");
            opt.value = pz.id;
            opt.textContent = pz.label;
            this.htmlSelect.appendChild(opt);
        }
        this.htmlSelect.onchange = function (e) {
            this.controller.loadPuzzle(e.target.value);
        }.bind(this);

        // target diagram
        this.htmlTargetGrid = document.getElementById("target_grid");

        // buttons
        this.button = {
            restart: document.getElementById("restart_button"),
            undo: document.getElementById("undo_button"),
            hint: document.getElementById("hint_button"),
            confirm: document.getElementById("confirm_button"),
            cancel: document.getElementById("cancel_button")
        };
        this.button.undo.disabled = true;
        this.button.restart.onclick = function () { this.controller.restart(); }.bind(this);
        this.button.undo.onclick = function () { this.controller.undo(); }.bind(this);
        this.button.hint.onclick = function () { this.controller.requestHint(); }.bind(this);

        const aboutButton = document.getElementById("about_button");
        aboutButton.onclick = function () {
            this.htmlAboutBox.classList.toggle("hidden");
        }.bind(this);
        document.getElementById("about_close_button").onclick = function () {
            this.htmlAboutBox.classList.add("hidden");
        }.bind(this);

        const style = window.getComputedStyle(this.button.confirm);
        this.isHoverPossible = (style.display === "none");
        if (!this.isHoverPossible) {
            this.setUIForTouchDevice();
        }
    }

    _buildBoardTable() {
        const table = this.htmlBoardTable;
        for (let r = 0; r < 17; r++) {
            const tr = document.createElement("tr");
            tr.className = (r % 2 === 0) ? "row row" + (r / 2) : "between_rows row" + ((r - 1) / 2);
            for (let c = 0; c < 17; c++) {
                const td = document.createElement("td");
                td.className = (c % 2 === 0) ? "col col" + (c / 2) : "between_cols col" + ((c - 1) / 2);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        for (let i = 0; i < 4; i++) {
            const pawnDiv = document.createElement("div");
            pawnDiv.id = "pawn" + i;
            pawnDiv.className = "pawn pawn" + i;
            table.rows[0].cells[i * 2].appendChild(pawnDiv);   // parked; repositioned on load
        }
    }

    setUIForTouchDevice() {
        const onclickConfirm = function (e) {
            this.button.confirm.disabled = true;
            this.button.cancel.disabled = true;
            const clicked = document.getElementsByClassName("pawn clicked");
            if (clicked.length > 0) {
                const el = clicked[0];
                const row = el.parentElement.parentElement.rowIndex / 2;
                const col = el.parentElement.cellIndex / 2;
                MinigameView.cancelPawnClick();
                this.controller.doMove([[row, col], null, null]);
            }
        };
        const onclickCancel = function (e) {
            this.button.confirm.disabled = true;
            this.button.cancel.disabled = true;
            MinigameView.cancelPawnClick();
        };
        this.button.confirm.onclick = onclickConfirm.bind(this);
        this.button.cancel.onclick = onclickCancel.bind(this);
    }

    /* ---- puzzle lifecycle ---- */

    loadPuzzle(pz) {
        // region shading
        const rg = pz.region;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const td = this.htmlBoardTable.rows[r * 2].cells[c * 2];
                if (r >= rg.r0 && r <= rg.r1 && c >= rg.c0 && c <= rg.c1) {
                    td.classList.remove("outside_region");
                } else {
                    td.classList.add("outside_region");
                }
            }
        }
        // block frame
        document.querySelectorAll(".block_frame").forEach(el => el.remove());
        const cells = pz.target.map(p => [Math.floor(p / 9), p % 9]);
        const rMin = Math.min(...cells.map(x => x[0]));
        const rMax = Math.max(...cells.map(x => x[0]));
        const cMin = Math.min(...cells.map(x => x[1]));
        const cMax = Math.max(...cells.map(x => x[1]));
        for (const [r, c] of cells) {
            this.htmlBoardTable.rows[r * 2].cells[c * 2].classList.add("block_cell");
        }
        // remove old block_cell classes first
        document.querySelectorAll(".block_cell").forEach(el => el.classList.remove("block_cell"));
        for (const [r, c] of cells) {
            this.htmlBoardTable.rows[r * 2].cells[c * 2].classList.add("block_cell");
        }
        this._renderTargetGrid(pz);
        document.getElementById("stat_par").textContent = pz.par;
        this.removeWinBox();
        this.clearHint();
        this.showHintText("");
        this.render();
    }

    _renderTargetGrid(pz) {
        const grid = this.htmlTargetGrid;
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        const cells = pz.target.map(p => [Math.floor(p / 9), p % 9]);
        const rMin = Math.min(...cells.map(x => x[0]));
        const cMin = Math.min(...cells.map(x => x[1]));
        for (let r = 0; r < 2; r++) {
            const rowDiv = document.createElement("div");
            rowDiv.className = "target_row";
            for (let c = 0; c < 2; c++) {
                const cellDiv = document.createElement("div");
                cellDiv.className = "target_cell";
                const wantR = rMin + r, wantC = cMin + c;
                const pi = pz.target.findIndex(p => Math.floor(p / 9) === wantR && p % 9 === wantC);
                if (pi >= 0) {
                    const pawnDiv = document.createElement("div");
                    pawnDiv.className = "pawn pawn" + pi;
                    cellDiv.appendChild(pawnDiv);
                }
                rowDiv.appendChild(cellDiv);
            }
            grid.appendChild(rowDiv);
        }
    }

    /* ---- rendering ---- */

    render() {
        // remove previous move hints / handlers
        for (let i = 0; i < this.htmlBoardTable.rows.length; i++) {
            for (let j = 0; j < this.htmlBoardTable.rows[0].cells.length; j++) {
                const element = this.htmlBoardTable.rows[i].cells[j];
                element.onclick = null;
            }
        }
        const shadows = document.getElementsByClassName("pawn shadow");
        while (shadows.length !== 0) shadows[0].remove();

        const g = this.controller.game;
        const pz = this.controller.puzzle;
        // pawns
        for (let i = 0; i < 4; i++) {
            const pawn = g.board.pawns[i];
            this.htmlBoardTable.rows[pawn.position.row * 2].cells[pawn.position.col * 2].appendChild(this.htmlPawns[i]);
        }
        // stats
        document.getElementById("stat_moves").textContent = this.controller.movesDone;
        document.getElementById("stat_hints").textContent = this.controller.hintsUsed;
        this.button.undo.disabled = this.controller.history.length === 0;

        if (this.controller.solved) {
            this.printMessage("Solved!");
        } else {
            const pi = g.pawnIndexOfTurn;
            this.printMessage(PAWN_COLOR_NAMES[pi] + "'s turn");
            this._renderValidMoves(g, pz);
        }
    }

    _renderValidMoves(g, pz) {
        let onclick;
        if (this.isHoverPossible) {
            onclick = function (e) {
                const x = e.target;
                const row = x.parentElement.parentElement.rowIndex / 2;
                const col = x.parentElement.cellIndex / 2;
                this.controller.doMove([[row, col], null, null]);
            };
        } else {
            onclick = function (e) {
                MinigameView.cancelPawnClick();
                const x = e.target;
                const all = document.getElementsByClassName("pawn shadow");
                for (let i = 0; i < all.length; i++) if (all[i] !== x) all[i].classList.add("hidden");
                x.classList.add("clicked");
                this.button.confirm.disabled = false;
                this.button.cancel.disabled = false;
            };
        }
        const mover = g.pawnOfTurn;
        const rg = pz.region;
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (g.validNextPositions[i][j] !== true) continue;
                if (!(i >= rg.r0 && i <= rg.r1 && j >= rg.c0 && j <= rg.c1)) continue;   // stay in region
                if (g.isGoalPositionFor(mover, i, j)) continue;                          // puzzle rule
                const element = this.htmlBoardTable.rows[i * 2].cells[j * 2];
                const shadow = document.createElement("div");
                shadow.className = "pawn pawn" + g.pawnIndexOfTurn + " shadow";
                element.appendChild(shadow);
                shadow.onclick = onclick.bind(this);
            }
        }
    }

    updateStats() {
        document.getElementById("stat_moves").textContent = this.controller.movesDone;
        document.getElementById("stat_hints").textContent = this.controller.hintsUsed;
        this.button.undo.disabled = this.controller.history.length === 0;
    }

    printMessage(message) {
        let textNode;
        for (let i = 0; i < this.htmlMessageBox.childNodes.length; i++) {
            if (this.htmlMessageBox.childNodes[i].nodeType === Node.TEXT_NODE) {
                textNode = this.htmlMessageBox.childNodes[i];
                break;
            }
        }
        if (textNode !== undefined) textNode.nodeValue = message;
    }

    printImpossibleMessage() {
        this.showHintText("That move is not allowed in this puzzle.");
    }

    /* ---- hints ---- */

    hintThinking(on) {
        this.button.hint.disabled = on;
        if (on) this.showHintText("thinking...");
    }

    showHint(move, remaining) {
        this.clearHint();
        const r = Math.floor(move.dest / 9), c = move.dest % 9;
        const cell = this.htmlBoardTable.rows[r * 2].cells[c * 2];
        const marker = document.createElement("div");
        marker.className = "hint_marker";
        marker.textContent = "?";
        cell.appendChild(marker);
        const pawnEl = this.htmlPawns[move.pi];
        pawnEl.classList.add("hint_source");
        this.showHintText(PAWN_COLOR_NAMES[move.pi] + " -> (" + r + "," + c + ") (" + move.kind + ")" +
            (remaining ? " - " + remaining + " moves left from here" : ""));
    }

    showHintText(t) {
        this.htmlHintText.textContent = t;
    }

    clearHint() {
        document.querySelectorAll(".hint_marker").forEach(el => el.remove());
        this.htmlPawns.forEach(el => el && el.classList.remove("hint_source"));
    }

    /* ---- win ---- */

    showWin(moves, par, hints) {
        this.removeWinBox();
        const stars = moves <= par ? 3 : (moves <= par + 2 ? 2 : 1);
        const box = document.createElement("div");
        box.className = "fade_box in";
        box.id = "win_box";
        box.innerHTML =
            "<div><h2>Solved! " + "\u2605".repeat(stars) + "\u2606".repeat(3 - stars) + "</h2>" +
            "<p>" + moves + " moves (par " + par + ") - " + hints + " hint" + (hints === 1 ? "" : "s") + " used</p>" +
            "<button type='button' id='win_close_button' class='close'>close</button></div>";
        document.getElementById("board_table_container").appendChild(box);
        document.getElementById("win_close_button").onclick = function () { box.remove(); }.bind(this);
    }

    removeWinBox() {
        const box = document.getElementById("win_box");
        if (box !== null) box.remove();
    }

    static cancelPawnClick() {
        const shadows = document.getElementsByClassName("pawn shadow");
        for (let i = 0; i < shadows.length; i++) {
            shadows[i].classList.remove("clicked");
            shadows[i].classList.remove("hidden");
        }
    }
}
