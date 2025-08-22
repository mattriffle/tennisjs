/**
 * Adapter layer for backward compatibility with the legacy API.
 */

import {
  UnifiedMatchSummary,
  LegacyMatchSummary,
  LegacyScore,
  AnyParticipant,
  ParticipantStatistics,
  TeamStatistics,
  PointOutcome,
  isSinglesPlayer,
  isDoublesTeam,
  isTeamStatistics,
  LEGACY_OUTCOME_MAP,
} from "./unified-types.js";
import { PointOutcomes } from "./types.js";

/**
 * Converts unified match summary to legacy singles format.
 */
export function toSinglesFormat(
  summary: UnifiedMatchSummary
): LegacyMatchSummary {
  if (summary.meta.matchType !== "singles") {
    throw new Error("Cannot convert non-singles match to singles format");
  }

  const participant1 = summary.participants[1].info;
  const participant2 = summary.participants[2].info;

  if (!isSinglesPlayer(participant1) || !isSinglesPlayer(participant2)) {
    throw new Error("Invalid participant types for singles match");
  }

  const stats1 = summary.participants[1].stats;
  const stats2 = summary.participants[2].stats;

  return {
    meta: {
      type: summary.score.points.type === "tiebreak" ? "Tiebreak" : "Game",
      matchType: "singles",
      tiebreakActive: summary.score.points.type === "tiebreak",
      server: getServerPosition(
        summary.score.server.current,
        participant1,
        participant2
      ),
      receiver:
        getServerPosition(
          summary.score.server.current,
          participant1,
          participant2
        ) === 1
          ? 2
          : 1,
      player: {
        1: participant1.name,
        2: participant2.name,
      },
      numSets: summary.meta.format.sets,
    },
    player1: {
      sets: summary.score.sets[0],
      games: summary.score.games[0],
      points: summary.score.points.values[0],
      stats: convertStatsToLegacy(stats1),
    },
    player2: {
      sets: summary.score.sets[1],
      games: summary.score.games[1],
      points: summary.score.points.values[1],
      stats: convertStatsToLegacy(stats2),
    },
    winner: summary.score.winner,
    matchScore: summary.matchScore,
  };
}

/**
 * Converts unified match summary to legacy doubles format.
 */
export function toDoublesFormat(
  summary: UnifiedMatchSummary
): LegacyMatchSummary {
  if (summary.meta.matchType !== "doubles") {
    throw new Error("Cannot convert non-doubles match to doubles format");
  }

  const team1 = summary.participants[1].info;
  const team2 = summary.participants[2].info;

  if (!isDoublesTeam(team1) || !isDoublesTeam(team2)) {
    throw new Error("Invalid participant types for doubles match");
  }

  const stats1 = summary.participants[1].stats as TeamStatistics;
  const stats2 = summary.participants[2].stats as TeamStatistics;

  // Find current server details
  const currentServerId = summary.score.server.current;
  let currentServer: any = null;

  if (team1.players.a.id === currentServerId) {
    currentServer = { ...team1.players.a, team: 1 };
  } else if (team1.players.b.id === currentServerId) {
    currentServer = { ...team1.players.b, team: 1 };
  } else if (team2.players.a.id === currentServerId) {
    currentServer = { ...team2.players.a, team: 2 };
  } else if (team2.players.b.id === currentServerId) {
    currentServer = { ...team2.players.b, team: 2 };
  }

  return {
    meta: {
      type: summary.score.points.type === "tiebreak" ? "Tiebreak" : "Game",
      matchType: "doubles",
      tiebreakActive: summary.score.points.type === "tiebreak",
      currentServer,
      teams: {
        1: {
          players: [
            { name: team1.players.a.name, position: "A", team: 1 },
            { name: team1.players.b.name, position: "B", team: 1 },
          ],
          teamNum: 1,
        },
        2: {
          players: [
            { name: team2.players.a.name, position: "A", team: 2 },
            { name: team2.players.b.name, position: "B", team: 2 },
          ],
          teamNum: 2,
        },
      },
      servingRotation: convertServingRotation(
        summary.score.server.rotation,
        team1,
        team2
      ),
      numSets: summary.meta.format.sets,
    },
    team1: {
      sets: summary.score.sets[0],
      games: summary.score.games[0],
      points: summary.score.points.values[0],
      players: {
        A: convertPlayerStatsToLegacy(team1.players.a, stats1, 1),
        B: convertPlayerStatsToLegacy(team1.players.b, stats1, 1),
      },
    },
    team2: {
      sets: summary.score.sets[1],
      games: summary.score.games[1],
      points: summary.score.points.values[1],
      players: {
        A: convertPlayerStatsToLegacy(team2.players.a, stats2, 2),
        B: convertPlayerStatsToLegacy(team2.players.b, stats2, 2),
      },
    },
    winner: summary.score.winner,
    matchScore: summary.matchScore,
  };
}

