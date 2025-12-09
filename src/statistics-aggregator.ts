/**
 * Statistics aggregation and management for the unified tennis scoring system.
 */

import {
  ParticipantStatistics,
  TeamStatistics,
  StatisticsFactory,
  PointOutcome,
  AnyParticipant,
  isDoublesTeam,
  TeamPlayerPosition,
} from "./types.js";

/**
 * Creates an empty statistics object with all counters initialized to zero.
 *
 * @returns A new ParticipantStatistics object with serving, returning, and rally stats
 *
 * @example
 * ```typescript
 * const stats = createEmptyStats();
 * console.log(stats.serving.aces); // 0
 * ```
 */
export function createEmptyStats(): ParticipantStatistics {
  return {
    pointsWon: 0,
    pointsPlayed: 0,

    serving: {
      aces: 0,
      doubleFaults: 0,
      serviceWinners: 0,
      firstServeIn: 0,
      firstServeTotal: 0,
      secondServeIn: 0,
      secondServeTotal: 0,
      pointsWonOnFirstServe: 0,
      pointsWonOnSecondServe: 0,
      serviceGamesPlayed: 0,
      serviceGamesWon: 0,
      breakPointsSaved: 0,
      breakPointsFaced: 0,
    },

    returning: {
      returnWinners: 0,
      returnErrors: 0,
      breakPointsWon: 0,
      breakPointsPlayed: 0,
      pointsWonOnReturn: 0,
      returnGamesPlayed: 0,
      firstServeReturnPointsWon: 0,
      firstServeReturnPointsPlayed: 0,
      secondServeReturnPointsWon: 0,
      secondServeReturnPointsPlayed: 0,
    },

    rally: {
      winners: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
      netPointsWon: 0,
      netPointsPlayed: 0,
      baselinePointsWon: 0,
      baselinePointsPlayed: 0,
    },
  };
}

/**
 * Creates empty team statistics with aggregate and per-player tracking.
 *
 * @returns A new TeamStatistics object extending ParticipantStatistics with playerStats map
 *
 * @example
 * ```typescript
 * const teamStats = createEmptyTeamStats();
 * teamStats.playerStats['player-1'] = createEmptyStats();
 * ```
 */
export function createEmptyTeamStats(): TeamStatistics {
  return {
    ...createEmptyStats(),
    playerStats: {},
  };
}

/**
 * Updates statistics based on a point outcome.
 *
 * Handles all point types including aces, double faults, winners, and errors.
 * Returns a new statistics object without mutating the input.
 *
 * @param stats - Current statistics to update
 * @param outcome - Type of point outcome (Ace, Winner, DoubleFault, etc.)
 * @param won - Whether this participant won the point
 * @param isServing - Whether this participant was serving
 * @param isFirstServe - Whether this was a first serve (optional)
 * @returns Updated statistics object
 *
 * @example
 * ```typescript
 * const updated = updateStats(stats, PointOutcome.Ace, true, true, true);
 * console.log(updated.serving.aces); // stats.serving.aces + 1
 * ```
 */
