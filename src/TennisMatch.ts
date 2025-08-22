/**
 * Unified tennis match implementation using the new data model.
 */

import {
  UnifiedMatchSummary,
  MatchConfig,
  MatchFormat,
  AnyParticipant,
  PointOutcome,
  PointSummary,
  GameSummary,
  SetSummary,
  ParticipantPosition,
  isDoublesTeam,
  isSinglesPlayer,
  TeamPlayerPosition,
} from "./unified-types.js";
import {
  createMatchParticipants,
  getNextServer,
  createServingRotation,
  getPlayerIds,
} from "./participant-factory.js";
import {
  StatisticsManager,
  createEmptyStats,
  createEmptyTeamStats,
} from "./statistics-aggregator.js";
import { LegacyAdapter } from "./legacy-adapter.js";

/**
 * Main class for managing a tennis match with unified singles and doubles support.
 */
export class TennisMatch {
  private config: MatchConfig;
  private participants: { 1: AnyParticipant; 2: AnyParticipant };
  private statsManager: StatisticsManager;
  private currentSet: number;
  private currentGame: number;
  private setHistory: SetSummary[];
  private currentSetGames: GameSummary[];
  private currentGamePoints: PointSummary[];
  private tiebreak: boolean;
  private matchWinner?: ParticipantPosition;
  private servingRotation?: string[];
  private currentServerId: string;
  private setScores: [number, number];
  private gameScores: [number, number];
  private pointScores: [number | string, number | string];
  private saveCallback?: (match: TennisMatch) => void;

  constructor(
    player1OrTeam1: string | [string, string],
    player2OrTeam2: string | [string, string],
    numSets: number = 3,
    saveCallback?: (match: TennisMatch) => void
  ) {
    if (numSets % 2 === 0) {
      throw new Error("Number of sets must be odd");
    }

    // Create participants
    this.participants = createMatchParticipants(player1OrTeam1, player2OrTeam2);

    // Determine match type
    const matchType =
      this.participants[1].type === "player" ? "singles" : "doubles";

    // Initialize configuration
    this.config = {
      matchType,
      participants: {
        1: this.participants[1] as any,
        2: this.participants[2] as any,
      },
      format: {
        sets: numSets,
        tiebreakAt: 6,
        finalSetTiebreak: true,
      },
    };

    // Initialize statistics
    this.statsManager = new StatisticsManager();
    this.statsManager.initializeParticipants(this.participants);

    // Initialize match state
    this.currentSet = 1;
    this.currentGame = 1;
    this.setHistory = [];
    this.currentSetGames = [];
    this.currentGamePoints = [];
    this.tiebreak = false;
    this.setScores = [0, 0];
    this.gameScores = [0, 0];
    this.pointScores = [0, 0];

    // Initialize serving
    if (matchType === "doubles") {
      const team1 = this.participants[1] as any;
      const team2 = this.participants[2] as any;
      this.servingRotation = createServingRotation(
        team1,
        team2,
        { team: 1, player: "a" } // Default: Team 1 Player A serves first
      );
      this.currentServerId = this.servingRotation[0];
    } else {
      // Singles: Player 1 serves first by default
      this.currentServerId = this.participants[1].id;
    }

    this.saveCallback = saveCallback || this.defaultSaveCallback();
  }

  /**
   * Scores a point in the match.
   */
  scorePoint(
    winner: ParticipantPosition,
    outcome: PointOutcome = PointOutcome.Regular,
    scorerId?: string, // For doubles: ID of the specific player who scored
    isFirstServe: boolean = true
  ): void {
    if (this.matchWinner) {
      console.warn("Match is already complete");
      return;
    }

    const loser: ParticipantPosition = winner === 1 ? 2 : 1;
    const winnerId = this.participants[winner].id;
    const loserId = this.participants[loser].id;

    // Create point summary
    const point: PointSummary = {
      winner,
      outcome,
      server: this.currentServerId,
      scorer: scorerId,
      timestamp: new Date(),
    };

    // Update statistics
    this.statsManager.recordPoint(
      winnerId,
      loserId,
      outcome,
      this.currentServerId,
      scorerId,
      isFirstServe
    );

    // Add point to current game
    this.currentGamePoints.push(point);

    // Update point score
    this.updatePointScore(winner);

    // Check for game winner
    if (this.checkGameWinner()) {
      this.completeGame(winner);
    }

    // Save state
    this.save();
  }

