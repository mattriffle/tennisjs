import {
    PlayerNum,
    PointOutcomes,
    NumericScoreObj,
    MatchSummary,
    SimpleScore,
} from "./types.js";
import { Point } from "./Point.js";
import { Game } from "./Game.js";
import { TieBreak } from "./TieBreak.js";
import { Set } from "./Set.js";

/**
 * The main class for managing a tennis match.
 */
export class TennisMatch {
    player: { 1: string; 2: string };
    numSets: number;
    score: NumericScoreObj;
    set: Set;
    sets: Set[];
    winner?: PlayerNum;
    saveCallback: ((match: TennisMatch) => void) | null;

    /**
     * Creates a new tennis match.
     * @param player1 The name of player 1.
     * @param player2 The name of player 2.
     * @param numSets The total number of sets to be played (must be an odd number, e.g., 3 or 5).
     * @param saveCallback An optional callback function to persist the match state. Defaults to using localStorage if available.
     */
    constructor(
        player1: string,
        player2: string,
        numSets: number,
        saveCallback?: (match: TennisMatch) => void,
    ) {
        if (numSets % 2 === 0) throw new Error("Number of sets must be odd.");
        this.player = { 1: player1, 2: player2 };
        this.numSets = numSets;
        this.score = { 1: 0, 2: 0 };
        this.set = new Set(1); // Player 1 starts serving by default
        this.sets = [];

        if (saveCallback) {
            this.saveCallback = saveCallback;
        } else if (typeof localStorage !== "undefined") {
            this.saveCallback = (match) => {
                const replacer = (key: string, value: any) => {
                    if (key === "saveCallback") return undefined;
                    return value;
                };
                localStorage.setItem(
                    "tennisMatch",
                    JSON.stringify(match, replacer),
                );
            };
        } else {
            this.saveCallback = null;
        }
    }

    /**
     * Scores a point for a player in the match.
     * @param winner The player who won the point (1 or 2).
     * @param how The way the point was won (e.g., ACE, WINNER).
     * @param fault The number of faults on the serve.
     */
    scorePoint(
        winner: PlayerNum,
        how: PointOutcomes = PointOutcomes.REGULAR,
        fault: number = 0,
    ): void {
        if (this.winner) return;
        this.set.scorePoint(winner, how, fault);
        this.updateMatch();
        this.save();
    }

    /**
     * Removes the last scored point from the match. Handles transitions between sets.
     */
    removePoint(): void {
        if (
            this.set.game.points.length === 0 &&
            this.set.games.length === 0 &&
            !this.set.tiebreak &&
            this.sets.length > 0
        ) {
            // We are at the beginning of a new set, so we need to restore the previous set.
            const previousSet = this.sets.pop()!;
            this.score[previousSet.winner as PlayerNum]--;
            this.set = previousSet;
        }

        // Reset any match winner before undoing the point.
        this.winner = undefined;
        this.set.removePoint();
        this.updateMatch();
        this.save();
    }

    /**
     * Updates the match score after a set is completed and checks for a match winner.
     */
    updateMatch(): void {
        if (!this.set.winner) return;

        // This check prevents incrementing the set score multiple times if updateMatch is called again.
        if (
            this.sets.length > 0 &&
            this.sets[this.sets.length - 1] === this.set
        ) {
            return;
        }

        this.score[this.set.winner]++;

        const toServe = this.set.nextServer!;
        this.sets.push(this.set);
        this.set = new Set(toServe);

        const leader: PlayerNum = this.score[1] > this.score[2] ? 1 : 2;
        if (this.score[leader] > Math.floor(this.numSets / 2)) {
            this.winner = leader;
        }
    }

    /**
     * Manually triggers the save callback to persist the match state.
     */
    save(): void {
        if (this.saveCallback) {
            this.saveCallback(this);
        }
    }

    /**
     * Creates a TennisMatch instance from a plain JSON object.
     * @param data The plain object.
     * @param saveCallback An optional callback function to persist the match state.
     * @returns A TennisMatch instance.
     */
    static fromJSON(
        data: any,
        saveCallback?: (match: TennisMatch) => void,
    ): TennisMatch {
        const match = new TennisMatch(
            data.player[1],
            data.player[2],
            data.numSets,
            saveCallback,
        );
        match.score = data.score;
        match.winner = data.winner;
        match.sets = data.sets.map((s: any) => Set.fromJSON(s));
        match.set = Set.fromJSON(data.set);
        return match;
    }