export function updateStats(
  stats: ParticipantStatistics,
  outcome: PointOutcome,
  won: boolean,
  isServing: boolean,
  isFirstServe?: boolean
): ParticipantStatistics {
  const updated = deepClone(stats);

  // Update overall stats
  updated.pointsPlayed++;
  if (won) {
    updated.pointsWon++;
  }

  // Update based on serve status
  if (isServing) {
    // Serving statistics
    switch (outcome) {
      case PointOutcome.Ace:
        updated.serving.aces++;
        updated.serving.firstServeIn++;
        updated.serving.firstServeTotal++;
        updated.serving.pointsWonOnFirstServe++;
        break;

      case PointOutcome.DoubleFault:
        updated.serving.doubleFaults++;
        updated.serving.secondServeTotal++;
        break;

      case PointOutcome.ServiceWinner:
        updated.serving.serviceWinners++;
        if (isFirstServe) {
          updated.serving.firstServeIn++;
          updated.serving.firstServeTotal++;
          updated.serving.pointsWonOnFirstServe++;
        } else {
          updated.serving.secondServeIn++;
          updated.serving.secondServeTotal++;
          updated.serving.pointsWonOnSecondServe++;
        }
        break;

      default:
        // Regular point on serve
        if (isFirstServe !== undefined) {
          if (isFirstServe) {
            updated.serving.firstServeTotal++;
            if (won) {
              updated.serving.firstServeIn++;
              updated.serving.pointsWonOnFirstServe++;
            }
          } else {
            updated.serving.secondServeTotal++;
            if (won) {
              updated.serving.secondServeIn++;
              updated.serving.pointsWonOnSecondServe++;
            }
          }
        }
    }
  } else {
    // Returning statistics
    switch (outcome) {
      case PointOutcome.ReturnWinner:
        updated.returning.returnWinners++;
        updated.returning.pointsWonOnReturn++;
        break;

      case PointOutcome.UnforcedError:
        if (!won) {
          updated.returning.returnErrors++;
        }
        break;

      default:
        if (won) {
          updated.returning.pointsWonOnReturn++;
        }
    }

    // Track return points by serve type
    if (isFirstServe !== undefined) {
      if (isFirstServe) {
        updated.returning.firstServeReturnPointsPlayed++;
        if (won) {
          updated.returning.firstServeReturnPointsWon++;
        }
      } else {
        updated.returning.secondServeReturnPointsPlayed++;
        if (won) {
          updated.returning.secondServeReturnPointsWon++;
        }
      }
    }
  }

  // Rally statistics (applicable to both serving and returning)
  switch (outcome) {
    case PointOutcome.Winner:
      if (won) {
        updated.rally.winners++;
      }
      break;

    case PointOutcome.UnforcedError:
      // Attribute unforced errors to the losing side only
      if (!won) {
        updated.rally.unforcedErrors++;
      }
      break;

    case PointOutcome.ForcedError:
      // Attribute forced errors to the winning side only
      if (won) {
        updated.rally.forcedErrors++;
      }
      break;
  }

  return updated;
}

/**
 * Updates team statistics with individual player contribution.
 *
 * Updates both the team aggregate stats and the specific player's stats.
 *
 * @param teamStats - Current team statistics
 * @param playerId - ID of the player who scored
 * @param outcome - Type of point outcome
 * @param won - Whether the team won the point
 * @param isServing - Whether the team was serving
 * @param isFirstServe - Whether this was a first serve
 * @returns Updated team statistics object
 */
export function updateTeamStats(
  teamStats: TeamStatistics,
  playerId: string,
  outcome: PointOutcome,
  won: boolean,
  isServing: boolean,
  isFirstServe?: boolean
): TeamStatistics {
  const updated = deepClone(teamStats) as TeamStatistics;

  // Update team aggregate stats
  const baseUpdate = updateStats(
    updated,
    outcome,
    won,
    isServing,
    isFirstServe
  );
  Object.assign(updated, baseUpdate);

  // Update individual player stats
  if (!updated.playerStats[playerId]) {
    updated.playerStats[playerId] = createEmptyStats();
  }

  updated.playerStats[playerId] = updateStats(
    updated.playerStats[playerId],
    outcome,
    won,
    isServing,
    isFirstServe
  );

  return updated;
}

/**
 * Aggregates multiple statistics objects into one combined total.
 *
 * Sums all serving, returning, and rally statistics across all inputs.
 *
 * @param stats - Array of statistics objects to aggregate
 * @returns Single combined statistics object
 */
