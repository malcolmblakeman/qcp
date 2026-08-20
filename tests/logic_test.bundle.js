"use strict";

/*
* game.js  (4-player version)
*
* Model part in the MVC pattern.
*
* Ported to 4 players from the 2-player original by Kyutae Lee
* (https://github.com/gorisanson/quoridor-ai).
*
* Players (seats), turn order clockwise:
*   index 0: North -- starts at (row 0, col 4), goal: row 8 (bottom)
*   index 1: East  -- starts at (row 4, col 8), goal: col 0 (left)
*   index 2: South -- starts at (row 8, col 4), goal: row 0 (top)
*   index 3: West  -- starts at (row 4, col 0), goal: col 8 (right)
*
* Official 4-player rules: 5 walls per player, first pawn to reach
* the side directly opposite its start wins.
*
* Coordinate systems (same as the original):
*   PawnPosition: 9x9 (row 0..8, col 0..8)
*   Walls:        8x8 (row 0..7, col 0..7)
*   OpenWays upDown:    8x9 (row 0..7, col 0..8)
*   OpenWays leftRight: 9x8 (row 0..8, col 0..7)
*/

const MOVE_UP = [-1, 0];
const MOVE_DOWN = [1, 0];
const MOVE_LEFT = [0, -1];
const MOVE_RIGHT = [0, 1];

const NUM_OF_PLAYERS = 4;
const NUM_OF_WALLS_PER_PLAYER = 5;

const SEAT_NAMES = ["North", "East", "South", "West"];
const PAWN_COLOR_NAMES = ["Yellow", "Black", "Blue", "Green"];

// start positions, index === player index
const START_POSITIONS = [
    { row: 0, col: 4 },
    { row: 4, col: 8 },
    { row: 8, col: 4 },
    { row: 4, col: 0 }
];

// goal lines, exactly one of row/col is non-null
const GOALS = [
    { row: 8, col: null },
    { row: null, col: 0 },
    { row: 0, col: null },
    { row: null, col: 8 }
];

function create2DArrayInitializedTo(numOfRow, numOfCol, initialValue) {
    const arr2D = [];
    for (let i = 0; i < numOfRow; i++) {
        const row = [];
        for (let j = 0; j < numOfCol; j++) {
            row.push(initialValue);
        }
        arr2D.push(row);
    }
    return arr2D;
}

function set2DArrayEveryElementToValue(arr2D, value) {
    for (let i = 0; i < arr2D.length; i++) {
        for (let j = 0; j < arr2D[0].length; j++) {
            arr2D[i][j] = value;
        }
    }
}

function create2DArrayClonedFrom(arr2D) {
    const arr2DCloned = [];
    for (let i = 0; i < arr2D.length; i++) {
        arr2DCloned.push([...arr2D[i]]);
    }
    return arr2DCloned;
}

// dimension of arr2DA and arr2DB should be the same.
function logicalAndBetween2DArray(arr2DA, arr2DB) {
    const arr2D = [];
    for (let i = 0; i < arr2DA.length; i++) {
        const row = [];
        for (let j = 0; j < arr2DA[0].length; j++) {
            row.push(arr2DA[i][j] && arr2DB[i][j]);
        }
        arr2D.push(row);
    }
    return arr2D;
}

function indicesOfValueIn2DArray(arr2D, value) {
    const t = [];
    for (let i = 0; i < arr2D.length; i++) {
        for (let j = 0; j < arr2D[0].length; j++) {
            if (arr2D[i][j] === value) {
                t.push([i, j]);
            }
        }
    }
    return t;
}

function indicesOfMin(arr) {
    let min = Infinity;
    let indices = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] < min) {
            indices = [i];
            min = arr[i];
        } else if (arr[i] === min) {
            indices.push(i);
        }
    }
    return indices;
}

function indicesOfMax(arr) {
    let max = -Infinity;
    let indices = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > max) {
            indices = [i];
            max = arr[i];
        } else if (arr[i] === max) {
            indices.push(i);
        }
    }
    return indices;
}

function randomIndex(arr) {
    return Math.floor(Math.random() * arr.length);
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Fisher-Yates shuffle, in place
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
    }
    return arr;
}

