import { PlayerNum, PointOutcomes, NumericScoreObj } from "./types.js";
import { Point } from "./Point.js";

/**
 * Represents a tiebreak game.
 */
export class TieBreak {
    server: PlayerNum;
    winner: PlayerNum | 0;
    score: NumericScoreObj;
    points: Point[];

    /**
     * Creates a new TieBreak.
     * @param server The player who serves first in the tiebreak.
     */
    constructor(server: PlayerNum) {
        this.server = server;
        this.winner = 0;
        this.score = { 1: 0, 2: 0 };
        this.points = [];
    }

    /**
     * Records a point for a player in the tiebreak.
     * @param winner The player who won the point.
     * @param how The way the point was won.
     * @param fault The number of faults on the serve.
     * @returns 1 if the point was scored, 0 if the tiebreak was already won.
     */
    scorePoint(
        winner: PlayerNum,
        how: PointOutcomes = PointOutcomes.REGULAR,
        fault: number = 0,
    ): number {
        if (this.winner) return 0;
        const pointObject = new Point(winner, how, fault, this.server);
        this.score[winner]++;
        this.points.push(pointObject);
        this.updateGame();
        return 1;
    }

    /**
     * Removes the last scored point from the tiebreak.
     */
    removePoint(): void {
        if (this.points.length === 0) return;
        const lp = this.points.pop()!;
        this.score[lp.winner]--;
        this.updateGame();
    }

    /**
     * Updates the tiebreak's score, server, and determines the winner if applicable.
     */
    updateGame(): void {
        let leader: PlayerNum = 1;
        let loser: PlayerNum = 2;
        this.winner = 0;

        // In a tiebreak, the server switches after the first point, then every two points.
        const totalPoints = this.score[1] + this.score[2];
        if (totalPoints > 0 && totalPoints % 2 === 1) {
            this.server = this.server === 1 ? 2 : 1;
        }

        if (this.score[2] > this.score[1]) {
            leader = 2;
            loser = 1;
        }

        if (
            this.score[leader] >= 7 &&
            this.score[leader] - this.score[loser] >= 2
        ) {
            this.winner = leader;
        }
    }

    /**
     * Creates a TieBreak instance from a plain JSON object.
     * @param data The plain object.
     * @returns A TieBreak instance.
     */
    static fromJSON(data: any): TieBreak {
        const tiebreak = new TieBreak(data.server);
        Object.assign(tiebreak, data);
        tiebreak.points = data.points.map((p: any) => Point.fromJSON(p));
        return tiebreak;
    }
}
