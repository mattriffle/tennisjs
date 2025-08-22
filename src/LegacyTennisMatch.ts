import {
  PlayerNum,
  TeamNum,
  PointOutcomes,
  NumericScoreObj,
  MatchSummary,
  SimpleScore,
  MatchType,
  Player,
  Team,
  PlayerIdentifier,
  DoublesPlayerStats,
  PlayerPosition,
} from "./types.js";
import { Point } from "./Point.js";
import { Game } from "./Game.js";
import { TieBreak } from "./TieBreak.js";
import { Set } from "./Set.js";

/**
 * The main class for managing a tennis match.
 */
export class LegacyTennisMatch {
  // Singles properties
  player?: { 1: string; 2: string };

  // Doubles properties
  matchType: MatchType;
  teams?: { 1: Team; 2: Team };
  servingRotation?: Player[];
  currentServerIndex?: number;

  // Common properties
  numSets: number;
  score: NumericScoreObj;
  set: Set;
  sets: Set[];
  winner?: PlayerNum | TeamNum;
  saveCallback: ((match: LegacyTennisMatch) => void) | null;

  /**
   * Creates a new tennis match.
   * @param player1OrTeam1 The name of player 1 or team 1 players.
   * @param player2OrTeam2 The name of player 2 or team 2 players.
   * @param numSets The total number of sets to be played (must be an odd number, e.g., 3 or 5).
   * @param saveCallback An optional callback function to persist the match state. Defaults to using localStorage if available.
   */
  constructor(
    player1OrTeam1: string | [string, string],
    player2OrTeam2: string | [string, string],
    numSets: number,
    saveCallback?: (match: LegacyTennisMatch) => void
  ) {
    if (numSets % 2 === 0) throw new Error("Number of sets must be odd.");

    this.numSets = numSets;
    this.score = { 1: 0, 2: 0 };
    this.sets = [];

    // Detect match type based on input
    if (
      typeof player1OrTeam1 === "string" &&
      typeof player2OrTeam2 === "string"
    ) {
      // Singles match
      this.matchType = "singles";
      this.player = { 1: player1OrTeam1, 2: player2OrTeam2 };
      this.set = new Set(1); // Player 1 starts serving by default
    } else if (Array.isArray(player1OrTeam1) && Array.isArray(player2OrTeam2)) {
      // Doubles match
      this.matchType = "doubles";
      this.teams = {
        1: {
          players: [
            { name: player1OrTeam1[0], position: "A", team: 1 },
            { name: player1OrTeam1[1], position: "B", team: 1 },
          ],
          teamNum: 1,
        },
        2: {
          players: [
            { name: player2OrTeam2[0], position: "A", team: 2 },
            { name: player2OrTeam2[1], position: "B", team: 2 },
          ],
          teamNum: 2,
        },
      };
      // Initialize serving rotation: T1A → T2A → T1B → T2B
      this.servingRotation = [
        this.teams[1].players[0],
        this.teams[2].players[0],
        this.teams[1].players[1],
        this.teams[2].players[1],
      ];
      this.currentServerIndex = 0;
      this.set = new Set(this.servingRotation[0], this.servingRotation);
    } else {
      throw new Error("Invalid player/team configuration");
    }

    if (saveCallback) {
      this.saveCallback = saveCallback;
    } else if (typeof localStorage !== "undefined") {
      this.saveCallback = (match) => {
        const replacer = (key: string, value: any) => {
          if (key === "saveCallback") return undefined;
          return value;
        };
        localStorage.setItem("tennisMatch", JSON.stringify(match, replacer));
      };
    } else {
      this.saveCallback = null;
    }
  }

  /**
   * Scores a point for a player/team in the match.
   * @param winner The player/team who won the point.
   * @param how The way the point was won (e.g., ACE, WINNER).
   * @param fault The number of faults on the serve.
   * @param scoringPlayer The specific player who scored (for doubles).
   */
  scorePoint(
    winner: PlayerNum | TeamNum,
    how: PointOutcomes = PointOutcomes.REGULAR,
    fault: number = 0,
    scoringPlayer?: PlayerIdentifier
  ): void {
    if (this.winner) return;

    if (this.matchType === "doubles" && scoringPlayer) {
      // Track individual player stats for doubles
      this.set.scorePoint(winner, how, fault, scoringPlayer);
    } else {
      // Singles match or team-level scoring
      this.set.scorePoint(winner, how, fault);
    }

    this.updateMatch();
    this.save();
  }