/**
 * Converts unified score to legacy score format.
 */
export function toLegacyScore(summary: UnifiedMatchSummary): LegacyScore {
  const score: LegacyScore = {
    matchType: summary.meta.matchType === "singles" ? "singles" : "doubles",
    winner: summary.score.winner,
    server: null as any, // Will be set below
  };

  if (summary.meta.matchType === "singles") {
    const participant1 = summary.participants[1].info;
    const participant2 = summary.participants[2].info;

    score.player1 = {
      sets: summary.score.sets[0],
      games: summary.score.games[0],
      points: summary.score.points.values[0],
    };
    score.player2 = {
      sets: summary.score.sets[1],
      games: summary.score.games[1],
      points: summary.score.points.values[1],
    };
    score.server = getServerPosition(
      summary.score.server.current,
      participant1,
      participant2
    );
  } else {
    score.team1 = {
      sets: summary.score.sets[0],
      games: summary.score.games[0],
      points: summary.score.points.values[0],
    };
    score.team2 = {
      sets: summary.score.sets[1],
      games: summary.score.games[1],
      points: summary.score.points.values[1],
    };
    score.server = findServerInTeams(summary);
  }

  return score;
}

/**
 * Converts legacy data to unified format.
 */
export function fromLegacy(data: any): Partial<UnifiedMatchSummary> {
  // Detect match type
  const matchType = data.matchType || (data.player ? "singles" : "doubles");

  if (matchType === "singles") {
    return fromLegacySingles(data);
  } else {
    return fromLegacyDoubles(data);
  }
}

/**
 * Converts legacy singles data to unified format.
 */
function fromLegacySingles(data: any): Partial<UnifiedMatchSummary> {
  return {
    meta: {
      matchType: "singles",
      format: {
        sets: data.numSets,
        tiebreakAt: 6,
        finalSetTiebreak: true,
      },
      status: data.winner ? "completed" : "in-progress",
    },
    score: {
      participants: {
        1: {
          id: "player_1",
          type: "player",
          name: data.player?.[1] || "Player 1",
          position: 1,
        },
        2: {
          id: "player_2",
          type: "player",
          name: data.player?.[2] || "Player 2",
          position: 2,
        },
      },
      sets: [data.score?.[1] || 0, data.score?.[2] || 0],
      games: [data.set?.score?.[1] || 0, data.set?.score?.[2] || 0],
      points: {
        values: [
          data.set?.game?.score?.[1] || data.set?.tiebreak?.score?.[1] || 0,
          data.set?.game?.score?.[2] || data.set?.tiebreak?.score?.[2] || 0,
        ],
        type: data.set?.tiebreak ? "tiebreak" : "game",
      },
      server: {
        current: data.set?.game?.server === 1 ? "player_1" : "player_2",
      },
      winner: data.winner,
    },
    matchScore: "",
  };
}

/**
 * Converts legacy doubles data to unified format.
 */
