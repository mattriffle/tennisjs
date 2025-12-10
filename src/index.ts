// TennisMatch - Main class for managing tennis matches
export { TennisMatch } from "./TennisMatch.js";

// Participant factory utilities
export {
  createMatchParticipants,
  createSinglesPlayer,
  createDoublesTeam,
  getPlayerIds,
  getDisplayName,
  getAbbreviatedName,
} from "./participant-factory.js";

// Statistics utilities
export {
  StatisticsManager,
  createEmptyStats,
  createEmptyTeamStats,
  updateStats,
  updateTeamStats,
  aggregateStats,
  calculatePercentages,
} from "./statistics-aggregator.js";

// Type guards and enums
export {
  PointOutcome,
  isSinglesPlayer,
  isDoublesTeam,
  isTeamStatistics,
} from "./types.js";

// Type exports
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

  // Serialization types
  SerializedMatch,
} from "./types.js";
