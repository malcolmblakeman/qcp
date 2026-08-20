"use strict";

/* Hint worker: runs the BFS solver off the UI thread.
*  in:  { pos:[4], turn, target:[4], region:{r0,r1,c0,c1} }
*  out: { type: "hint", moves: [...] | null }
*/
importScripts('solver.js');

onmessage = function (event) {
    const d = event.data;
    const moves = cpSolve(d.pos, d.turn, d.target, d.region);
    postMessage({ type: "hint", moves: moves });
};