  /**
   * Updates the point score within a game or tiebreak.
   */
  private updatePointScore(winner: ParticipantPosition): void {
    const loser: ParticipantPosition = winner === 1 ? 2 : 1;

    if (this.tiebreak) {
      // Tiebreak scoring - count the points from currentGamePoints
      const numericScores = this.getNumericPointScores();
      this.pointScores = numericScores;

      // Update server in tiebreak (changes every 2 points after first point)
      const totalPoints = numericScores[0] + numericScores[1];
      if (totalPoints === 1 || (totalPoints > 1 && totalPoints % 2 === 1)) {
        this.rotateServer();
      }
    } else {
      // Regular game scoring - count points from currentGamePoints and convert
      const numericScores = this.getNumericPointScores();
      this.pointScores = this.convertToTennisScore(numericScores);
    }
  }

  /**
   * Converts numeric scores to tennis scoring (0, 15, 30, 40, deuce, advantage).
   */
  private convertToTennisScore(
    scores: [number, number]
  ): [number | string, number | string] {
    const [p1Score, p2Score] = scores;

    // Both at 3+ points
    if (p1Score >= 3 && p2Score >= 3) {
      if (p1Score === p2Score) {
        return ["DEUCE", "DEUCE"];
      } else if (p1Score > p2Score) {
        const serverIs1 = this.getServerPosition() === 1;
        return [serverIs1 ? "AD IN" : "AD OUT", "-"];
      } else {
        const serverIs2 = this.getServerPosition() === 2;
        return ["-", serverIs2 ? "AD IN" : "AD OUT"];
      }
    }

    // Regular scoring
    const scoreMap: { [key: number]: number } = { 0: 0, 1: 15, 2: 30, 3: 40 };
    return [
      p1Score <= 3 ? scoreMap[p1Score] : 40,
      p2Score <= 3 ? scoreMap[p2Score] : 40,
    ];
  }

  /**
   * Checks if there's a game winner.
   */
  private checkGameWinner(): boolean {
    if (this.tiebreak) {
      const [p1Score, p2Score] = this.pointScores as [number, number];
      return (p1Score >= 7 || p2Score >= 7) && Math.abs(p1Score - p2Score) >= 2;
    } else {
      const scores = this.getNumericPointScores();
      const [p1Score, p2Score] = scores;
      return (p1Score >= 4 || p2Score >= 4) && Math.abs(p1Score - p2Score) >= 2;
    }
  }

  /**
   * Gets numeric point scores from current point scores.
   */
  private getNumericPointScores(): [number, number] {
    // Always count points in current game/tiebreak
    let p1Points = 0;
    let p2Points = 0;
    for (const point of this.currentGamePoints) {
      if (point.winner === 1) p1Points++;
      else p2Points++;
    }
    return [p1Points, p2Points];
  }

  /**
   * Completes the current game.
   */
  private completeGame(winner: ParticipantPosition): void {
    // Determine actual game winner based on who has more points
    const scores = this.getNumericPointScores();
    const actualWinner: ParticipantPosition = scores[0] > scores[1] ? 1 : 2;

    // Create game summary
    const game: GameSummary = {
      winner: actualWinner,
      server: this.currentServerId,
      score: [...this.pointScores] as [number | string, number | string],
      points: [...this.currentGamePoints],
      deuce: this.currentGamePoints.some((p, i) => {
        // Check if we had deuce at any point
        let p1Points = 0;
        let p2Points = 0;
        for (let j = 0; j <= i; j++) {
          if (this.currentGamePoints[j].winner === 1) p1Points++;
          else p2Points++;
        }
        return p1Points >= 3 && p2Points >= 3 && p1Points === p2Points;
      }),
    };

    // Add game to current set
    this.currentSetGames.push(game);

    // Update game score
    this.gameScores[actualWinner - 1]++;

    // Store tiebreak score before resetting
    const tiebreakScore = this.tiebreak
      ? ([...this.pointScores] as [number, number])
      : undefined;

    // Reset for next game
    this.currentGamePoints = [];
    this.pointScores = [0, 0];
    this.currentGame++;

    // Check for set winner
    if (this.checkSetWinner()) {
      const setWinner = this.gameScores[0] > this.gameScores[1] ? 1 : 2;
      this.completeSet(setWinner as ParticipantPosition, tiebreakScore);
    } else {
      // Check for tiebreak
      if (this.gameScores[0] === 6 && this.gameScores[1] === 6) {
        this.tiebreak = true;
        this.pointScores = [0, 0];
      } else {
        // Rotate server for next game
        if (!this.tiebreak) {
          this.rotateServer();
        }
      }
    }
  }

