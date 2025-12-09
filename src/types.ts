/**
 * Unified type definitions for the tennis scoring system.
 * This module provides a consistent data model for both singles and doubles matches.
 */

// ============================================================================
// Core Participant Types
// ============================================================================

/**
 * Base participant interface for all match participants.
 */
export interface Participant {
  id: string;
  type: "player" | "team";
  name: string;
}

/**
 * Represents a singles player.
 */
export interface SinglesPlayer extends Participant {
  type: "player";
  position: 1 | 2;
}

/**
 * Represents an individual player within a doubles team.
 */
export interface TeamPlayer {
  id: string;
  name: string;
  position: "a" | "b";
}

/**
 * Represents a doubles team.
 */
export interface DoublesTeam extends Participant {
  type: "team";
  position: 1 | 2;
  players: {
    a: TeamPlayer;
    b: TeamPlayer;
  };
}

/**
 * Union type for any participant.
 */
export type AnyParticipant = SinglesPlayer | DoublesTeam;

// ============================================================================
// Scoring Types
// ============================================================================

/**
 * Represents the current match score.
 */
export interface MatchScore {
  participants: {
    1: AnyParticipant;
    2: AnyParticipant;
  };
  sets: [number, number];
  games: [number, number];
  points: PointScore;
  server: ServingInfo;
  winner?: 1 | 2;
}

/**
 * Represents the current point score in a game or tiebreak.
 */
export interface PointScore {
  values: [number | string, number | string];
  type: "game" | "tiebreak";
}

/**
 * Information about the current server and rotation.
 */
export interface ServingInfo {
  current: string;
  next?: string;
  rotation?: string[];
  index?: number;
}

// ============================================================================
// Point Outcome Types
// ============================================================================

/**
 * Standardized point outcomes.
 */
export enum PointOutcome {
  Ace = "ace",
  DoubleFault = "doubleFault",
  ServiceWinner = "serviceWinner",
  ReturnWinner = "returnWinner",
  Winner = "winner",
  UnforcedError = "unforcedError",
  ForcedError = "forcedError",
  Regular = "regular",
}

/**
 * Information about a rally.
 */
export interface RallyInfo {
  shots: number;
  duration?: number;
  endLocation?: "net" | "baseline" | "out";
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Comprehensive statistics for a participant.
 */
export interface ParticipantStatistics {
  // Overall stats
  pointsWon: number;
  pointsPlayed: number;

  // Serving stats
  serving: {
    aces: number;
    doubleFaults: number;
    serviceWinners: number;
    firstServeIn: number;
    firstServeTotal: number;
    secondServeIn: number;
    secondServeTotal: number;
    pointsWonOnFirstServe: number;
    pointsWonOnSecondServe: number;
    serviceGamesPlayed: number;
    serviceGamesWon: number;
    breakPointsSaved: number;
    breakPointsFaced: number;
  };

  // Return stats
  returning: {
    returnWinners: number;
    returnErrors: number;
    breakPointsWon: number;
    breakPointsPlayed: number;
    pointsWonOnReturn: number;
    returnGamesPlayed: number;
    firstServeReturnPointsWon: number;
    firstServeReturnPointsPlayed: number;
    secondServeReturnPointsWon: number;
    secondServeReturnPointsPlayed: number;
  };