function fromLegacyDoubles(data: any): Partial<UnifiedMatchSummary> {
  const team1Players = data.teams?.[1]?.players || [];
  const team2Players = data.teams?.[2]?.players || [];

  return {
    meta: {
      matchType: "doubles",
      format: {
        sets: data.numSets,
        tiebreakAt: 6,
        finalSetTiebreak: true,
      },
      status: data.winner ? "completed" : "in-progress",
    },
    score: {
      participants: {
        1: {
          id: "team_1",
          type: "team",
          name: `${team1Players[0]?.name || "Player 1A"}/${team1Players[1]?.name || "Player 1B"}`,
          position: 1,
          players: {
            a: {
              id: "team1_player_a",
              name: team1Players[0]?.name || "Player 1A",
              position: "a",
            },
            b: {
              id: "team1_player_b",
              name: team1Players[1]?.name || "Player 1B",
              position: "b",
            },
          },
        },
        2: {
          id: "team_2",
          type: "team",
          name: `${team2Players[0]?.name || "Player 2A"}/${team2Players[1]?.name || "Player 2B"}`,
          position: 2,
          players: {
            a: {
              id: "team2_player_a",
              name: team2Players[0]?.name || "Player 2A",
              position: "a",
            },
            b: {
              id: "team2_player_b",
              name: team2Players[1]?.name || "Player 2B",
              position: "b",
            },
          },
        },
      },
      sets: [data.score?.[1] || 0, data.score?.[2] || 0],
      games: [data.set?.score?.[1] || 0, data.set?.score?.[2] || 0],
      points: {
        values: [
          data.set?.game?.score?.[1] || data.set?.tiebreak?.score?.[1] || 0,
          data.set?.game?.score?.[2] || data.set?.tiebreak?.score?.[2] || 0,
        ],
        type: data.set?.tiebreak ? "tiebreak" : "game",
      },
      server: {
        current: "team1_player_a", // Default, would need more logic for actual server
        rotation: data.servingRotation?.map((p: any) => p.id || p.name) || [],
      },
      winner: data.winner,
    },
    matchScore: "",
  };
}

/**
 * Converts unified statistics to legacy format.
 */
function convertStatsToLegacy(stats: ParticipantStatistics | TeamStatistics): {
  [key: string]: number;
} {
  return {
    ace: stats.serving.aces,
    double_fault: stats.serving.doubleFaults,
    service_winner: stats.serving.serviceWinners,
    return_winner: stats.returning.returnWinners,
    winner: stats.rally.winners,
    unforced_error: stats.rally.unforcedErrors,
    regular:
      stats.pointsWon -
      (stats.serving.aces +
        stats.serving.serviceWinners +
        stats.returning.returnWinners +
        stats.rally.winners),
  };
}

/**
 * Converts player statistics to legacy doubles format.
 */