// moves perpendicular to the given (axis-aligned) move
function perpendicularMoves(pawnMoveTuple) {
    if (pawnMoveTuple[0] !== 0) {
        return [MOVE_LEFT, MOVE_RIGHT];
    } else {
        return [MOVE_UP, MOVE_DOWN];
    }
}


/*
* Represents a pawn's position on board
*/
class PawnPosition {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    equals(otherPosition) {
        return this.row === otherPosition.row && this.col === otherPosition.col;
    }

    newAddMove(pawnMoveTuple) {
        return new PawnPosition(this.row + pawnMoveTuple[0], this.col + pawnMoveTuple[1]);
    }

    // left (this instance) - right (argument)
    getDisplacementPawnMoveTupleFrom(position) {
        return [this.row - position.row, this.col - position.col];
    }
}


/*
* Represents a pawn
*/
class Pawn {
    constructor(index, isHumanPlayer, forClone = false) {
        this.index = null;
        this.isHumanPlayer = null;
        this.position = null;
        this.goal = null;
        this.numberOfLeftWalls = null;
        if (!forClone) {
            this.index = index;
            this.isHumanPlayer = isHumanPlayer;
            this.position = new PawnPosition(START_POSITIONS[index].row, START_POSITIONS[index].col);
            this.goal = { row: GOALS[index].row, col: GOALS[index].col };
            this.numberOfLeftWalls = NUM_OF_WALLS_PER_PLAYER;
        }
    }
}


/*
* Represents a Board
*/
class Board {
    constructor(forClone = false) {
        this.pawns = null;
        this.walls = null;
        if (!forClone) {
            this.pawns = [];
            for (let i = 0; i < NUM_OF_PLAYERS; i++) {
                this.pawns.push(new Pawn(i, false));
            }
            // horizontal, vertical: each is a 8 by 8 2D array, true: there is a wall, false: there is not a wall.
            this.walls = { horizontal: create2DArrayInitializedTo(8, 8, false), vertical: create2DArrayInitializedTo(8, 8, false) };
        }
    }
}


/*
* Represents a Quoridor game (4 players) and the rule
*/
class Game {
    constructor(forClone = false) {
        this.board = null;
        this.winner = null;
        this._turn = null;
        this.validNextWalls = null;
        this._probableNextWalls = null;
        this._probableValidNextWalls = null;
        this._probableValidNextWallsUpdated = null;
        this.openWays = null;
        this._validNextPositions = null;
        this._validNextPositionsUpdated = null;
        if (!forClone) {
            this.board = new Board();
            this.winner = null;
            this._turn = 0;

            // 8x8 2D bool arrays; true indicates the wall location is still placeable
            // (not overlapping already placed walls). Updated each time a wall is placed.
            this.validNextWalls = { horizontal: create2DArrayInitializedTo(8, 8, true), vertical: create2DArrayInitializedTo(8, 8, true) };

            // for the expansion phase of Monte Carlo Tree Search (walls near pawns / near placed walls)
            this._probableNextWalls = { horizontal: create2DArrayInitializedTo(8, 8, false), vertical: create2DArrayInitializedTo(8, 8, false) };
            this._probableValidNextWalls = null;
            this._probableValidNextWallsUpdated = false;

            // whether ways between adjacent cells are open (true) or blocked (false)
            this.openWays = { upDown: create2DArrayInitializedTo(8, 9, true), leftRight: create2DArrayInitializedTo(9, 8, true) };

            this._validNextPositions = create2DArrayInitializedTo(9, 9, false);
            this._validNextPositionsUpdated = false;
        }
    }

    get turn() {
        return this._turn;
    }

    set turn(newTurn) {
        this._turn = newTurn;
        this._validNextPositionsUpdated = false;
        this._probableValidNextWallsUpdated = false;
    }

    get pawnIndexOfTurn() {
        return this.turn % NUM_OF_PLAYERS;
    }

    get pawnOfTurn() {
        return this.board.pawns[this.pawnIndexOfTurn];
    }

    get pawnsOfNotTurn() {
        const pawns = [];
        for (let i = 1; i < NUM_OF_PLAYERS; i++) {
            pawns.push(this.board.pawns[(this.pawnIndexOfTurn + i) % NUM_OF_PLAYERS]);
        }
        return pawns;
    }

    pawnAt(row, col) {
        for (let i = 0; i < NUM_OF_PLAYERS; i++) {
            const pawn = this.board.pawns[i];
            if (pawn.position.row === row && pawn.position.col === col) {
                return pawn;
            }
        }
        return null;
    }

