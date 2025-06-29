import { PlayerNum, PointOutcomes, NumericScoreObj } from "./types.js";
import { Point } from "./Point.js";
import { Game } from "./Game.js";
import { TieBreak } from "./TieBreak.js";

/**
 * Represents a single set in a tennis match.
 */
export class Set {
    winner: PlayerNum | 0;
    score: NumericScoreObj;
    game: Game;
    games: Game[];
    tiebreak: TieBreak | null;
    nextServer?: PlayerNum;

    /**
     * Creates a new Set.
     * @param theServer The player to serve the first game of the set.
     */
    constructor(theServer: PlayerNum) {
        this.winner = 0;
        this.score = { 1: 0, 2: 0 };
        this.game = new Game(theServer);
        this.games = [];
        this.tiebreak = null;
    }

    /**
     * Scores a point within the current set (either in a game or a tiebreak).
     * @param winner The player who won the point.
     * @param how The way the point was won.
     * @param fault The number of faults on the serve.
     */
    scorePoint(
        winner: PlayerNum,
        how: PointOutcomes = PointOutcomes.REGULAR,
        fault: number = 0,
    ): void {
        if (this.winner) return; // Don't score points if set is already won
        if (this.tiebreak) {
            this.tiebreak.scorePoint(winner, how, fault);
        } else {
            this.game.scorePoint(winner, how, fault);
        }
        this.updateSet();
    }

    /**
     * Removes the last scored point from the set. Handles transitions between games and tiebreaks.
     */
    removePoint(): void {
        const tiebreakWinnerBeforeUndo = this.tiebreak?.winner;
        this.winner = 0;

        if (this.tiebreak) {
            // If the tiebreak has points, remove one.
            if (this.tiebreak.points.length > 0) {
                this.tiebreak.removePoint(); // This updates the tiebreak's winner status internally.

                // If the tiebreak was won before this undo, but is not won now,
                // it means we just undid the winning point. Decrement the set's game score.
                if (tiebreakWinnerBeforeUndo && !this.tiebreak.winner) {
                    this.score[tiebreakWinnerBeforeUndo]--;
                }

                this.updateSet();
            } else {
                // If the tiebreak is empty, we are crossing the boundary from tiebreak back to a regular game.
                this.tiebreak = null;
                // Restore the previous game and remove a point from it.
                this.game = this.games.pop()!;
                this.score[this.game.winner as PlayerNum]--;
                this.game.removePoint();
                this.updateSet();
            }
            return;
        }

        // If the current game is empty and there are previous games, it means we are at a game boundary.
        if (this.game.points.length === 0 && this.games.length > 0) {
            // Restore the previous game.
            this.game = this.games.pop()!;
            // Decrement the set score for the winner of that game.
            this.score[this.game.winner as PlayerNum]--;
        }

        this.game.removePoint();
        this.updateSet();
    }

    /**
     * Updates the set's score, checks for a winner, and handles the transition to a new game or tiebreak.
     */
    updateSet(): void {
        const theNextServer: PlayerNum = this.game.server === 2 ? 1 : 2;

        if (this.tiebreak) {
            if (this.tiebreak.winner) {
                // Tiebreak winner also wins the set.
                // We only increment the game score if the set hasn't been won yet.
                if (!this.winner) {
                    this.score[this.tiebreak.winner]++;
                }
                this.winner = this.tiebreak.winner;
                this.nextServer = this.tiebreak.server === 1 ? 2 : 1;
            } else {
                // If the tiebreak is no longer won (e.g., due to an undo), clear the set winner.
                this.winner = 0;
            }
            // If there's a tiebreak, no other logic is needed here.
            return;
        }

        if (this.game.winner) {
            // A game has been won. Update set score and create a new game.
            this.score[this.game.winner]++;
            this.games.push(this.game);
            this.game = new Game(theNextServer);
        } else {
            // If no game winner, no need to check for set winner yet.
            return;
        }

        let leader: PlayerNum = 1;
        let loser: PlayerNum = 2;
        if (this.score[2] > this.score[1]) {
            leader = 2;
            loser = 1;
        }

        // Check for standard set win condition
        if (
            this.score[leader] >= 6 &&
            this.score[leader] - this.score[loser] >= 2
        ) {
            this.winner = leader;
        }

        // Check for tiebreak condition
        if (this.score[leader] === 6 && this.score[loser] === 6) {
            this.tiebreak = new TieBreak(theNextServer);
        }

        this.nextServer = theNextServer;
    }

    /**
     * Creates a Set instance from a plain JSON object.
     * @param data The plain object.
     * @returns A Set instance.
     */
    static fromJSON(data: any): Set {
        // The server passed to constructor is for the *first* game.
        // When rehydrating, the `game` property will be overwritten anyway, so we can pass a dummy value.
        const set = new Set(1);
        Object.assign(set, data, {
            games: data.games.map((g: any) => Game.fromJSON(g)),
            game: Game.fromJSON(data.game),
            tiebreak: data.tiebreak ? TieBreak.fromJSON(data.tiebreak) : null,
        });
        return set;
    }
}
