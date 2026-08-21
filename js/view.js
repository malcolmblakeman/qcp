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
        this._buildSelector();
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
            random: document.getElementById("random_button"),
            streak: document.getElementById("streak_button"),
            mode: document.getElementById("mode_button"), // ADDED mode button
            confirm: document.getElementById("confirm_button"),
            cancel: document.getElementById("cancel_button")
        };
        this.button.undo.disabled = true;
        this.button.restart.onclick = function () { this.controller.restart(); }.bind(this);
        this.button.undo.onclick = function () { this.controller.undo(); }.bind(this);
        this.button.hint.onclick = function () { this.controller.requestHint(); }.bind(this);
        this.button.random.onclick = function () { this.controller.randomPuzzle(); }.bind(this);
        
        // ADDED: Wire up the mode button to cycle modes
        if (this.button.mode) {
            this.button.mode.onclick = function () { this.controller.cycleMode(); }.bind(this);
        }

        // Keep hidden buttons referenced to avoid breaking older logic (if any)
        this.button.roundtrip = document.getElementById("roundtrip_button");
        this.button.tour = document.getElementById("tour_button");
        if (this.button.tour !== null) {
            this.button.tour.onclick = function () {
                if (this.controller.tour !== null) { this.controller.exitTour(); return; }
                this.controller.startTour();
            }.bind(this);
        }
        if (this.button.roundtrip !== null) {
            this.button.roundtrip.onclick = function () { this.controller.toggleRoundTrip(); }.bind(this);
        }
        
        this.button.streak.onclick = function () { this.toggleStreakDialog(); }.bind(this);
        this.htmlStreakDialog = document.getElementById("streak_dialog");
        document.getElementById("streak_cancel_button").onclick = function () { this.closeStreakDialog(); }.bind(this);
        for (const mode of ["easy", "medium", "hard", "steep"]) {
            const b = document.getElementById("streak_" + mode + "_button");
            if (b !== null) b.onclick = function () { this.controller.startStreak(mode); }.bind(this);
        }

        const aboutButton = document.getElementById("about_button");
        aboutButton.onclick = function () {
            // Close streak dialog if it's open so they don't overlap
            this.htmlStreakDialog.classList.add("hidden");
            // Toggle about box
            this.htmlAboutBox.classList.toggle("hidden");
        }.bind(this);
        
        // Click outside the About box to close it
        this.htmlAboutBox.addEventListener('click', function(e) {
            if (e.target === this.htmlAboutBox) {
                this.htmlAboutBox.classList.add("hidden");
            }
        }.bind(this));

        // Click outside the Streak dialog to close it
        this.htmlStreakDialog.addEventListener('click', function(e) {
            if (e.target === this.htmlStreakDialog) {
                this.closeStreakDialog();
            }
        }.bind(this));

        // Click outside the Streak dialog to close it
        this.htmlStreakDialog.addEventListener('click', function(e) {
            if (e.target === this.htmlStreakDialog) {
                this.closeStreakDialog();
            }
        }.bind(this));

        // ADDED THIS BACK: Close button listener for About box
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

    _buildSelector() {
        const sel = this.htmlSelect;
        while (sel.firstChild) sel.removeChild(sel.firstChild);
        const groups = [];
        const featured = PUZZLES.filter(p => p.featured);
        const g0 = document.createElement("optgroup");
        g0.label = "featured";
        for (const pz of featured) {
            const opt = document.createElement("option");
            opt.value = pz.id;
            opt.textContent = pz.label;
            g0.appendChild(opt);
        }
        groups.push(g0);
        for (const cid of ["SW", "SE", "NW", "NE"]) {
            const g = document.createElement("optgroup");
            g.label = cid + " ladder";
            for (const pz of PUZZLES.filter(p => !p.featured && p.corner === cid).sort((a, b) => a.par - b.par)) {
                const opt = document.createElement("option");
                opt.value = pz.id;
                opt.textContent = pz.label;
                g.appendChild(opt);
            }
            groups.push(g);
        }
        groups.forEach(g => sel.appendChild(g));
    }

    syncSelector(id) {
        if (this.htmlSelect.value !== id) {
            const opt = this.htmlSelect.querySelector('option[value="' + id + '"]');
            if (opt !== null) this.htmlSelect.value = id;
        }
    }

    toggleStreakDialog() {
        if (this.controller.streak !== null) {
            this.controller.stopStreak();
            return;
        }
        // Close about box if it's open so they don't overlap
        this.htmlAboutBox.classList.add("hidden");
        
        if (this.htmlStreakDialog.classList.contains("hidden")) {
            this.htmlStreakDialog.classList.remove("hidden");
            const bestFor = (m) => {
                try { return localStorage.getItem("cp_best_streak_" + m) || "0"; } catch (e) { return "0"; }
            };
            document.getElementById("streak_best").textContent =
                "best streaks - easy " + bestFor("easy") + " / medium " + bestFor("medium") +
                " / hard " + bestFor("hard") + " / steep " + bestFor("steep");
        } else {
            this.htmlStreakDialog.classList.add("hidden");
        }
    }

    closeStreakDialog() {
        if (this.htmlStreakDialog !== null) this.htmlStreakDialog.classList.add("hidden");
    }

    updateStreakUI() {
        const el = document.getElementById("stat_streak");
        const st = this.controller.streak;
        if (el !== null) el.textContent = st ? ("\uD83D\uDD25 " + st.count) : "\u2014";
        if (this.button.streak !== null) {
            // Keep it as an emoji permanently
            this.button.streak.textContent = "🔥";
        }
        if (st !== null && this.htmlStreakDialog !== null) {
            this.closeStreakDialog();
        }
        this.updateModeButton(); // Ensure mode button updates when streak state changes
    }

    // ADDED: Method to sync the emoji and tooltip for the mode button
    updateModeButton() {
        if (!this.button.mode) return;
        const st = this.controller.streak;
        if (st !== null) {
            if (st.mode === 'easy') this.button.mode.textContent = "🟢";
            else if (st.mode === 'medium') this.button.mode.textContent = "🟡";
            else if (st.mode === 'hard') this.button.mode.textContent = "🔴";
            else if (st.mode === 'steep') this.button.mode.textContent = "📈";
            this.button.mode.title = "Streak: " + st.mode + " (click to cycle difficulty)";
        } else if (this.controller.tour !== null) {
            this.button.mode.textContent = "🗺️";
            this.button.mode.title = "Tour mode (click to cycle back to normal)";
        } else if (this.controller.roundTrip) {
            this.button.mode.textContent = "↔️";
            this.button.mode.title = "Round trip mode (click to cycle to tour)";
        } else {
            this.button.mode.textContent = "📍";
            this.button.mode.title = "Normal mode (click to cycle to round trip)";
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
        this._renderTargetGrid(pz, this.controller.currentTarget ? this.controller.currentTarget() : pz.target);
        const cap = document.querySelector(".target_caption");
        if (cap !== null) {
            cap.textContent = this.controller.roundTrip
                ? "target \u00b7 leg 1 of 2"
                : "target";
        }
        document.getElementById("stat_par").textContent = this.controller.roundTrip
            ? pz.par + "+" + this.controller.legPar2
            : String(pz.par);
        if (this.button.roundtrip !== null) {
            this.button.roundtrip.classList.toggle("active", this.controller.roundTrip);
        }
        this.removeWinBox();
        this.clearHint();
        this.showHintText("");
        this.render();
        this.updateModeButton(); // ADDED to sync state on new puzzle load
    }

    _renderTargetGrid(pz, targetPos) {
        const grid = this.htmlTargetGrid;
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        const cells = targetPos.map(p => [Math.floor(p / 9), p % 9]);
        const rMin = Math.min(...cells.map(x => x[0]));
        const cMin = Math.min(...cells.map(x => x[1]));
        for (let r = 0; r < 2; r++) {
            const rowDiv = document.createElement("div");
            rowDiv.className = "target_row";
            for (let c = 0; c < 2; c++) {
                const cellDiv = document.createElement("div");
                cellDiv.className = "target_cell";
                const wantR = rMin + r, wantC = cMin + c;
                const pi = targetPos.findIndex(p => Math.floor(p / 9) === wantR && p % 9 === wantC);
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
        if (this.button.tour !== null) {
            this.button.tour.textContent = this.controller.tour !== null ? "stop tour" : "tour";
        }
        if (this.controller.tour !== null) {
            document.getElementById("stat_par").textContent = this.controller.tour.par;
        } else if (this.controller.roundTrip && !this.controller.playingBack) {
            this._renderTargetGrid(pz, this.controller.currentTarget());
            const cap = document.querySelector(".target_caption");
            if (cap !== null) cap.textContent = "target \u00b7 leg " + this.controller.phase + " of 2";
            document.getElementById("stat_par").textContent = pz.par + "+" + this.controller.legPar2;
        }
        this.button.undo.disabled = this.controller.history.length === 0 || this.controller.playingBack;

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
        this.button.undo.disabled = this.controller.history.length === 0 || this.controller.playingBack;
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

    /* ---- halfway banner (there and back) ---- */
    showHalfway(moves1, par1, par2) {
        const old = document.getElementById("halfway_box");
        if (old !== null) old.remove();
        const box = document.createElement("div");
        box.className = "fade_box in halfway_box";
        box.id = "halfway_box";
        box.innerHTML = "<div><h2>Halfway! \u21ba</h2>" +
            "<p>leg 1: " + moves1 + " moves (par " + par1 + ")</p>" +
            "<p><b>now solve it back</b> - par " + par2 + "</p></div>";
        document.getElementById("board_table_container").appendChild(box);
        setTimeout(function () {
            const b = document.getElementById("halfway_box");
            if (b !== null) b.remove();
        }, 2200);
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

    showWin(win) {
        this.removeWinBox();
        const moves = win.moves, par = win.par, hints = win.hints;
        const headline = win.tour ? "Grand tour complete!" : "Solved!";
        const stars = moves <= par ? 3 : (moves <= par + 2 ? 2 : 1);
        const legs = win.roundTrip
            ? "<p>leg 1: " + win.leg1.moves + "/" + win.leg1.par +
              " \u00b7 leg 2: " + win.leg2.moves + "/" + win.leg2.par + "</p>"
            : "";
        const box = document.createElement("div");
        box.className = "fade_box in";
        box.id = "win_box";
        box.innerHTML =
            "<div><h2>" + headline + " " + "\u2605".repeat(stars) + "\u2606".repeat(3 - stars) + "</h2>" +
            (win.tour ? "<p>all 6 arrangements visited</p>" : "") +
            legs +
            "<p>" + moves + " moves (par " + par + ") - " + hints + " hint" + (hints === 1 ? "" : "s") + " used</p>" +
            "<div class='win_buttons'>" +
            "<button type='button' id='win_replay_button' class='win_action'>watch my replay</button>" +
            "<button type='button' id='win_optimal_button' class='win_action'>optimal solution \u25B6</button>" +
            "</div>" +
            "<button type='button' id='win_close_button' class='close'>close</button></div>";
        document.getElementById("board_table_container").appendChild(box);
        document.getElementById("win_close_button").onclick = function () { box.remove(); }.bind(this);
        document.getElementById("win_replay_button").onclick = function () { this.controller.playbackMine(); }.bind(this);
        document.getElementById("win_optimal_button").onclick = function () { this.controller.playbackOptimal(); }.bind(this);
    }

    /* ---- grand tour panel ---- */
    loadTour(tour, T) {
        this.restoreTargetArea();
        const area = document.querySelector(".target_area");
        area.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.id = "tour_panel";
        const grid = document.createElement("div");
        grid.className = "tour_grid";
        for (let k = 0; k < 6; k++) {
            const mini = document.createElement("div");
            mini.className = "tour_mini";
            mini.id = "tour_mini_" + k;
            mini.title = "start the tour here";
            mini.onclick = function (e) {
                if (this.controller.playingBack) return;
                this.controller.startTour(k);
            }.bind(this);
            const cells = T.arrangements[k].map(p => [Math.floor(p / 9), p % 9]);
            const rMin = Math.min(...cells.map(x => x[0]));
            const cMin = Math.min(...cells.map(x => x[1]));
            for (let r = 0; r < 2; r++) {
                const rowDiv = document.createElement("div");
                rowDiv.className = "target_row";
                for (let c = 0; c < 2; c++) {
                    const cellDiv = document.createElement("div");
                    cellDiv.className = "target_cell";
                    const pi = T.arrangements[k].findIndex(p =>
                        Math.floor(p / 9) === rMin + r && p % 9 === cMin + c);
                    if (pi >= 0) {
                        const pawnDiv = document.createElement("div");
                        pawnDiv.className = "pawn pawn" + pi;
                        cellDiv.appendChild(pawnDiv);
                    }
                    rowDiv.appendChild(cellDiv);
                }
                mini.appendChild(rowDiv);
            }
            grid.appendChild(mini);
        }
        wrap.appendChild(grid);
        const cap = document.createElement("div");
        cap.className = "target_caption";
        cap.id = "tour_caption";
        wrap.appendChild(cap);
        area.appendChild(wrap);
        this.updateTourProgress();
    }

    /* one animated applier for the 6 minis: visited checkmarks pop, heading pulses */
    applyTourMiniStates(mask, headingIdx) {
        const prev = (this._tourPrevMask === undefined) ? mask : this._tourPrevMask;
        for (let k = 0; k < 6; k++) {
            const el = document.getElementById("tour_mini_" + k);
            if (el === null) continue;
            const visited = (mask & (1 << k)) !== 0;
            const justArrived = visited && !(prev & (1 << k));
            el.classList.toggle("visited", visited);
            el.classList.toggle("current", k === headingIdx && !visited);
            if (justArrived) {
                el.classList.remove("just_visited");
                void el.offsetWidth;   // restart the pop animation
                el.classList.add("just_visited");
                setTimeout(function () { el.classList.remove("just_visited"); }, 750);
            }
        }
        this._tourPrevMask = mask;
    }

    /* replay: highlight the stop the recorded path is heading to (not the solver's pick) */
    setTourPlaybackHighlight(mask, headingIdx, caption) {
        this.applyTourMiniStates(mask, headingIdx);
        const cap = document.getElementById("tour_caption");
        if (cap !== null) cap.textContent = caption ? ("replay \u00b7 " + caption) : "replay";
    }

    updateTourProgress() {
        const tour = this.controller.tour;
        if (tour === null) return;
        const T = TOURS[tour.cornerId];
        let count = 0;
        for (let k = 0; k < 6; k++) {
            if (tour.visitedMask & (1 << k)) count++;
        }
        let headingIdx = -1;
        const nextTarget = this.controller.tourNextTarget();
        if (nextTarget !== null) {
            headingIdx = T.arrangements.findIndex(a => a.join(",") === nextTarget.join(","));
        }
        this.applyTourMiniStates(tour.visitedMask, headingIdx);
        const cap = document.getElementById("tour_caption");
        if (cap !== null) cap.textContent = "grand tour \u00b7 " + count + "/6 \u00b7 par " + tour.par;
    }

    restoreTargetArea() {
        const area = document.querySelector(".target_area");
        if (area === null) return;
        const panel = document.getElementById("tour_panel");
        if (panel !== null) panel.remove();
        if (area.querySelector("#target_grid") === null) {
            const grid = document.createElement("div");
            grid.id = "target_grid";
            const cap = document.createElement("div");
            cap.className = "target_caption";
            area.appendChild(grid);
            area.appendChild(cap);
            this.htmlTargetGrid = grid;
        }
        if (this.controller.puzzle !== null && this.controller.tour === null) {
            this._renderTargetGrid(this.controller.puzzle, this.controller.currentTarget());
            const cap = document.querySelector(".target_caption");
            if (cap !== null) {
                cap.textContent = this.controller.roundTrip
                    ? "target \u00b7 leg " + this.controller.phase + " of 2"
                    : "target";
            }
        }
    }

    setPlaybackTargetGrid(targetPos, caption) {
        const pz = this.controller.puzzle;
        if (pz !== null && targetPos) this._renderTargetGrid(pz, targetPos);
        const cap = document.querySelector(".target_caption");
        if (cap !== null && caption) cap.textContent = caption;
    }

    setPlaybackLeg(n) {
        const pz = this.controller.puzzle;
        if (n === null) {
            this._renderTargetGrid(pz, this.controller.currentTarget());
            const cap = document.querySelector(".target_caption");
            if (cap !== null) cap.textContent = "target";
            return;
        }
        this._renderTargetGrid(pz, n === 2 ? pz.start : pz.target);
        const cap = document.querySelector(".target_caption");
        if (cap !== null) cap.textContent = "target \u00b7 leg " + n + " of 2";
    }

    setPlaybackUI(on) {
        this.button.undo.disabled = on || this.controller.history.length === 0;
        this.button.hint.disabled = on;
        this.button.restart.disabled = on;
        this.button.random.disabled = on;
        this.button.streak.disabled = on;
        if (this.button.mode) this.button.mode.disabled = on; // ADDED to lock during playback
        this.htmlSelect.disabled = on;
    }

    highlightPawn(pi) {
        this.clearHint();
        if (this.htmlPawns[pi]) {
            this.htmlPawns[pi].classList.add("hint_source");
        }
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