    isOnBoard(row, col) {
        return (row >= 0 && row <= 8 && col >= 0 && col <= 8);
    }

    isGoalPositionFor(pawn, row, col) {
        const goal = pawn.goal;
        if (goal.row !== null) {
            return row === goal.row;
        } else {
            return col === goal.col;
        }
    }

    /*
    * Heuristic set of promising wall locations for the MCTS expansion phase:
    *  1. near already placed walls
    *  2. near pawns (to disturb an opponent or support myself)
    *  3. leftmost / rightmost columns of horizontal walls (side-lane runs)
    * intersected with validNextWalls.
    */
    get probableValidNextWalls() {
        if (this._probableValidNextWallsUpdated) {
            return this._probableValidNextWalls;
        }
        this._probableValidNextWallsUpdated = true;

        const _probableValidNextWalls = {
            horizontal: create2DArrayClonedFrom(this._probableNextWalls.horizontal),
            vertical: create2DArrayClonedFrom(this._probableNextWalls.vertical)
        };

        // leftmost and rightmost horizontal walls, after several rounds
        if (this.turn >= NUM_OF_PLAYERS * 3) {
            for (let i = 0; i < 8; i++) {
                _probableValidNextWalls.horizontal[i][0] = true;
                _probableValidNextWalls.horizontal[i][7] = true;
            }
        }

        // walls beside pawns, after the first round
        if (this.turn >= NUM_OF_PLAYERS) {
            for (let i = 0; i < NUM_OF_PLAYERS; i++) {
                Game.setWallsBesidePawn(_probableValidNextWalls, this.board.pawns[i]);
            }
        }

        _probableValidNextWalls.horizontal = logicalAndBetween2DArray(_probableValidNextWalls.horizontal, this.validNextWalls.horizontal);
        _probableValidNextWalls.vertical = logicalAndBetween2DArray(_probableValidNextWalls.vertical, this.validNextWalls.vertical);
        this._probableValidNextWalls = _probableValidNextWalls;
        return _probableValidNextWalls;
    }

    /*
    * 9x9 bool array of cells the pawn of this turn may move to
    * (simple steps, straight jumps and diagonal jumps over adjacent pawns).
    */
    get validNextPositions() {
        if (this._validNextPositionsUpdated === true) {
            return this._validNextPositions;
        }
        this._validNextPositionsUpdated = true;

        set2DArrayEveryElementToValue(this._validNextPositions, false);

        const currentPosition = this.pawnOfTurn.position;
        const mainMoves = [MOVE_UP, MOVE_DOWN, MOVE_LEFT, MOVE_RIGHT];

        for (const mainMove of mainMoves) {
            if (this.isOpenWay(currentPosition.row, currentPosition.col, mainMove)) {
                const neighborPosition = currentPosition.newAddMove(mainMove);
                const neighborPawn = this.pawnAt(neighborPosition.row, neighborPosition.col);
                if (neighborPawn === null) {
                    // simple step
                    this._validNextPositions[neighborPosition.row][neighborPosition.col] = true;
                } else {
                    // a pawn is adjacent in this direction: consider jumping over it
                    // (1) straight jump over the neighbor pawn
                    const straightPosition = neighborPosition.newAddMove(mainMove);
                    const straightOk = this.isOnBoard(straightPosition.row, straightPosition.col)
                        && this.isOpenWay(neighborPosition.row, neighborPosition.col, mainMove)
                        && this.pawnAt(straightPosition.row, straightPosition.col) === null;
                    if (straightOk) {
                        this._validNextPositions[straightPosition.row][straightPosition.col] = true;
                    } else {
                        // (2) diagonal jumps beside the neighbor pawn
                        //     (allowed only when the straight jump is impossible)
                        for (const subMove of perpendicularMoves(mainMove)) {
                            const diagPosition = neighborPosition.newAddMove(subMove);
                            if (this.isOnBoard(diagPosition.row, diagPosition.col)
                                && this.isOpenWay(neighborPosition.row, neighborPosition.col, subMove)
                                && this.pawnAt(diagPosition.row, diagPosition.col) === null) {
                                this._validNextPositions[diagPosition.row][diagPosition.col] = true;
                            }
                        }
                    }
                }
            }
        }

        return this._validNextPositions;
    }