export function aggregateStats(
  stats: ParticipantStatistics[]
): ParticipantStatistics {
  if (stats.length === 0) {
    return createEmptyStats();
  }

  const result = createEmptyStats();

  for (const stat of stats) {
    // Overall stats
    result.pointsWon += stat.pointsWon;
    result.pointsPlayed += stat.pointsPlayed;

    // Serving stats
    result.serving.aces += stat.serving.aces;
    result.serving.doubleFaults += stat.serving.doubleFaults;
    result.serving.serviceWinners += stat.serving.serviceWinners;
    result.serving.firstServeIn += stat.serving.firstServeIn;
    result.serving.firstServeTotal += stat.serving.firstServeTotal;
    result.serving.secondServeIn += stat.serving.secondServeIn;
    result.serving.secondServeTotal += stat.serving.secondServeTotal;
    result.serving.pointsWonOnFirstServe += stat.serving.pointsWonOnFirstServe;
    result.serving.pointsWonOnSecondServe +=
      stat.serving.pointsWonOnSecondServe;
    result.serving.serviceGamesPlayed += stat.serving.serviceGamesPlayed;
    result.serving.serviceGamesWon += stat.serving.serviceGamesWon;
    result.serving.breakPointsSaved += stat.serving.breakPointsSaved;
    result.serving.breakPointsFaced += stat.serving.breakPointsFaced;

    // Returning stats
    result.returning.returnWinners += stat.returning.returnWinners;
    result.returning.returnErrors += stat.returning.returnErrors;
    result.returning.breakPointsWon += stat.returning.breakPointsWon;
    result.returning.breakPointsPlayed += stat.returning.breakPointsPlayed;
    result.returning.pointsWonOnReturn += stat.returning.pointsWonOnReturn;
    result.returning.returnGamesPlayed += stat.returning.returnGamesPlayed;
    result.returning.firstServeReturnPointsWon +=
      stat.returning.firstServeReturnPointsWon;
    result.returning.firstServeReturnPointsPlayed +=
      stat.returning.firstServeReturnPointsPlayed;
    result.returning.secondServeReturnPointsWon +=
      stat.returning.secondServeReturnPointsWon;
    result.returning.secondServeReturnPointsPlayed +=
      stat.returning.secondServeReturnPointsPlayed;

    // Rally stats
    result.rally.winners += stat.rally.winners;
    result.rally.unforcedErrors += stat.rally.unforcedErrors;
    result.rally.forcedErrors += stat.rally.forcedErrors;
    result.rally.netPointsWon += stat.rally.netPointsWon;
    result.rally.netPointsPlayed += stat.rally.netPointsPlayed;
    result.rally.baselinePointsWon += stat.rally.baselinePointsWon;
    result.rally.baselinePointsPlayed += stat.rally.baselinePointsPlayed;
  }

  return result;
}

/**
 * Merges partial statistics into a base statistics object.
 *
 * Creates a deep copy of the base stats and applies the updates.
 * Useful for combining stats from different sources or applying specific overrides.
 *
 * @param base - The base statistics object to start from
 * @param update - Partial statistics to apply to the base
 * @returns A new ParticipantStatistics object with merged values
 */
export function mergeStats(
  base: ParticipantStatistics,
  update: Partial<ParticipantStatistics>
): ParticipantStatistics {
  const result = deepClone(base);

  if (update.pointsWon !== undefined) result.pointsWon = update.pointsWon;
  if (update.pointsPlayed !== undefined)
    result.pointsPlayed = update.pointsPlayed;

  if (update.serving) {
    Object.assign(result.serving, update.serving);
  }

  if (update.returning) {
    Object.assign(result.returning, update.returning);
  }

  if (update.rally) {
    Object.assign(result.rally, update.rally);
  }

  return result;
}

/**
 * Calculates percentage statistics from raw counts.
 *
 * Computes common tennis statistics like first serve %, break point save %, etc.
 * Returns 0 for any percentage where the denominator is zero.
 *
 * @param stats - Statistics object with raw counts
 * @returns Object with calculated percentage values
 */
export function calculatePercentages(stats: ParticipantStatistics): {
  winPercentage: number;
  firstServePercentage: number;
  firstServeWinPercentage: number;
  secondServeWinPercentage: number;
  breakPointSavePercentage: number;
  breakPointConversionPercentage: number;
  returnPointsWonPercentage: number;
} {
  return {
    winPercentage:
      stats.pointsPlayed > 0 ? (stats.pointsWon / stats.pointsPlayed) * 100 : 0,

    firstServePercentage:
      stats.serving.firstServeTotal > 0
        ? (stats.serving.firstServeIn / stats.serving.firstServeTotal) * 100
        : 0,

    firstServeWinPercentage:
      stats.serving.firstServeIn > 0
        ? (stats.serving.pointsWonOnFirstServe / stats.serving.firstServeIn) *
          100
        : 0,

    secondServeWinPercentage:
      stats.serving.secondServeIn > 0
        ? (stats.serving.pointsWonOnSecondServe / stats.serving.secondServeIn) *
          100
        : 0,

    breakPointSavePercentage:
      stats.serving.breakPointsFaced > 0
        ? (stats.serving.breakPointsSaved / stats.serving.breakPointsFaced) *
          100
        : 0,

    breakPointConversionPercentage:
      stats.returning.breakPointsPlayed > 0
        ? (stats.returning.breakPointsWon / stats.returning.breakPointsPlayed) *
          100
        : 0,

    returnPointsWonPercentage:
      stats.returning.returnGamesPlayed > 0
        ? (stats.returning.pointsWonOnReturn /
            stats.returning.returnGamesPlayed) *
          100
        : 0,
  };
}