  // Rally stats
  rally: {
    winners: number;
    unforcedErrors: number;
    forcedErrors: number;
    netPointsWon: number;
    netPointsPlayed: number;
    baselinePointsWon: number;
    baselinePointsPlayed: number;
  };
}

/**
 * Team statistics with individual player breakdowns.
 */
export interface TeamStatistics extends ParticipantStatistics {
  playerStats: {
    [playerId: string]: ParticipantStatistics;
  };
}

// ============================================================================
// Match Summary Types
// ============================================================================

/**
 * Match format configuration.
 */
export interface MatchFormat {
  sets: number;
  tiebreakAt: number;
  finalSetTiebreak: boolean;
  noAdScoring?: boolean;
  shortSets?: boolean;
}

/**
 * Match metadata.
 */
export interface MatchMeta {
  matchType: "singles" | "doubles" | "mixed-doubles";
  format: MatchFormat;
  status: "in-progress" | "completed" | "retired" | "walkover";
  duration?: number;
  surface?: "hard" | "clay" | "grass" | "indoor";
  tournament?: string;
  round?: string;
  date?: Date;
}

/**
 * Unified match summary.
 */
export interface UnifiedMatchSummary {
  meta: MatchMeta;
  score: MatchScore;
  participants: {
    1: {
      info: AnyParticipant;
      stats: ParticipantStatistics | TeamStatistics;
    };
    2: {
      info: AnyParticipant;
      stats: ParticipantStatistics | TeamStatistics;
    };
  };
  matchScore: string;
  currentSet: number;
  currentGame: number;
  setHistory: SetSummary[];
  currentSetGames: GameSummary[];
}

/**
 * Summary of a completed set.
 */
export interface SetSummary {
  winner: 1 | 2;
  score: [number, number];
  duration?: number;
  games: GameSummary[];
  tiebreak?: TiebreakSummary;
}

/**
 * Summary of a completed game.
 */
export interface GameSummary {
  winner: 1 | 2;
  server: string;
  score: [number | string, number | string];
  points: PointSummary[];
  breakPoint?: boolean;
  deuce?: boolean;
}

/**
 * Summary of a completed tiebreak.
 */
export interface TiebreakSummary {
  winner: 1 | 2;
  score: [number, number];
  points: PointSummary[];
  miniBreaks: number[];
}

/**
 * Summary of a single point.
 */
export interface PointSummary {
  winner: 1 | 2;
  outcome: PointOutcome;
  server: string;
  scorer?: string;
  fault?: number;
  rally?: RallyInfo;
  timestamp?: Date;
  score: [number | string, number | string];
}

// ============================================================================
// Match Configuration Types
// ============================================================================

/**
 * Configuration for creating a new match.
 */
export interface MatchConfig {
  matchType: "singles" | "doubles" | "mixed-doubles";
  participants: {
    1: SinglesPlayerConfig | DoublesTeamConfig;
    2: SinglesPlayerConfig | DoublesTeamConfig;
  };
  format: MatchFormat;
  firstServer?: 1 | 2 | "toss";
  surface?: "hard" | "clay" | "grass" | "indoor";
  tournament?: string;
  round?: string;
}

/**
 * Configuration for a singles player.
 */
export interface SinglesPlayerConfig {
  name: string;
  id?: string;
  ranking?: number;
  country?: string;
}

/**
 * Configuration for a doubles team.
 */
export interface DoublesTeamConfig {
  name?: string;
  id?: string;
  players: {
    a: SinglesPlayerConfig;
    b: SinglesPlayerConfig;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Participant position (1 or 2).
 */
export type ParticipantPosition = 1 | 2;

/**
 * Player position within a team (a or b).
 */
export type TeamPlayerPosition = "a" | "b";

/**
 * Match status.
 */
export type MatchStatus = "in-progress" | "completed" | "retired" | "walkover";

/**
 * Court surface type.
 */
export type CourtSurface = "hard" | "clay" | "grass" | "indoor";

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a participant is a singles player.
 */
export function isSinglesPlayer(
  participant: AnyParticipant
): participant is SinglesPlayer {
  return participant.type === "player";
}

/**
 * Type guard to check if a participant is a doubles team.
 */
export function isDoublesTeam(
  participant: AnyParticipant
): participant is DoublesTeam {
  return participant.type === "team";
}

/**
 * Type guard to check if statistics are team statistics.
 */
export function isTeamStatistics(
  stats: ParticipantStatistics | TeamStatistics
): stats is TeamStatistics {
  return "playerStats" in stats;
}

// ============================================================================
// Factory Function Types
// ============================================================================

/**
 * Factory function signatures for creating participants.
 */
export interface ParticipantFactory {
  createSinglesPlayer(
    config: SinglesPlayerConfig,
    position: ParticipantPosition
  ): SinglesPlayer;
  createDoublesTeam(
    config: DoublesTeamConfig,
    position: ParticipantPosition
  ): DoublesTeam;
}

/**
 * Factory function signatures for creating statistics.
 */
export interface StatisticsFactory {
  createEmpty(): ParticipantStatistics;
  createTeamStats(): TeamStatistics;
  aggregate(stats: ParticipantStatistics[]): ParticipantStatistics;
  mergeStats(
    base: ParticipantStatistics,
    update: Partial<ParticipantStatistics>
  ): ParticipantStatistics;
}

// ============================================================================
// Serialization Types
// ============================================================================

/**
 * Serialized match data for persistence and restoration.
 */
export interface SerializedMatch {
  config: MatchConfig;
  participants: { 1: AnyParticipant; 2: AnyParticipant };
  currentSet: number;
  currentGame: number;
  setHistory: SetSummary[];
  currentSetGames: GameSummary[];
  currentGamePoints: PointSummary[];
  tiebreak: boolean;
  matchWinner?: ParticipantPosition;
  servingRotation?: string[];
  currentServerId: string;
  setScores: [number, number];
  gameScores: [number, number];
  pointScores: [number | string, number | string];
  stats?: [string, ParticipantStatistics | TeamStatistics][];
}