    // checks the pawnMoveTuple against walls on the board and the board size
    // (does not check the validity against other pawns' positions)
    isValidNextMoveNotConsideringOtherPawn(currentPosition, pawnMoveTuple) {
        return this.isOpenWay(currentPosition.row, currentPosition.col, pawnMoveTuple);
    }

    isOpenWay(currentRow, currentCol, pawnMoveTuple) {
        if (pawnMoveTuple[0] === -1 && pawnMoveTuple[1] === 0) { // up
            return (currentRow > 0 && this.openWays.upDown[currentRow - 1][currentCol]);
        } else if (pawnMoveTuple[0] === 1 && pawnMoveTuple[1] === 0) { // down
            return (currentRow < 8 && this.openWays.upDown[currentRow][currentCol]);
        } else if (pawnMoveTuple[0] === 0 && pawnMoveTuple[1] === -1) { // left
            return (currentCol > 0 && this.openWays.leftRight[currentRow][currentCol - 1]);
        } else if (pawnMoveTuple[0] === 0 && pawnMoveTuple[1] === 1) { // right
            return (currentCol < 8 && this.openWays.leftRight[currentRow][currentCol]);
        } else {
            throw "pawnMoveTuple should be one of [1, 0], [-1, 0], [0, 1], [0, -1]";
        }
    }

    movePawn(row, col, needCheck = false) {
        if (needCheck && this.validNextPositions[row][col] !== true) {
            return false;
        }
        const pawn = this.pawnOfTurn;
        pawn.position.row = row;
        pawn.position.col = col;
        if (this.isGoalPositionFor(pawn, row, col)) {
            this.winner = pawn;
        }
        this.turn++;
        return true;
    }

    // ------------------------------------------------------------------
    // "connected on two points" test: a wall which is not connected on
    // two points to other walls / the board border cannot fully block a
    // path, so the path-existence check can be skipped for it.
    // (ported unchanged from the original: pure wall-grid logic)
    // ------------------------------------------------------------------

    testIfAdjecentToOtherWallForHorizontalWallLeft(row, col) {
        if (col >= 1) {
            if (this.board.walls.vertical[row][col - 1]) return true;
            if (row >= 1 && this.board.walls.vertical[row - 1][col - 1]) return true;
            if (row <= 6 && this.board.walls.vertical[row + 1][col - 1]) return true;
            if (col >= 2 && this.board.walls.horizontal[row][col - 2]) return true;
        }
        return false;
    }

    testIfAdjecentToOtherWallForHorizontalWallRight(row, col) {
        if (col <= 6) {
            if (this.board.walls.vertical[row][col + 1]) return true;
            if (row >= 1 && this.board.walls.vertical[row - 1][col + 1]) return true;
            if (row <= 6 && this.board.walls.vertical[row + 1][col + 1]) return true;
            if (col <= 5 && this.board.walls.horizontal[row][col + 2]) return true;
        }
        return false;
    }

    testIfAdjecentToOtherWallForHorizontalWallMiddle(row, col) {
        if (row >= 1 && this.board.walls.vertical[row - 1][col]) return true;
        if (row <= 6 && this.board.walls.vertical[row + 1][col]) return true;
        return false;
    }

    testIfConnectedOnTwoPointsForHorizontalWall(row, col) {
        const left = (col === 0 || this.testIfAdjecentToOtherWallForHorizontalWallLeft(row, col));
        const right = (col === 7 || this.testIfAdjecentToOtherWallForHorizontalWallRight(row, col));
        const middle = this.testIfAdjecentToOtherWallForHorizontalWallMiddle(row, col);
        return (left && right) || (right && middle) || (middle && left);
    }

    testIfAdjecentToOtherWallForVerticalWallTop(row, col) {
        if (row >= 1) {
            if (this.board.walls.horizontal[row - 1][col]) return true;
            if (col >= 1 && this.board.walls.horizontal[row - 1][col - 1]) return true;
            if (col <= 6 && this.board.walls.horizontal[row - 1][col + 1]) return true;
            if (row >= 2 && this.board.walls.vertical[row - 2][col]) return true;
        }
        return false;
    }

