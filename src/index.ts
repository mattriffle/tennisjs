// Legacy exports (keeping for backward compatibility)
export { LegacyTennisMatch } from "./LegacyTennisMatch.js";
export { Point } from "./Point.js";
export { Game } from "./Game.js";
export { Set } from "./Set.js";
export { TieBreak } from "./TieBreak.js";
export { PointOutcomes } from "./types.js";
export type {
  PlayerNum,
  TeamNum,
  PlayerPosition,
  MatchType,
  Player,
  Team,
  PlayerIdentifier,
  ScoreObj,
  NumericScoreObj,
  DoublesPlayerStats,
  MatchSummary,
  SimpleScore,
} from "./types.js";

// New unified model exports (recommended)
export { TennisMatch } from "./TennisMatch.js";
export {
  createMatchParticipants,
  createSinglesPlayer,
  createDoublesTeam,
  getPlayerIds,
  getDisplayName,
  getAbbreviatedName,
} from "./participant-factory.js";
export {
  StatisticsManager,
  createEmptyStats,
  createEmptyTeamStats,
  updateStats,
  updateTeamStats,
  aggregateStats,
  calculatePercentages,
} from "./statistics-aggregator.js";
export { LegacyAdapter } from "./legacy-adapter.js";
export {
  PointOutcome,
  isSinglesPlayer,
  isDoublesTeam,
  isTeamStatistics,
} from "./unified-types.js";
export type {
  // Core types
  Participant,
  SinglesPlayer,
  DoublesTeam,
  TeamPlayer,
  AnyParticipant,
  ParticipantPosition,
  TeamPlayerPosition,

  // Match types
  MatchConfig,
  MatchFormat,
  MatchScore,
  PointScore,
  ServingInfo,
  UnifiedMatchSummary,

  // Statistics types
  ParticipantStatistics,
  TeamStatistics,

  // Summary types
  PointSummary,
  GameSummary,
  SetSummary,
  TiebreakSummary,

  // Configuration types
  SinglesPlayerConfig,
  DoublesTeamConfig,
} from "./unified-types.js";