function convertPlayerStatsToLegacy(
  player: { id: string; name: string; position: string },
  teamStats: TeamStatistics,
  teamNum: number
): any {
  const playerStats = teamStats.playerStats[player.id] || {
    pointsWon: 0,
    pointsPlayed: 0,
    serving: {
      aces: 0,
      doubleFaults: 0,
      serviceWinners: 0,
      firstServeIn: 0,
      firstServeTotal: 0,
      pointsWonOnFirstServe: 0,
      pointsWonOnSecondServe: 0,
      serviceGamesPlayed: 0,
      serviceGamesWon: 0,
      breakPointsSaved: 0,
      breakPointsFaced: 0,
      secondServeIn: 0,
      secondServeTotal: 0,
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

  return {
    team: teamNum,
    position: player.position.toUpperCase(),
    name: player.name,
    stats: {
      pointsWon: playerStats.pointsWon,
      pointsPlayed: playerStats.pointsPlayed,
      servingStats: {
        aces: playerStats.serving.aces,
        doubleFaults: playerStats.serving.doubleFaults,
        serviceWinners: playerStats.serving.serviceWinners,
        firstServeIn: playerStats.serving.firstServeIn,
        firstServeTotal: playerStats.serving.firstServeTotal,
        pointsWonOnServe:
          playerStats.serving.pointsWonOnFirstServe +
          playerStats.serving.pointsWonOnSecondServe,
        serviceGamesPlayed: playerStats.serving.serviceGamesPlayed,
      },
      returningStats: {
        returnWinners: playerStats.returning.returnWinners,
        returnErrors: playerStats.returning.returnErrors,
        breakPointsWon: playerStats.returning.breakPointsWon,
        breakPointsPlayed: playerStats.returning.breakPointsPlayed,
      },
      rallyStats: {
        winners: playerStats.rally.winners,
        unforcedErrors: playerStats.rally.unforcedErrors,
      },
    },
  };
}

/**
 * Gets server position for singles.
 */
function getServerPosition(
  serverId: string,
  participant1: AnyParticipant,
  participant2: AnyParticipant
): 1 | 2 {
  if (participant1.id === serverId) return 1;
  if (participant2.id === serverId) return 2;
  return 1; // Default
}

/**
 * Finds server in teams for doubles.
 */
function findServerInTeams(summary: UnifiedMatchSummary): any {
  const currentServerId = summary.score.server.current;
  const team1 = summary.participants[1].info;
  const team2 = summary.participants[2].info;

  if (isDoublesTeam(team1)) {
    if (team1.players.a.id === currentServerId) {
      return { name: team1.players.a.name, position: "A", team: 1 };
    }
    if (team1.players.b.id === currentServerId) {
      return { name: team1.players.b.name, position: "B", team: 1 };
    }
  }

  if (isDoublesTeam(team2)) {
    if (team2.players.a.id === currentServerId) {
      return { name: team2.players.a.name, position: "A", team: 2 };
    }
    if (team2.players.b.id === currentServerId) {
      return { name: team2.players.b.name, position: "B", team: 2 };
    }
  }

  return null;
}

/**
 * Converts serving rotation.
 */
function convertServingRotation(
  rotation: string[] | undefined,
  team1: any,
  team2: any
): any[] {
  if (!rotation) return [];

  return rotation
    .map((id) => {
      if (team1.players.a.id === id) {
        return { name: team1.players.a.name, position: "A", team: 1 };
      }
      if (team1.players.b.id === id) {
        return { name: team1.players.b.name, position: "B", team: 1 };
      }
      if (team2.players.a.id === id) {
        return { name: team2.players.a.name, position: "A", team: 2 };
      }
      if (team2.players.b.id === id) {
        return { name: team2.players.b.name, position: "B", team: 2 };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Converts legacy point outcome to unified format.
 */
export function convertPointOutcome(
  legacyOutcome: PointOutcomes
): PointOutcome {
  const mapping: Record<PointOutcomes, PointOutcome> = {
    [PointOutcomes.ACE]: PointOutcome.Ace,
    [PointOutcomes.DOUBLE_FAULT]: PointOutcome.DoubleFault,
    [PointOutcomes.SERVICE_WINNER]: PointOutcome.ServiceWinner,
    [PointOutcomes.RETURN_WINNER]: PointOutcome.ReturnWinner,
    [PointOutcomes.WINNER]: PointOutcome.Winner,
    [PointOutcomes.UNFORCED_ERROR]: PointOutcome.UnforcedError,
    [PointOutcomes.REGULAR]: PointOutcome.Regular,
    [PointOutcomes.FAULT]: PointOutcome.Regular, // Map fault to regular
  };

  return mapping[legacyOutcome] || PointOutcome.Regular;
}

/**
 * Main adapter class for backward compatibility.
 */
export class LegacyAdapter {
  /**
   * Converts unified model to legacy singles format.
   */
  static toSinglesFormat(summary: UnifiedMatchSummary): LegacyMatchSummary {
    return toSinglesFormat(summary);
  }

  /**
   * Converts unified model to legacy doubles format.
   */
  static toDoublesFormat(summary: UnifiedMatchSummary): LegacyMatchSummary {
    return toDoublesFormat(summary);
  }

  /**
   * Converts unified model to legacy score format.
   */
  static toLegacyScore(summary: UnifiedMatchSummary): LegacyScore {
    return toLegacyScore(summary);
  }

  /**
   * Converts legacy format to unified model.
   */
  static fromLegacy(data: any): Partial<UnifiedMatchSummary> {
    return fromLegacy(data);
  }

  /**
   * Automatically detects format and converts.
   */
  static autoConvert(summary: UnifiedMatchSummary): LegacyMatchSummary {
    if (summary.meta.matchType === "singles") {
      return toSinglesFormat(summary);
    } else {
      return toDoublesFormat(summary);
    }
  }
}