    /**
     * Loads a match from storage.
     * @param loader An optional function to load the match JSON. Defaults to reading from localStorage.
     * @param saveCallback An optional callback function to persist the match state on the loaded match.
     * @returns A TennisMatch instance or null if no saved data is found.
     */
    static load(
        loader?: () => string | null,
        saveCallback?: (match: TennisMatch) => void,
    ): TennisMatch | null {
        let savedMatchJSON: string | null;

        if (loader) {
            savedMatchJSON = loader();
        } else if (typeof localStorage !== "undefined") {
            savedMatchJSON = localStorage.getItem("tennisMatch");
        } else {
            return null;
        }

        if (!savedMatchJSON) {
            return null;
        }

        const plainMatch = JSON.parse(savedMatchJSON);
        return TennisMatch.fromJSON(plainMatch, saveCallback);
    }

    /**
     * Generates a string representation of the match score.
     * @param server The player whose perspective the score should be from.
     * @returns A comma-separated string of set scores.
     */
    matchScore(server: PlayerNum): string {
        const receiver: PlayerNum = server === 1 ? 2 : 1;
        const score: string[] = [];

        this.sets.forEach((theSet) => {
            let sc = `${theSet.score[server]}-${theSet.score[receiver]}`;
            if (theSet.tiebreak && theSet.winner) {
                // Only show tiebreak score if set is complete
                sc += `(${theSet.tiebreak.score[1] > theSet.tiebreak.score[2] ? theSet.tiebreak.score[2] : theSet.tiebreak.score[1]})`;
            }
            score.push(sc);
        });

        if (!this.winner) {
            score.push(`${this.set.score[server]}-${this.set.score[receiver]}`);
        }

        return score.join(", ");
    }

    /**
     * Generates a detailed summary object of the current match state, including scores, server, and player statistics.
     * @returns A MatchSummary object.
     */
    matchSummary(): MatchSummary {
        let curObj: Game | TieBreak | null = this.set.game;
        if (this.set.tiebreak) {
            curObj = this.set.tiebreak;
        }

        // This can happen if a point is undone at the boundary of a tiebreak
        if (!curObj) {
            curObj = this.set.game;
        }

        const receiver: PlayerNum = curObj.server === 1 ? 2 : 1;

        const stats: {
            1: { [key: string]: number };
            2: { [key: string]: number };
        } = {
            1: {},
            2: {},
        };
        Object.keys(PointOutcomes)
            .filter((key) => isNaN(Number(key)) && key !== "FAULT")
            .forEach((key) => {
                const lowerKey = key.toLowerCase();
                stats[1][lowerKey] = 0;
                stats[2][lowerKey] = 0;
            });

        const allPoints: Point[] = [];

        // Process completed sets
        for (const s of this.sets) {
            for (const g of s.games) {
                allPoints.push(...g.points);
            }
            if (s.tiebreak) {
                allPoints.push(...s.tiebreak.points);
            }
        }

        // Process current set
        for (const g of this.set.games) {
            allPoints.push(...g.points);
        }
        if (this.set.tiebreak) {
            allPoints.push(...this.set.tiebreak.points);
        } else {
            allPoints.push(...this.set.game.points);
        }

        // Process all collated points
        for (const point of allPoints) {
            const key = PointOutcomes[point.how].toLowerCase();
            if (key !== "fault") {
                stats[point.winner][key]++;
            }
        }

        const summary: MatchSummary = {
            meta: {
                type: this.set.tiebreak ? "Tiebreak" : "Game",
                tiebreakActive: !!this.set.tiebreak,
                server: curObj.server,
                receiver,
                player: {
                    1: this.player[1],
                    2: this.player[2],
                },
                numSets: this.numSets,
            },
            player1: {
                sets: this.score[1],
                games: this.set.score[1],
                points: this.set.tiebreak
                    ? this.set.tiebreak.score[1]
                    : this.set.game.score[1],
                stats: stats[1],
            },
            player2: {
                sets: this.score[2],
                games: this.set.score[2],
                points: this.set.tiebreak
                    ? this.set.tiebreak.score[2]
                    : this.set.game.score[2],
                stats: stats[2],
            },
            matchScore: "",
        };

        if (this.winner) {
            summary.winner = this.winner;
            summary.matchScore = this.matchScore(this.winner);
        } else {
            summary.matchScore = this.matchScore(curObj.server);
        }

        return summary;
    }

    /**
     * Returns a simplified score object for the current match state.
     * @returns A simplified score object.
     */
    public getScore(): SimpleScore {
        let server = this.set.game.server;
        if (this.set.tiebreak) {
            server = this.set.tiebreak.server;
        }

        return {
            player1: {
                sets: this.score[1],
                games: this.set.score[1],
                points: this.set.tiebreak
                    ? this.set.tiebreak.score[1]
                    : this.set.game.score[1],
            },
            player2: {
                sets: this.score[2],
                games: this.set.score[2],
                points: this.set.tiebreak
                    ? this.set.tiebreak.score[2]
                    : this.set.game.score[2],
            },
            server: server,
            winner: this.winner,
        };
    }
}