    testIfAdjecentToOtherWallForVerticalWallBottom(row, col) {
        if (row <= 6) {
            if (this.board.walls.horizontal[row + 1][col]) return true;
            if (col >= 1 && this.board.walls.horizontal[row + 1][col - 1]) return true;
            if (col <= 6 && this.board.walls.horizontal[row + 1][col + 1]) return true;
            if (row <= 5 && this.board.walls.vertical[row + 2][col]) return true;
        }
        return false;
    }

    testIfAdjecentToOtherWallForVerticalWallMiddle(row, col) {
        if (col >= 1 && this.board.walls.horizontal[row][col - 1]) return true;
        if (col <= 6 && this.board.walls.horizontal[row][col + 1]) return true;
        return false;
    }

    testIfConnectedOnTwoPointsForVerticalWall(row, col) {
        const top = (row === 0) || this.testIfAdjecentToOtherWallForVerticalWallTop(row, col);
        const bottom = (row === 7) || this.testIfAdjecentToOtherWallForVerticalWallBottom(row, col);
        const middle = this.testIfAdjecentToOtherWallForVerticalWallMiddle(row, col);
        return (top && bottom) || (bottom && middle) || (middle && top);
    }

    // ------------------------------------------------------------------
    // path-existence rule ("There must remain at least one path to the
    // goal line for each pawn.") -- checked for all four pawns.
    // ------------------------------------------------------------------

    testIfExistPathsToGoalLinesAfterPlaceHorizontalWall(row, col) {
        // wall which does not connect on two points cannot block a path
        if (!this.testIfConnectedOnTwoPointsForHorizontalWall(row, col)) {
            return true;
        }
        this.openWays.upDown[row][col] = false;
        this.openWays.upDown[row][col + 1] = false;
        const result = this._existPathsToGoalLines();
        this.openWays.upDown[row][col] = true;
        this.openWays.upDown[row][col + 1] = true;
        return result;
    }

    testIfExistPathsToGoalLinesAfterPlaceVerticalWall(row, col) {
        if (!this.testIfConnectedOnTwoPointsForVerticalWall(row, col)) {
            return true;
        }
        this.openWays.leftRight[row][col] = false;
        this.openWays.leftRight[row + 1][col] = false;
        const result = this._existPathsToGoalLines();
        this.openWays.leftRight[row][col] = true;
        this.openWays.leftRight[row + 1][col] = true;
        return result;
    }

    isPossibleNextMove(move) {
        const movePawnTo = move[0];
        const placeHorizontalWallAt = move[1];
        const placeVerticalWallAt = move[2];
        if (movePawnTo) {
            return this.validNextPositions[movePawnTo[0]][movePawnTo[1]];
        } else if (placeHorizontalWallAt) {
            return this.testIfExistPathsToGoalLinesAfterPlaceHorizontalWall(placeHorizontalWallAt[0], placeHorizontalWallAt[1]);
        } else if (placeVerticalWallAt) {
            return this.testIfExistPathsToGoalLinesAfterPlaceVerticalWall(placeVerticalWallAt[0], placeVerticalWallAt[1]);
        }
        return false;
    }

    // ------------------------------------------------------------------
    // probable-walls bookkeeping (for MCTS), ported from the original
    // ------------------------------------------------------------------

    adjustProbableValidNextWallForAfterPlaceHorizontalWall(row, col) {
        if (row >= 1) this._probableNextWalls.vertical[row - 1][col] = true;
        if (row <= 6) this._probableNextWalls.vertical[row + 1][col] = true;
        if (col >= 1) {
            this._probableNextWalls.vertical[row][col - 1] = true;
            if (row >= 1) this._probableNextWalls.vertical[row - 1][col - 1] = true;
            if (row <= 6) this._probableNextWalls.vertical[row + 1][col - 1] = true;
            if (col >= 2) {
                this._probableNextWalls.horizontal[row][col - 2] = true;
                this._probableNextWalls.vertical[row][col - 2] = true;
                if (col >= 3) this._probableNextWalls.horizontal[row][col - 3] = true;
            }
        }
        if (col <= 6) {
            this._probableNextWalls.vertical[row][col + 1] = true;
            if (row >= 1) this._probableNextWalls.vertical[row - 1][col + 1] = true;
            if (row <= 6) this._probableNextWalls.vertical[row + 1][col + 1] = true;
            if (col <= 5) {
                this._probableNextWalls.horizontal[row][col + 2] = true;
                this._probableNextWalls.vertical[row][col + 2] = true;
                if (col <= 4) this._probableNextWalls.horizontal[row][col + 3] = true;
            }
        }
    }

