import {
  PlayerNum,
  TeamNum,
  PointOutcomes,
  NumericScoreObj,
  Player,
  PlayerIdentifier,
} from "./types.js";
import { Point } from "./Point.js";

/**
 * Represents a tiebreak game.
 */
export class TieBreak {
  server: PlayerNum | Player;
  serverTeam?: TeamNum;
  winner: PlayerNum | TeamNum | 0;
  score: NumericScoreObj;
  points: Point[];
  servingRotation?: Player[];
  currentServerIndex?: number;
  initialServer: PlayerNum | Player;

  /**
   * Creates a new TieBreak.
   * @param server The player who serves first in the tiebreak.
   * @param servingRotation The serving rotation for doubles.
   */
  constructor(server: PlayerNum | Player, servingRotation?: Player[]) {
    this.initialServer = server;
    if (typeof server === "number") {
      // Singles
      this.server = server;
    } else {
      // Doubles
      this.server = server;
      this.serverTeam = server.team;
      this.servingRotation = servingRotation;
      this.currentServerIndex = servingRotation?.findIndex((p) => p === server);
    }
    this.winner = 0;
    this.score = { 1: 0, 2: 0 };
    this.points = [];
  }

  /**
   * Records a point for a player in the tiebreak.
   * @param winner The player/team who won the point.
   * @param how The way the point was won.
   * @param fault The number of faults on the serve.
   * @param scoringPlayer The specific player who scored (for doubles).
   * @returns 1 if the point was scored, 0 if the tiebreak was already won.
   */
  scorePoint(
    winner: PlayerNum | TeamNum,
    how: PointOutcomes = PointOutcomes.REGULAR,
    fault: number = 0,
    scoringPlayer?: PlayerIdentifier
  ): number {
    if (this.winner) return 0;
    const pointObject = new Point(
      winner,
      how,
      fault,
      this.server,
      scoringPlayer
    );
    this.score[winner as PlayerNum]++;
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
    let leader: PlayerNum | TeamNum = 1;
    let loser: PlayerNum | TeamNum = 2;
    this.winner = 0;

    // Update server based on point count
    const totalPoints = this.score[1] + this.score[2];

    if (this.servingRotation) {
      // Doubles tiebreak serving pattern:
      // After 1st point, then every 2 points
      if (totalPoints === 1 || (totalPoints > 1 && totalPoints % 2 === 1)) {
        this.currentServerIndex = (this.currentServerIndex! + 1) % 4;
        this.server = this.servingRotation[this.currentServerIndex!];
        this.serverTeam = (this.server as Player).team;
      }
    } else {
      // Singles - existing logic
      if (totalPoints > 0 && totalPoints % 2 === 1) {
        this.server = (this.server as PlayerNum) === 1 ? 2 : 1;
      }
    }

    if (this.score[2] > this.score[1]) {
      leader = 2;
      loser = 1;
    }

    if (
      this.score[leader as PlayerNum] >= 7 &&
      this.score[leader as PlayerNum] - this.score[loser as PlayerNum] >= 2
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
