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
  ParticipantStatistics,
  TeamStatistics,
  SerializedMatch,
  SinglesPlayerConfig,
  DoublesTeamConfig,
  DoublesTeam,
} from "./types.js";
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

/**
 * Main class for managing a tennis match with unified singles and doubles support.
 *
 * Provides complete match state management including scoring, statistics tracking,
 * undo/redo operations, and serialization. Supports both singles and doubles matches.
 *
 * @example
 * ```typescript
 * // Singles match
 * const singles = new TennisMatch("Roger Federer", "Rafael Nadal", 3);
 * singles.scorePoint(1, PointOutcome.Ace);
 *
 * // Doubles match
 * const doubles = new TennisMatch(
 *   ["Bob Bryan", "Mike Bryan"],
 *   ["John Peers", "Henri Kontinen"],
 *   3
 * );
 * ```
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

  /**
   * Creates a new tennis match.
   *
   * @param player1OrTeam1 - Player 1 name (singles) or [Player A, Player B] names (doubles)
   * @param player2OrTeam2 - Player 2 name (singles) or [Player A, Player B] names (doubles)
   * @param numSets - Number of sets to play (must be odd, default: 3)
   * @param saveCallback - Optional callback for auto-saving match state
   * @throws Error if numSets is even
   *
   * @example
   * ```typescript
   * const match = new TennisMatch("Player 1", "Player 2", 5);
   * ```
   */
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
        1: this.participants[1] as unknown as
          | SinglesPlayerConfig
          | DoublesTeamConfig,
        2: this.participants[2] as unknown as
          | SinglesPlayerConfig
          | DoublesTeamConfig,
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
      const team1 = this.participants[1] as DoublesTeam;
      const team2 = this.participants[2] as DoublesTeam;
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
   *
   * Updates the score, statistics, and checks for game/set/match completion.
   * Automatically saves match state after scoring.
   *
   * @param winner - Position of the winning participant (1 or 2)
   * @param outcome - Type of point outcome (default: Regular)
   * @param scorerId - For doubles: ID of the specific player who scored the point
   * @param isFirstServe - Whether this point was on first serve (default: true)
   *
   * @example
   * ```typescript
   * match.scorePoint(1, PointOutcome.Ace);
   * match.scorePoint(2, PointOutcome.Winner);
   * ```
   */
  scorePoint(
    winner: ParticipantPosition,
    outcome: PointOutcome = PointOutcome.Regular,
    scorerId?: string,
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
      score: [0, 0], // Placeholder, will be updated below
    };

    // Check for break point opportunity BEFORE recording the point
    const isBP = this.checkBreakPoint();

    // Update statistics
    this.statsManager.recordPoint(
      winnerId,
      loserId,
      outcome,
      this.currentServerId,
      scorerId,
      isFirstServe
    );

    if (isBP) {
      const serverPos = this.getServerPosition();
      const receiverPos = serverPos === 1 ? 2 : 1;
      this.statsManager.recordBreakPoint(
        this.currentServerId,
        this.participants[receiverPos as ParticipantPosition].id,
        outcome,
        winnerId
      );
    }

    // Add point to current game
    this.currentGamePoints.push(point);

    // Update point score
    this.updatePointScore(winner);

    // Update point summary with the new score
    point.score = [...this.pointScores] as [number | string, number | string];

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
    // Record service game stats
    const serverWon = winner === this.getServerPosition();
    this.statsManager.recordServiceGame(this.currentServerId, serverWon);

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
      }

      // Rotate server for next game
      this.rotateServer();
    }
  }

  /**
   * Checks if the current state (before point scored) is a break point.
   */
  private checkBreakPoint(): boolean {
    if (this.tiebreak) return false;

    const scores = this.getNumericPointScores(); // [p1, p2]
    const serverPos = this.getServerPosition();
    const serverIndex = serverPos - 1;
    const receiverIndex = serverPos === 1 ? 1 : 0;

    const serverScore = scores[serverIndex];
    const receiverScore = scores[receiverIndex];

    // Check if receiver winning next point wins the game
    // Condition 1: Receiver is at 40 (3) and Server < 30 (2) ? No, Sever could be 30 (2).
    // If Receiver=3, Server=0,1,2 -> Next point Receiver=4 -> Win. (Diff >= 2)
    if (receiverScore === 3 && serverScore < 3) return true;

    // Condition 2: Advantage Receiver
    // If Receiver > 3 and Receiver > Server -> Advantage. Next point -> Win.
    if (receiverScore >= 3 && receiverScore > serverScore) return true;

    // Note: If 3-3 (Deuce), next point is Advantage, not Game. So not BP.

    return false;
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
    }

    // Reset for next set

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
   * Removes the last point scored, undoing the most recent score change.
   *
   * Handles undoing across game and set boundaries, restoring previous state.
   * Statistics are not currently restored when undoing points.
   *
   * @example
   * ```typescript
   * match.scorePoint(1);  // 15-0
   * match.removePoint();  // Back to 0-0
   * ```
   */
  removePoint(): void {
    if (this.currentGamePoints.length === 0) {
      // Need to restore previous game
      if (this.currentSetGames.length > 0) {
        const lastGame = this.currentSetGames.pop()!;
        this.currentGamePoints = lastGame.points;
        this.gameScores[lastGame.winner - 1]--;
        this.currentGame--;

        // Restore server
        this.currentServerId = lastGame.server;

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

        // Restore game scores
        this.gameScores = [...lastSet.score] as [number, number];

        // Restore current game number
        this.currentGame = this.currentSetGames.length + 1;

        // Restore tiebreak status
        if (lastSet.tiebreak) {
          this.tiebreak = true;
        }

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
   * Gets the current match summary with all state information.
   *
   * Returns a comprehensive snapshot of the match including scores,
   * statistics, set history, and serving information.
   *
   * @returns Complete match summary object
   *
   * @example
   * ```typescript
   * const summary = match.getMatchSummary();
   * console.log(summary.score.sets);     // [1, 0]
   * console.log(summary.matchScore);     // "6-4"
   * console.log(summary.meta.status);    // "in-progress"
   * ```
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
      currentSetGames: this.currentSetGames,
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
   * Converts match state to JSON for serialization.
   *
   * Includes all match state necessary for full restoration.
   *
   * @returns JSON-serializable object containing complete match state
   *
   * @example
   * ```typescript
   * const data = match.toJSON();
   * localStorage.setItem('match', JSON.stringify(data));
   * ```
   */
  toJSON(): SerializedMatch {
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
   * Creates a match instance from previously serialized JSON data.
   *
   * Restores complete match state including scores, statistics, and history.
   *
   * @param data - JSON data from toJSON()
   * @param saveCallback - Optional callback for auto-saving match state
   * @returns Restored TennisMatch instance
   *
   * @example
   * ```typescript
   * const data = JSON.parse(localStorage.getItem('match'));
   * const match = TennisMatch.fromJSON(data);
   * ```
   */
  static fromJSON(
    data: SerializedMatch,
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
      const statsMap = new Map(data.stats) as Map<
        string,
        ParticipantStatistics | TeamStatistics
      >;
      match.statsManager.restore(statsMap);
    }

    return match;
  }

  /**
   * Loads a match from storage.
   *
   * Uses provided loader function or defaults to localStorage.
   * Returns null if no saved match exists.
   *
   * @param loader - Optional function to retrieve saved data
   * @param saveCallback - Optional callback for auto-saving match state
   * @returns Loaded TennisMatch or null if not found
   *
   * @example
   * ```typescript
   * const match = TennisMatch.load();
   * if (match) {
   *   console.log('Resumed match:', match.getMatchSummary().matchScore);
   * }
   * ```
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