    adjustProbableValidNextWallForAfterPlaceVerticalWall(row, col) {
        if (col >= 1) this._probableNextWalls.horizontal[row][col - 1] = true;
        if (col <= 6) this._probableNextWalls.horizontal[row][col + 1] = true;
        if (row >= 1) {
            this._probableNextWalls.horizontal[row - 1][col] = true;
            if (col >= 1) this._probableNextWalls.horizontal[row - 1][col - 1] = true;
            if (col <= 6) this._probableNextWalls.horizontal[row - 1][col + 1] = true;
            if (row >= 2) {
                this._probableNextWalls.vertical[row - 2][col] = true;
                this._probableNextWalls.horizontal[row - 2][col] = true;
                if (row >= 3) this._probableNextWalls.vertical[row - 3][col] = true;
            }
        }
        if (row <= 6) {
            this._probableNextWalls.horizontal[row + 1][col] = true;
            if (col >= 1) this._probableNextWalls.horizontal[row + 1][col - 1] = true;
            if (col <= 6) this._probableNextWalls.horizontal[row + 1][col + 1] = true;
            if (row <= 5) {
                this._probableNextWalls.vertical[row + 2][col] = true;
                this._probableNextWalls.horizontal[row + 2][col] = true;
                if (row <= 4) this._probableNextWalls.vertical[row + 3][col] = true;
            }
        }
    }

    placeHorizontalWall(row, col, needCheck = false) {
        if (needCheck && !this.testIfExistPathsToGoalLinesAfterPlaceHorizontalWall(row, col)) {
            return false;
        }
        this.openWays.upDown[row][col] = false;
        this.openWays.upDown[row][col + 1] = false;
        this.validNextWalls.vertical[row][col] = false;
        this.validNextWalls.horizontal[row][col] = false;
        if (col > 0) this.validNextWalls.horizontal[row][col - 1] = false;
        if (col < 7) this.validNextWalls.horizontal[row][col + 1] = false;
        this.board.walls.horizontal[row][col] = true;

        this.adjustProbableValidNextWallForAfterPlaceHorizontalWall(row, col);
        this.pawnOfTurn.numberOfLeftWalls--;
        this.turn++;
        return true;
    }

    placeVerticalWall(row, col, needCheck = false) {
        if (needCheck && !this.testIfExistPathsToGoalLinesAfterPlaceVerticalWall(row, col)) {
            return false;
        }
        this.openWays.leftRight[row][col] = false;
        this.openWays.leftRight[row + 1][col] = false;
        this.validNextWalls.horizontal[row][col] = false;
        this.validNextWalls.vertical[row][col] = false;
        if (row > 0) this.validNextWalls.vertical[row - 1][col] = false;
        if (row < 7) this.validNextWalls.vertical[row + 1][col] = false;
        this.board.walls.vertical[row][col] = true;

        this.adjustProbableValidNextWallForAfterPlaceVerticalWall(row, col);
        this.pawnOfTurn.numberOfLeftWalls--;
        this.turn++;
        return true;
    }

    // only one argument must be provided as a 2-element array, others must be null.
    doMove(move, needCheck = false) {
        if (this.winner !== null) {
            console.log("error: doMove after already terminal......"); // for debug
        }
        const movePawnTo = move[0];
        const placeHorizontalWallAt = move[1];
        const placeVerticalWallAt = move[2];
        if (movePawnTo) {
            return this.movePawn(movePawnTo[0], movePawnTo[1], needCheck);
        } else if (placeHorizontalWallAt) {
            return this.placeHorizontalWall(placeHorizontalWallAt[0], placeHorizontalWallAt[1], needCheck);
        } else if (placeVerticalWallAt) {
            return this.placeVerticalWall(placeVerticalWallAt[0], placeVerticalWallAt[1], needCheck);
        }
        return false;
    }

    _existPathsToGoalLines() {
        for (let i = 0; i < NUM_OF_PLAYERS; i++) {
            if (!this._existPathToGoalLineFor(this.board.pawns[i])) {
                return false;
            }
        }
        return true;
    }