  /**
   * Checks if there's a set winner.
   */
  private checkSetWinner(): boolean {
    const [p1Games, p2Games] = this.gameScores;

    // Win by 2 games with at least 6 games
    if (p1Games >= 6 || p2Games >= 6) {
      const diff = Math.abs(p1Games - p2Games);
      if (diff >= 2) return true;

      // Tiebreak winner
      if (this.tiebreak && (p1Games === 7 || p2Games === 7)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Completes the current set.
   */
  private completeSet(
    winner: ParticipantPosition,
    tiebreakScore?: [number, number]
  ): void {
    // Create set summary
    const setSummary: SetSummary = {
      winner,
      score: [...this.gameScores] as [number, number],
      games: [...this.currentSetGames],
    };

    if (this.tiebreak && tiebreakScore) {
      setSummary.tiebreak = {
        winner,
        score: tiebreakScore,
        points: [...this.currentGamePoints],
        miniBreaks: [], // Could track mini-breaks if needed
      };
    }

    // Add set to history
    this.setHistory.push(setSummary);

    // Update set score
    this.setScores[winner - 1]++;

    // Check for match winner
    if (this.checkMatchWinner()) {
      this.matchWinner = winner;
    } else {
      // Reset for next set
      this.currentSet++;
      this.currentGame = 1;
      this.currentSetGames = [];
      this.currentGamePoints = [];
      this.gameScores = [0, 0];
      this.pointScores = [0, 0];
      this.tiebreak = false;

      // Alternate who serves first in new set
      this.rotateServer();
    }
  }

  /**
   * Checks if there's a match winner.
   */
  private checkMatchWinner(): boolean {
    const setsToWin = Math.ceil(this.config.format.sets / 2);
    return this.setScores[0] >= setsToWin || this.setScores[1] >= setsToWin;
  }

  /**
   * Rotates the server.
   */
  private rotateServer(): void {
    if (this.config.matchType === "singles") {
      // Singles: alternate between players
      this.currentServerId =
        this.currentServerId === this.participants[1].id
          ? this.participants[2].id
          : this.participants[1].id;
    } else if (this.servingRotation) {
      // Doubles: follow rotation
      this.currentServerId = getNextServer(
        this.servingRotation,
        this.currentServerId
      );
    }
  }

  /**
   * Gets the position of the current server.
   */
  private getServerPosition(): ParticipantPosition {
    if (this.currentServerId === this.participants[1].id) return 1;
    if (this.currentServerId === this.participants[2].id) return 2;

    // For doubles, check team members
    if (isDoublesTeam(this.participants[1])) {
      const team1 = this.participants[1];
      if (
        team1.players.a.id === this.currentServerId ||
        team1.players.b.id === this.currentServerId
      ) {
        return 1;
      }
    }

    return 2; // Default to team 2
  }

  /**
   * Removes the last point scored.
   */
  removePoint(): void {
    if (this.currentGamePoints.length === 0) {
      // Need to restore previous game
      if (this.currentSetGames.length > 0) {
        const lastGame = this.currentSetGames.pop()!;
        this.currentGamePoints = lastGame.points;
        this.gameScores[lastGame.winner - 1]--;
        this.currentGame--;

        // Restore point score from last point
        const lastPoint = this.currentGamePoints.pop();
        if (lastPoint) {
          // Recalculate point score
          this.recalculatePointScore();
        }
      } else if (this.setHistory.length > 0) {
        // Need to restore previous set
        const lastSet = this.setHistory.pop()!;
        this.currentSetGames = lastSet.games;
        this.setScores[lastSet.winner - 1]--;
        this.currentSet--;

        // Restore last game of previous set
        if (this.currentSetGames.length > 0) {
          this.removePoint(); // Recursive call to handle the game
        }
      }
    } else {
      // Remove last point from current game
      const lastPoint = this.currentGamePoints.pop()!;

      // Recalculate point score
      this.recalculatePointScore();

      // TODO: Update statistics (would need to implement removePoint in StatisticsManager)
    }

    // Clear match winner if set
    this.matchWinner = undefined;

    this.save();
  }

  /**
   * Recalculates point score based on current game points.
   */
  private recalculatePointScore(): void {
    if (this.tiebreak) {
      let p1Points = 0;
      let p2Points = 0;
      for (const point of this.currentGamePoints) {
        if (point.winner === 1) p1Points++;
        else p2Points++;
      }
      this.pointScores = [p1Points, p2Points];
    } else {
      const scores = [0, 0] as [number, number];
      for (const point of this.currentGamePoints) {
        scores[point.winner - 1]++;
      }
      this.pointScores = this.convertToTennisScore(scores) as [
        number | string,
        number | string,
      ];
    }
  }

  /**
   * Gets the current match summary.
   */
  getMatchSummary(): UnifiedMatchSummary {
    return {
      meta: {
        ...this.config.format,
        matchType: this.config.matchType,
        format: this.config.format,
        status: this.matchWinner ? "completed" : "in-progress",
      },
      score: {
        participants: this.participants,
        sets: this.setScores,
        games: this.gameScores,
        points: {
          values: this.pointScores,
          type: this.tiebreak ? "tiebreak" : "game",
        },
        server: {
          current: this.currentServerId,
          rotation: this.servingRotation,
        },
        winner: this.matchWinner,
      },
      participants: {
        1: {
          info: this.participants[1],
          stats:
            this.statsManager.getStats(this.participants[1].id) ||
            createEmptyStats(),
        },
        2: {
          info: this.participants[2],
          stats:
            this.statsManager.getStats(this.participants[2].id) ||
            createEmptyStats(),
        },
      },
      matchScore: this.getMatchScoreString(),
      currentSet: this.currentSet,
      currentGame: this.currentGame,
      setHistory: this.setHistory,
    };
  }

  /**
   * Gets the match score as a string.
   */
  getMatchScoreString(): string {
    const scores: string[] = [];

    for (const set of this.setHistory) {
      let setScore = `${set.score[0]}-${set.score[1]}`;
      if (set.tiebreak) {
        const loserScore =
          set.tiebreak.winner === 1
            ? set.tiebreak.score[1]
            : set.tiebreak.score[0];
        setScore += `(${loserScore})`;
      }
      scores.push(setScore);
    }

    // Add current set if not complete
    if (!this.matchWinner) {
      scores.push(`${this.gameScores[0]}-${this.gameScores[1]}`);
    }

    return scores.join(", ");
  }

  /**
   * Gets a simple score object (for backward compatibility).
   */
  getScore(): any {
    const summary = this.getMatchSummary();
    return LegacyAdapter.toLegacyScore(summary);
  }

  /**
   * Gets legacy match summary (for backward compatibility).
   */
  matchSummary(): any {
    const summary = this.getMatchSummary();
    return LegacyAdapter.autoConvert(summary);
  }

  /**
   * Saves the match state.
   */
  private save(): void {
    if (this.saveCallback) {
      this.saveCallback(this);
    }
  }

  /**
   * Default save callback using localStorage.
   */
  private defaultSaveCallback(): ((match: TennisMatch) => void) | undefined {
    if (typeof localStorage !== "undefined") {
      return (match) => {
        const data = match.toJSON();
        localStorage.setItem("unifiedTennisMatch", JSON.stringify(data));
      };
    }
    return undefined;
  }

  /**
   * Converts match to JSON for serialization.
   */
  toJSON(): any {
    return {
      config: this.config,
      participants: this.participants,
      currentSet: this.currentSet,
      currentGame: this.currentGame,
      setHistory: this.setHistory,
      currentSetGames: this.currentSetGames,
      currentGamePoints: this.currentGamePoints,
      tiebreak: this.tiebreak,
      matchWinner: this.matchWinner,
      servingRotation: this.servingRotation,
      currentServerId: this.currentServerId,
      setScores: this.setScores,
      gameScores: this.gameScores,
      pointScores: this.pointScores,
      stats: Array.from(this.statsManager.getAllStats().entries()),
    };
  }

  /**
   * Creates a match from JSON data.
   */
  static fromJSON(
    data: any,
    saveCallback?: (match: TennisMatch) => void
  ): TennisMatch {
    // Create match with basic config
    const match = new TennisMatch(
      data.participants[1].name,
      data.participants[2].name,
      data.config.format.sets,
      saveCallback
    );

    // Restore state
    match.config = data.config;
    match.participants = data.participants;
    match.currentSet = data.currentSet;
    match.currentGame = data.currentGame;
    match.setHistory = data.setHistory;
    match.currentSetGames = data.currentSetGames;
    match.currentGamePoints = data.currentGamePoints;
    match.tiebreak = data.tiebreak;
    match.matchWinner = data.matchWinner;
    match.servingRotation = data.servingRotation;
    match.currentServerId = data.currentServerId;
    match.setScores = data.setScores;
    match.gameScores = data.gameScores;
    match.pointScores = data.pointScores;

    // Restore statistics
    if (data.stats) {
      const statsMap = new Map(data.stats);
      // Would need to implement a restore method in StatisticsManager
    }

    return match;
  }

  /**
   * Loads a match from storage.
   */
  static load(
    loader?: () => string | null,
    saveCallback?: (match: TennisMatch) => void
  ): TennisMatch | null {
    let savedData: string | null;

    if (loader) {
      savedData = loader();
    } else if (typeof localStorage !== "undefined") {
      savedData = localStorage.getItem("unifiedTennisMatch");
    } else {
      return null;
    }

    if (!savedData) {
      return null;
    }

    const data = JSON.parse(savedData);
    return TennisMatch.fromJSON(data, saveCallback);
  }
}