  /**
   * Alternative method for scoring in doubles with explicit player tracking.
   * @param winningTeam The team that won the point.
   * @param scoringPlayer The position of the player who scored.
   * @param how The way the point was won.
   * @param fault The number of faults on the serve.
   */
  scorePointDoubles(
    winningTeam: TeamNum,
    scoringPlayer: PlayerPosition,
    how: PointOutcomes = PointOutcomes.REGULAR,
    fault: number = 0
  ): void {
    if (this.matchType !== "doubles") {
      throw new Error("scorePointDoubles can only be used in doubles matches");
    }
    this.scorePoint(winningTeam, how, fault, {
      team: winningTeam,
      position: scoringPlayer,
    });
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
    if (this.sets.length > 0 && this.sets[this.sets.length - 1] === this.set) {
      return;
    }

    this.score[this.set.winner as PlayerNum]++;

    const toServe = this.set.nextServer!;
    this.sets.push(this.set);

    // Create new set with proper serving rotation for doubles
    if (this.matchType === "doubles" && this.servingRotation) {
      // In doubles, alternate which team starts serving each set
      // Find the next server in rotation
      const currentServer = toServe as Player;
      const serverIndex = this.servingRotation.findIndex(
        (p) =>
          p.team === currentServer.team && p.position === currentServer.position
      );
      this.currentServerIndex = serverIndex;
      this.set = new Set(toServe, this.servingRotation);
    } else {
      this.set = new Set(toServe as PlayerNum);
    }

    const leader: PlayerNum | TeamNum = this.score[1] > this.score[2] ? 1 : 2;
    if (this.score[leader as PlayerNum] > Math.floor(this.numSets / 2)) {
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
    saveCallback?: (match: LegacyTennisMatch) => void
  ): LegacyTennisMatch {
    let match: LegacyTennisMatch;

    // Handle version migration
    if (!data.matchType) {
      // Old format - assume singles
      data.matchType = "singles";
    }

    if (data.matchType === "singles") {
      match = new LegacyTennisMatch(
        data.player[1],
        data.player[2],
        data.numSets,
        saveCallback
      );
    } else {
      // Doubles match
      const team1Names = data.teams[1].players.map((p: Player) => p.name);
      const team2Names = data.teams[2].players.map((p: Player) => p.name);
      match = new LegacyTennisMatch(
        team1Names as [string, string],
        team2Names as [string, string],
        data.numSets,
        saveCallback
      );
      match.currentServerIndex = data.currentServerIndex;
    }

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
    saveCallback?: (match: LegacyTennisMatch) => void
  ): LegacyTennisMatch | null {
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
    return LegacyTennisMatch.fromJSON(plainMatch, saveCallback);
  }

  /**
   * Generates a string representation of the match score.
   * @param server The player/team whose perspective the score should be from.
   * @returns A comma-separated string of set scores.
   */
  matchScore(server: PlayerNum | Player): string {
    let serverNum: PlayerNum;
    let receiverNum: PlayerNum;

    if (typeof server === "number") {
      serverNum = server;
      receiverNum = server === 1 ? 2 : 1;
    } else {
      // Doubles - use team numbers
      serverNum = server.team;
      receiverNum = server.team === 1 ? 2 : 1;
    }
    const score: string[] = [];

    this.sets.forEach((theSet) => {
      let sc = `${theSet.score[serverNum]}-${theSet.score[receiverNum]}`;
      if (theSet.tiebreak && theSet.winner) {
        // Only show tiebreak score if set is complete
        sc += `(${theSet.tiebreak.score[1] > theSet.tiebreak.score[2] ? theSet.tiebreak.score[2] : theSet.tiebreak.score[1]})`;
      }
      score.push(sc);
    });

    if (!this.winner) {
      score.push(`${this.set.score[serverNum]}-${this.set.score[receiverNum]}`);
    }

    return score.join(", ");
  }

  /**
   * Gets the current server for the match.
   * @returns The current server (PlayerNum for singles, Player for doubles).
   */
  getCurrentServer(): PlayerNum | Player {
    if (this.matchType === "singles") {
      if (this.set.tiebreak) {
        return this.set.tiebreak.server as PlayerNum;
      }
      return this.set.game.server as PlayerNum;
    } else {
      if (this.set.tiebreak) {
        return this.set.tiebreak.server as Player;
      }
      return this.set.game.server as Player;
    }
  }

  /**
   * Helper method to get individual player statistics for doubles.
   * @param team The team number.
   * @param position The player position.
   * @returns The player's statistics.
   */
  private getPlayerStats(
    team: TeamNum,
    position: PlayerPosition
  ): DoublesPlayerStats {
    const player = this.teams![team].players.find(
      (p) => p.position === position
    )!;
    const stats: DoublesPlayerStats = {
      team,
      position,
      name: player.name,
      stats: {
        pointsWon: 0,
        pointsPlayed: 0,
        servingStats: {
          aces: 0,
          doubleFaults: 0,
          serviceWinners: 0,
          firstServeIn: 0,
          firstServeTotal: 0,
          pointsWonOnServe: 0,
          serviceGamesPlayed: 0,
        },
        returningStats: {
          returnWinners: 0,
          returnErrors: 0,
          breakPointsWon: 0,
          breakPointsPlayed: 0,
        },
        rallyStats: {
          winners: 0,
          unforcedErrors: 0,
        },
      },
    };

    // Collect all points
    const allPoints: Point[] = [];
    for (const s of this.sets) {
      for (const g of s.games) {
        allPoints.push(...g.points);
      }
      if (s.tiebreak) {
        allPoints.push(...s.tiebreak.points);
      }
    }
    for (const g of this.set.games) {
      allPoints.push(...g.points);
    }
    if (this.set.tiebreak) {
      allPoints.push(...this.set.tiebreak.points);
    } else {
      allPoints.push(...this.set.game.points);
    }

    // Process points for this specific player
    for (const point of allPoints) {
      if (
        point.scoringPlayer &&
        typeof point.scoringPlayer === "object" &&
        point.scoringPlayer.team === team &&
        point.scoringPlayer.position === position
      ) {
        stats.stats.pointsPlayed++;
        if (point.winner === team) {
          stats.stats.pointsWon++;
        }

        // Track specific stats based on point outcome
        const server = point.server as Player;
        if (server && server.team === team && server.position === position) {
          // This player was serving
          if (point.how === PointOutcomes.ACE) {
            stats.stats.servingStats.aces++;
          } else if (point.how === PointOutcomes.DOUBLE_FAULT) {
            stats.stats.servingStats.doubleFaults++;
          } else if (point.how === PointOutcomes.SERVICE_WINNER) {
            stats.stats.servingStats.serviceWinners++;
          }
        } else {
          // This player was returning or in rally
          if (point.how === PointOutcomes.RETURN_WINNER) {
            stats.stats.returningStats.returnWinners++;
          } else if (point.how === PointOutcomes.WINNER) {
            stats.stats.rallyStats.winners++;
          } else if (point.how === PointOutcomes.UNFORCED_ERROR) {
            stats.stats.rallyStats.unforcedErrors++;
          }
        }
      }
    }

    return stats;
  }

  /**
   * Generates a detailed summary object of the current match state, including scores, server, and player statistics.
   * @returns A MatchSummary object.
   */
  matchSummary(): MatchSummary {
    if (this.matchType === "singles") {
      // Singles match summary
      let curObj: Game | TieBreak | null = this.set.game;
      if (this.set.tiebreak) {
        curObj = this.set.tiebreak;
      }

      // This can happen if a point is undone at the boundary of a tiebreak
      if (!curObj) {
        curObj = this.set.game;
      }

      const receiver: PlayerNum = (curObj.server as PlayerNum) === 1 ? 2 : 1;

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
          stats[point.winner as PlayerNum][key]++;
        }
      }

      const summary: MatchSummary = {
        meta: {
          type: this.set.tiebreak ? "Tiebreak" : "Game",
          matchType: "singles",
          tiebreakActive: !!this.set.tiebreak,
          server: curObj.server as PlayerNum,
          receiver,
          player: {
            1: this.player![1],
            2: this.player![2],
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
        summary.matchScore = this.matchScore(this.winner as PlayerNum);
      } else {
        summary.matchScore = this.matchScore(curObj.server as PlayerNum);
      }

      return summary;
    } else {
      // Doubles match summary
      const currentServer = this.getCurrentServer() as Player;

      const summary: MatchSummary = {
        meta: {
          type: this.set.tiebreak ? "Tiebreak" : "Game",
          matchType: "doubles",
          tiebreakActive: !!this.set.tiebreak,
          currentServer,
          teams: this.teams,
          servingRotation: this.servingRotation,
          numSets: this.numSets,
        },
        team1: {
          sets: this.score[1],
          games: this.set.score[1],
          points: this.set.tiebreak
            ? this.set.tiebreak.score[1]
            : this.set.game.score[1],
          players: {
            A: this.getPlayerStats(1, "A"),
            B: this.getPlayerStats(1, "B"),
          },
        },
        team2: {
          sets: this.score[2],
          games: this.set.score[2],
          points: this.set.tiebreak
            ? this.set.tiebreak.score[2]
            : this.set.game.score[2],
          players: {
            A: this.getPlayerStats(2, "A"),
            B: this.getPlayerStats(2, "B"),
          },
        },
        matchScore: "",
      };

      if (this.winner) {
        summary.winner = this.winner;
        summary.matchScore = this.matchScore(currentServer);
      } else {
        summary.matchScore = this.matchScore(currentServer);
      }

      return summary;
    }
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

    if (this.matchType === "singles") {
      return {
        matchType: "singles",
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
    } else {
      return {
        matchType: "doubles",
        team1: {
          sets: this.score[1],
          games: this.set.score[1],
          points: this.set.tiebreak
            ? this.set.tiebreak.score[1]
            : this.set.game.score[1],
        },
        team2: {
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
}