    // breadth first search from the pawn position to its goal line
    // (other pawns do not block: they can move away)
    _existPathToGoalLineFor(pawn) {
        const goal = pawn.goal;
        const visited = create2DArrayInitializedTo(9, 9, false);
        const pawnMoveTuples = [MOVE_UP, MOVE_LEFT, MOVE_RIGHT, MOVE_DOWN];
        const queue = [[pawn.position.row, pawn.position.col]];
        visited[pawn.position.row][pawn.position.col] = true;
        while (queue.length > 0) {
            const current = queue.shift();
            const currentRow = current[0];
            const currentCol = current[1];
            if ((goal.row !== null && currentRow === goal.row) || (goal.col !== null && currentCol === goal.col)) {
                return true;
            }
            for (const pawnMoveTuple of pawnMoveTuples) {
                if (this.isOpenWay(currentRow, currentCol, pawnMoveTuple)) {
                    const nextRow = currentRow + pawnMoveTuple[0];
                    const nextCol = currentCol + pawnMoveTuple[1];
                    if (!visited[nextRow][nextCol]) {
                        visited[nextRow][nextCol] = true;
                        queue.push([nextRow, nextCol]);
                    }
                }
            }
        }
        return false;
    }

    static setWallsBesidePawn(wall2DArrays, pawn) {
        const row = pawn.position.row;
        const col = pawn.position.col;
        if (row >= 1) {
            if (col >= 1) {
                wall2DArrays.horizontal[row - 1][col - 1] = true;
                wall2DArrays.vertical[row - 1][col - 1] = true;
                if (col >= 2) wall2DArrays.horizontal[row - 1][col - 2] = true;
            }
            if (col <= 7) {
                wall2DArrays.horizontal[row - 1][col] = true;
                wall2DArrays.vertical[row - 1][col] = true;
                if (col <= 6) wall2DArrays.horizontal[row - 1][col + 1] = true;
            }
            if (row >= 2) {
                if (col >= 1) wall2DArrays.vertical[row - 2][col - 1] = true;
                if (col <= 7) wall2DArrays.vertical[row - 2][col] = true;
            }
        }
        if (row <= 7) {
            if (col >= 1) {
                wall2DArrays.horizontal[row][col - 1] = true;
                wall2DArrays.vertical[row][col - 1] = true;
                if (col >= 2) wall2DArrays.horizontal[row][col - 2] = true;
            }
            if (col <= 7) {
                wall2DArrays.horizontal[row][col] = true;
                wall2DArrays.vertical[row][col] = true;
                if (col <= 6) wall2DArrays.horizontal[row][col + 1] = true;
            }
            if (row <= 6) {
                if (col >= 1) wall2DArrays.vertical[row + 1][col - 1] = true;
                if (col <= 7) wall2DArrays.vertical[row + 1][col] = true;
            }
        }
    }
}


// ------------------------------------------------------------------
// clone functions (used by the AI, the controller history and the worker)
// ------------------------------------------------------------------

PawnPosition.clone = function (pawnPosition) {
    return new PawnPosition(pawnPosition.row, pawnPosition.col);
};

Pawn.clone = function (pawn) {
    const _clone = new Pawn(pawn.index, pawn.isHumanPlayer, true);
    _clone.index = pawn.index;
    _clone.isHumanPlayer = pawn.isHumanPlayer;
    _clone.position = PawnPosition.clone(pawn.position);
    _clone.goal = { row: pawn.goal.row, col: pawn.goal.col };
    _clone.numberOfLeftWalls = pawn.numberOfLeftWalls;
    return _clone;
};

Board.clone = function (board) {
    const _clone = new Board(true);
    _clone.pawns = [];
    for (let i = 0; i < NUM_OF_PLAYERS; i++) {
        _clone.pawns.push(Pawn.clone(board.pawns[i]));
    }
    _clone.walls = {
        horizontal: create2DArrayClonedFrom(board.walls.horizontal),
        vertical: create2DArrayClonedFrom(board.walls.vertical)
    };
    return _clone;
};

