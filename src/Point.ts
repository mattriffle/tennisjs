import {
  PlayerNum,
  TeamNum,
  PointOutcomes,
  Player,
  PlayerIdentifier,
} from "./types.js";

/**
 * Represents a single point in a tennis match.
 */
export class Point {
  winner: PlayerNum | TeamNum;
  how: PointOutcomes;
  fault: number;
  server: PlayerNum | Player | undefined;
  scoringPlayer?: PlayerIdentifier; // Who actually scored the point in doubles

  /**
   * Creates a new Point.
   * @param winner The player/team who won the point.
   * @param how The way the point was won.
   * @param fault The number of faults on the serve (0 or 1).
   * @param server The player who served the point.
   * @param scoringPlayer The specific player who scored (for doubles).
   */
  constructor(
    winner: PlayerNum | TeamNum,
    how: PointOutcomes,
    fault: number = 0,
    server?: PlayerNum | Player,
    scoringPlayer?: PlayerIdentifier
  ) {
    this.winner = winner;
    this.how = how;
    this.fault = fault;
    if (this.how === PointOutcomes.DOUBLE_FAULT) {
      this.fault = 1;
    }
    this.server = server;
    this.scoringPlayer = scoringPlayer;
  }

  /**
   * Creates a Point instance from a plain JSON object.
   * @param data The plain object.
   * @returns A Point instance.
   */
  static fromJSON(data: any): Point {
    return new Point(
      data.winner,
      data.how,
      data.fault,
      data.server,
      data.scoringPlayer
    );
  }
}