/**
 * Compares two statistics objects and returns the difference.
 *
 * Calculates stats1 - stats2 for all numeric fields.
 * Useful for determining statistics over a specific period (e.g. current set)
 * by subtracting start-of-period stats from current stats.
 *
 * @param stats1 - The "current" or "end" statistics
 * @param stats2 - The "baseline" or "start" statistics to subtract
 * @returns A new stats object where values are stats1 - stats2
 */
export function compareStats(
  stats1: ParticipantStatistics,
  stats2: ParticipantStatistics
): ParticipantStatistics {
  const diff = createEmptyStats();

  // Calculate differences for all fields
  diff.pointsWon = stats1.pointsWon - stats2.pointsWon;
  diff.pointsPlayed = stats1.pointsPlayed - stats2.pointsPlayed;

  // Serving differences
  diff.serving.aces = stats1.serving.aces - stats2.serving.aces;
  diff.serving.doubleFaults =
    stats1.serving.doubleFaults - stats2.serving.doubleFaults;
  diff.serving.serviceWinners =
    stats1.serving.serviceWinners - stats2.serving.serviceWinners;
  diff.serving.firstServeIn =
    stats1.serving.firstServeIn - stats2.serving.firstServeIn;
  diff.serving.firstServeTotal =
    stats1.serving.firstServeTotal - stats2.serving.firstServeTotal;
  diff.serving.secondServeIn =
    stats1.serving.secondServeIn - stats2.serving.secondServeIn;
  diff.serving.secondServeTotal =
    stats1.serving.secondServeTotal - stats2.serving.secondServeTotal;
  diff.serving.pointsWonOnFirstServe =
    stats1.serving.pointsWonOnFirstServe - stats2.serving.pointsWonOnFirstServe;
  diff.serving.pointsWonOnSecondServe =
    stats1.serving.pointsWonOnSecondServe -
    stats2.serving.pointsWonOnSecondServe;
  diff.serving.serviceGamesPlayed =
    stats1.serving.serviceGamesPlayed - stats2.serving.serviceGamesPlayed;
  diff.serving.serviceGamesWon =
    stats1.serving.serviceGamesWon - stats2.serving.serviceGamesWon;
  diff.serving.breakPointsSaved =
    stats1.serving.breakPointsSaved - stats2.serving.breakPointsSaved;
  diff.serving.breakPointsFaced =
    stats1.serving.breakPointsFaced - stats2.serving.breakPointsFaced;

  // Returning differences
  diff.returning.returnWinners =
    stats1.returning.returnWinners - stats2.returning.returnWinners;
  diff.returning.returnErrors =
    stats1.returning.returnErrors - stats2.returning.returnErrors;
  diff.returning.breakPointsWon =
    stats1.returning.breakPointsWon - stats2.returning.breakPointsWon;
  diff.returning.breakPointsPlayed =
    stats1.returning.breakPointsPlayed - stats2.returning.breakPointsPlayed;
  diff.returning.pointsWonOnReturn =
    stats1.returning.pointsWonOnReturn - stats2.returning.pointsWonOnReturn;
  diff.returning.returnGamesPlayed =
    stats1.returning.returnGamesPlayed - stats2.returning.returnGamesPlayed;
  diff.returning.firstServeReturnPointsWon =
    stats1.returning.firstServeReturnPointsWon -
    stats2.returning.firstServeReturnPointsWon;
  diff.returning.firstServeReturnPointsPlayed =
    stats1.returning.firstServeReturnPointsPlayed -
    stats2.returning.firstServeReturnPointsPlayed;
  diff.returning.secondServeReturnPointsWon =
    stats1.returning.secondServeReturnPointsWon -
    stats2.returning.secondServeReturnPointsWon;
  diff.returning.secondServeReturnPointsPlayed =
    stats1.returning.secondServeReturnPointsPlayed -
    stats2.returning.secondServeReturnPointsPlayed;

  // Rally differences
  diff.rally.winners = stats1.rally.winners - stats2.rally.winners;
  diff.rally.unforcedErrors =
    stats1.rally.unforcedErrors - stats2.rally.unforcedErrors;
  diff.rally.forcedErrors =
    stats1.rally.forcedErrors - stats2.rally.forcedErrors;
  diff.rally.netPointsWon =
    stats1.rally.netPointsWon - stats2.rally.netPointsWon;
  diff.rally.netPointsPlayed =
    stats1.rally.netPointsPlayed - stats2.rally.netPointsPlayed;
  diff.rally.baselinePointsWon =
    stats1.rally.baselinePointsWon - stats2.rally.baselinePointsWon;
  diff.rally.baselinePointsPlayed =
    stats1.rally.baselinePointsPlayed - stats2.rally.baselinePointsPlayed;

  return diff;
}