Game.clone = function (game) {
    const _clone = new Game(true);
    _clone.board = Board.clone(game.board);
    if (game.winner === null) {
        _clone.winner = null;
    } else {
        _clone.winner = _clone.board.pawns[game.winner.index];
    }
    _clone._turn = game._turn;
    _clone.validNextWalls = {
        horizontal: create2DArrayClonedFrom(game.validNextWalls.horizontal),
        vertical: create2DArrayClonedFrom(game.validNextWalls.vertical)
    };
    _clone._probableNextWalls = {
        horizontal: create2DArrayClonedFrom(game._probableNextWalls.horizontal),
        vertical: create2DArrayClonedFrom(game._probableNextWalls.vertical)
    };
    _clone._probableValidNextWalls = null;
    _clone._probableValidNextWallsUpdated = false;
    _clone.openWays = {
        upDown: create2DArrayClonedFrom(game.openWays.upDown),
        leftRight: create2DArrayClonedFrom(game.openWays.leftRight)
    };
    _clone._validNextPositions = create2DArrayClonedFrom(game._validNextPositions);
    _clone._validNextPositionsUpdated = game._validNextPositionsUpdated;
    return _clone;
};

"use strict";
/* Puzzle data generated from the engine-verified BFS dataset. */
const PUZZLES = [{"id":"SE_rotate","label":"Bottom-right - Rotate (par 5)","corner":"SE","type":"rotate","region":{"r0":3,"r1":8,"c0":4,"c1":8},"start":[71,80,79,70],"target":[70,71,80,79],"par":5,"firstMoverIndex":1,"cornerCell":80},{"id":"SW_rotate","label":"Bottom-left - Rotate (par 5)","corner":"SW","type":"rotate","region":{"r0":3,"r1":8,"c0":0,"c1":4},"start":[64,73,72,63],"target":[63,64,73,72],"par":5,"firstMoverIndex":2,"cornerCell":72},{"id":"NE_rotate","label":"Top-right - Rotate (par 7)","corner":"NE","type":"rotate","region":{"r0":0,"r1":5,"c0":4,"c1":8},"start":[8,7,17,16],"target":[17,8,16,7],"par":7,"firstMoverIndex":0,"cornerCell":8},{"id":"NW_rotate","label":"Top-left - Rotate (par 7)","corner":"NW","type":"rotate","region":{"r0":0,"r1":5,"c0":0,"c1":4},"start":[9,1,10,0],"target":[0,10,9,1],"par":7,"firstMoverIndex":3,"cornerCell":0},{"id":"NE_swap","label":"Top-right - Swap (par 10)","corner":"NE","type":"swap","region":{"r0":0,"r1":5,"c0":4,"c1":8},"start":[16,8,17,7],"target":[8,16,17,7],"par":10,"firstMoverIndex":1,"cornerCell":8},{"id":"NW_swap","label":"Top-left - Swap (par 11)","corner":"NW","type":"swap","region":{"r0":0,"r1":5,"c0":0,"c1":4},"start":[10,1,9,0],"target":[0,1,9,10],"par":11,"firstMoverIndex":3,"cornerCell":0},{"id":"SE_swap","label":"Bottom-right - Swap (par 11)","corner":"SE","type":"swap","region":{"r0":3,"r1":8,"c0":4,"c1":8},"start":[71,80,70,79],"target":[71,70,80,79],"par":11,"firstMoverIndex":1,"cornerCell":80},{"id":"SW_swap","label":"Bottom-left - Swap (par 11)","corner":"SW","type":"swap","region":{"r0":3,"r1":8,"c0":0,"c1":4},"start":[63,73,72,64],"target":[63,73,64,72],"par":11,"firstMoverIndex":2,"cornerCell":72}];

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

// ---- logic test ----
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
    const g2 = new Game();
    for (let i = 0; i < 4; i++) {
        g2.board.pawns[i].position.row = Math.floor(pz.start[i] / 9);
        g2.board.pawns[i].position.col = pz.start[i] % 9;
    }
    g2.turn = pz.firstMoverIndex;
    for (let k = 0; k < 2; k++) g2.doMove([[Math.floor(sol[k].dest / 9), sol[k].dest % 9], null, null], true);
    const mid = g2.board.pawns.map(p => p.position.row * 9 + p.position.col);
    const rem = cpSolve(mid, g2.turn, pz.target, pz.region);
    assert(rem !== null && rem.length === pz.par - 2, pz.id + " mid-hint dist " + (rem ? rem.length : "null") + " == " + (pz.par - 2));
    // deviation hint: undo one of the two (move a pawn somewhere legal but wrong) is hard to fake; skip
}
console.log("LOGIC RESULT:", pass, "passed,", fail, "failed");
if (fail) process.exit(1);
