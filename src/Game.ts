import {
  PlayerNum,
  PointOutcomes,
  ScoreObj,
  NumericScoreObj,
} from "./types.js";
import { Point } from "./Point.js";

/**
 * Represents a single game in a tennis set.
 */
export class Game {
  server: PlayerNum;
  winner: PlayerNum | 0;
  score: ScoreObj;
  iscore: NumericScoreObj;
  points: Point[];

  /**
   * Creates a new Game.
   * @param server The player serving the game.
   */
  constructor(server: PlayerNum) {
    this.server = server;
    this.winner = 0;
    this.score = { 1: 0, 2: 0 };
    this.iscore = { 1: 0, 2: 0 };
    this.points = [];
  }

  /**
   * Converts the internal numeric point score (0, 1, 2, 3) to the traditional tennis score name (0, 15, 30, 40).
   * @param num The numeric score.
   * @returns The traditional score name.
   */
  nameOfScore(num: number): number | string {
    const ScoreNames: { [key: number]: number | string } = {
      0: 0,
      1: 15,
      2: 30,
      3: 40,
    };
    return ScoreNames[num];
  }

  /**
   * Records a point for a player in the current game.
   * @param winner The player who won the point.
   * @param how The way the point was won.
   * @param fault The number of faults on the serve.
   * @returns 1 if the point was scored, 0 if the game was already won.
   */
  scorePoint(
    winner: PlayerNum,
    how: PointOutcomes = PointOutcomes.REGULAR,
    fault: number = 0
  ): number {
    if (this.winner) return 0;
    const pointObject = new Point(winner, how, fault);
    this.iscore[winner]++;
    this.points.push(pointObject);
    this.updateGame();
    return 1;
  }

  /**
   * Removes the last scored point from the game.
   */
  removePoint(): void {
    if (this.points.length === 0) return;
    const lp = this.points.pop()!;
    this.iscore[lp.winner]--;
    this.updateGame();
  }

  /**
   * Updates the game's score and determines the winner if applicable.
   * This is called internally after a point is scored or removed.
   */
  updateGame(): void {
    let leader: PlayerNum = 1;
    let loser: PlayerNum = 2;
    this.winner = 0;
    if (this.iscore[2] > this.iscore[1]) {
      leader = 2;
      loser = 1;
    }

    if (this.iscore[leader] === 3 && this.iscore[loser] === 3) {
      this.score[leader] = "DEUCE";
      this.score[loser] = "DEUCE";
      return;
    }

    if (this.iscore[leader] >= 4) {
      this.score[leader] = "-";
      this.score[loser] = "-";
      if (this.iscore[leader] - this.iscore[loser] > 1) {
        this.winner = leader;
      } else if (this.iscore[leader] === this.iscore[loser]) {
        this.score[leader] = "DEUCE";
        this.score[loser] = "DEUCE";
      } else {
        this.score[leader] = leader === this.server ? "AD IN" : "AD OUT";
      }
    } else {
      this.score[leader] = this.nameOfScore(this.iscore[leader]);
      this.score[loser] = this.nameOfScore(this.iscore[loser]);
    }
  }

  /**
   * Creates a Game instance from a plain JSON object.
   * @param data The plain object.
   * @returns A Game instance.
   */
  static fromJSON(data: any): Game {
    const game = new Game(data.server);
    Object.assign(game, data);
    game.points = data.points.map((p: any) => Point.fromJSON(p));
    return game;
  }
}