/**
 * Deep clones an object.
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Complete statistics factory implementation.
 */
export const statisticsFactory: StatisticsFactory = {
  createEmpty: createEmptyStats,
  createTeamStats: createEmptyTeamStats,
  aggregate: aggregateStats,
  mergeStats,
};

/**
 * Manager class for tracking and updating match statistics.
 *
 * Handles statistics for both singles and doubles matches, tracking
 * aggregate team stats and individual player contributions in doubles.
 *
 * @example
 * ```typescript
 * const manager = new StatisticsManager();
 * manager.initializeParticipants(participants);
 * manager.recordPoint(winnerId, loserId, outcome, serverId);
 * const stats = manager.getStats(participantId);
 * ```
 */
export class StatisticsManager {
  private participantStats: Map<string, ParticipantStatistics | TeamStatistics>;

  constructor() {
    this.participantStats = new Map();
  }

  /**
   * Initializes statistics tracking for match participants.
   *
   * Creates empty stats for each participant. For doubles teams,
   * also initializes individual player stats within the team.
   *
   * @param participants - Object containing participants at positions 1 and 2
   */
  initializeParticipants(participants: {
    1: AnyParticipant;
    2: AnyParticipant;
  }): void {
    for (const position of [1, 2] as const) {
      const participant = participants[position];

      if (isDoublesTeam(participant)) {
        const teamStats = createEmptyTeamStats();
        // Initialize player stats within team
        teamStats.playerStats[participant.players.a.id] = createEmptyStats();
        teamStats.playerStats[participant.players.b.id] = createEmptyStats();
        this.participantStats.set(participant.id, teamStats);
      } else {
        this.participantStats.set(participant.id, createEmptyStats());
      }
    }
  }

  /**
   * Records a point outcome and updates all relevant statistics.
   *
   * Updates stats for both winner and loser, handling serving/receiving specific
   * metrics, and managing individual stats in doubles matches if scorerId/serverId
   * are provided for team members.
   *
   * @param winnerId - ID of the participant (player/team) who won the point
   * @param loserId - ID of the participant (player/team) who lost the point
   * @param outcome - The classification of the point (Ace, Winner, Error, etc.)
   * @param serverId - ID of the specific player who was serving
   * @param scorerId - ID of the specific player who hit the winner/error (optional)
   * @param isFirstServe - Whether the point was played on a first serve (optional)
   */
  recordPoint(
    winnerId: string,
    loserId: string,
    outcome: PointOutcome,
    serverId: string,
    scorerId?: string,
    isFirstServe?: boolean
  ): void {
    // Update winner stats
    const winnerStats = this.participantStats.get(winnerId);
    if (winnerStats) {
      const isServing =
        serverId === winnerId || this.isPlayerServing(winnerId, serverId);

      if (scorerId && "playerStats" in winnerStats) {
        // Team stats with individual scorer
        this.participantStats.set(
          winnerId,
          updateTeamStats(
            winnerStats as TeamStatistics,
            scorerId,
            outcome,
            true,
            isServing,
            isFirstServe
          )
        );
      } else {
        // Singles or team aggregate
        this.participantStats.set(
          winnerId,
          updateStats(winnerStats, outcome, true, isServing, isFirstServe)
        );
      }
    }

    // Update loser stats
    const loserStats = this.participantStats.get(loserId);
    if (loserStats) {
      const isServing =
        serverId === loserId || this.isPlayerServing(loserId, serverId);

      // For unforced errors, the scorerId is the ID of the player who made the error.
      // For double faults, the serverId is the ID of the player who made the error.
      const attributionId =
        outcome === PointOutcome.UnforcedError
          ? scorerId
          : outcome === PointOutcome.DoubleFault
            ? serverId
            : undefined;

      if (attributionId && "playerStats" in loserStats) {
        this.participantStats.set(
          loserId,
          updateTeamStats(
            loserStats as TeamStatistics,
            attributionId,
            outcome,
            false,
            isServing,
            isFirstServe
          )
        );
      } else {
        this.participantStats.set(
          loserId,
          updateStats(loserStats, outcome, false, isServing, isFirstServe)
        );
      }
    }
  }

  /**
   * Gets statistics for a participant.
   *
   * @param participantId - ID of the participant to retrieve stats for
   * @returns The statistics object or undefined if not found
   */
  getStats(
    participantId: string
  ): ParticipantStatistics | TeamStatistics | undefined {
    return this.participantStats.get(participantId);
  }

  /**
   * Gets all statistics.
   */
  getAllStats(): Map<string, ParticipantStatistics | TeamStatistics> {
    return new Map(this.participantStats);
  }

  /**
   * Resets all statistics.
   */
  reset(): void {
    this.participantStats.clear();
  }

  /**
   * Checks if a player is serving (handles team members).
   */
  private isPlayerServing(participantId: string, serverId: string): boolean {
    // Check if the server is a player within the participant's team
    const stats = this.participantStats.get(participantId);
    if (stats && "playerStats" in stats) {
      return serverId in stats.playerStats;
    }
    return false;
  }

  /**
   * Restores statistics from a map.
   */
  restore(stats: Map<string, ParticipantStatistics | TeamStatistics>): void {
    this.participantStats = new Map(stats);
  }

  /**
   * Records a service game outcome.
   *
   * Updates "Service Games Played" and "Service Games Won" for the server
   * (and their team if applicable).
   *
   * @param serverId - ID of the player who served the game
   * @param won - Whether the server won the game (held serve)
   */
  recordServiceGame(serverId: string, won: boolean): void {
    for (const [id, stats] of this.participantStats.entries()) {
      const isServing = id === serverId || this.isPlayerServing(id, serverId);

      if (isServing) {
        if ("playerStats" in stats && id !== serverId) {
          const teamStats = deepClone(stats) as TeamStatistics;
          teamStats.serving.serviceGamesPlayed++;
          if (won) teamStats.serving.serviceGamesWon++;

          if (teamStats.playerStats[serverId]) {
            teamStats.playerStats[serverId].serving.serviceGamesPlayed++;
            if (won) teamStats.playerStats[serverId].serving.serviceGamesWon++;
          }

          this.participantStats.set(id, teamStats);
        } else {
          const updated = deepClone(stats);
          updated.serving.serviceGamesPlayed++;
          if (won) updated.serving.serviceGamesWon++;
          this.participantStats.set(id, updated);
        }
        return;
      }
    }
  }

  /**
   * Records a break point opportunity results.
   *
   * Updates "Break Points Faced" and "Break Points Saved" for the server,
   * and "Break Points Played" and "Break Points Won" for the receiver.
   *
   * @param serverId - ID of the player serving the break point
   * @param receiverId - ID of the player/team receiving
   * @param outcome - Outcome of the point
   * @param winnerId - ID of the point winner
   */
  recordBreakPoint(
    serverId: string,
    receiverId: string,
    outcome: PointOutcome,
    winnerId: string
  ): void {
    const serverWon =
      winnerId === serverId || this.isPlayerServing(winnerId, serverId);

    const serverParticipantId = this.findParticipantId(serverId);
    if (serverParticipantId) {
      const stats = this.participantStats.get(serverParticipantId)!;
      const updated = deepClone(stats);
      updated.serving.breakPointsFaced++;
      if (serverWon) updated.serving.breakPointsSaved++;
      this.participantStats.set(serverParticipantId, updated);
    }

    const receiverParticipantId = this.findParticipantId(receiverId);
    if (receiverParticipantId) {
      const stats = this.participantStats.get(receiverParticipantId)!;
      const updated = deepClone(stats);
      updated.returning.breakPointsPlayed++;
      if (!serverWon) updated.returning.breakPointsWon++;
      this.participantStats.set(receiverParticipantId, updated);
    }
  }

  /**
   * Finds the main participant ID for a given player/team ID.
   */
  private findParticipantId(id: string): string | undefined {
    if (this.participantStats.has(id)) return id;
    for (const [pId, stats] of this.participantStats.entries()) {
      if ("playerStats" in stats && id in stats.playerStats) {
        return pId;
      }
    }
    return undefined;
  }
}
