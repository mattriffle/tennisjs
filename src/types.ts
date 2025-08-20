/**
 * Represents a player, identified as 1 or 2.
 */
export type PlayerNum = 1 | 2;

/**
 * Represents a team number in doubles matches.
 */
export type TeamNum = 1 | 2;

/**
 * Represents a player position in a doubles team.
 */
export type PlayerPosition = "A" | "B";

/**
 * Type of match being played.
 */
export type MatchType = "singles" | "doubles";

/**
 * Represents a player in a doubles match.
 */
export interface Player {
  name: string;
  position: PlayerPosition;
  team: TeamNum;
}

/**
 * Represents a doubles team.
 */
export interface Team {
  players: [Player, Player];
  teamNum: TeamNum;
}

/**
 * Identifier for a player - can be used for both singles and doubles.
 */
export type PlayerIdentifier =
  | PlayerNum // For singles: 1 or 2
  | { team: TeamNum; position: PlayerPosition }; // For doubles

/**
 * Enum representing the possible outcomes of a point.
 */
export enum PointOutcomes {
  FAULT = 1,
  DOUBLE_FAULT,
  WINNER,
  UNFORCED_ERROR,
  ACE,
  SERVICE_WINNER,
  RETURN_WINNER,
  REGULAR, // A regular point won during a rally
}

/**
 * Represents the score within a game, which can be numeric (0, 15, 30, 40) or string ('DEUCE', 'ADV').
 */
export type ScoreObj = {
  [key in PlayerNum]: number | string;
};

/**
 * Represents scores that are always numeric, such as game counts, set counts, and tiebreak points.
 */
export type NumericScoreObj = {
  [key in PlayerNum]: number;
};

/**
 * Statistics for an individual player in doubles.
 */
export interface DoublesPlayerStats {
  team: TeamNum;
  position: PlayerPosition;
  name: string;
  stats: {
    pointsWon: number;
    pointsPlayed: number;
    servingStats: {
      aces: number;
      doubleFaults: number;
      serviceWinners: number;
      firstServeIn: number;
      firstServeTotal: number;
      pointsWonOnServe: number;
      serviceGamesPlayed: number;
    };
    returningStats: {
      returnWinners: number;
      returnErrors: number;
      breakPointsWon: number;
      breakPointsPlayed: number;
    };
    rallyStats: {
      winners: number;
      unforcedErrors: number;
    };
  };
}

/**
 * Interface for the detailed summary of a match's current state.
 */
export interface MatchSummary {
  meta: {
    type: "Game" | "Tiebreak";
    matchType?: MatchType;
    tiebreakActive: boolean;
    server?: PlayerNum | Player;
    receiver?: PlayerNum | Player;
    currentServer?: Player;
    player?: {
      1: string;
      2: string;
    };
    teams?: {
      1: Team;
      2: Team;
    };
    servingRotation?: Player[];
    numSets: number;
  };
  // Singles properties
  player1?: {
    sets: number;
    games: number;
    points: number | string;
    stats: { [key: string]: number };
  };
  player2?: {
    sets: number;
    games: number;
    points: number | string;
    stats: { [key: string]: number };
  };
  // Doubles properties
  team1?: {
    sets: number;
    games: number;
    points: number | string;
    players: {
      A: DoublesPlayerStats;
      B: DoublesPlayerStats;
    };
  };
  team2?: {
    sets: number;
    games: number;
    points: number | string;
    players: {
      A: DoublesPlayerStats;
      B: DoublesPlayerStats;
    };
  };
  winner?: PlayerNum | TeamNum;
  matchScore: string;
}

/**
 * Interface for the simplified score object.
 */
export interface SimpleScore {
  matchType?: MatchType;
  // Singles properties
  player1?: {
    sets: number;
    games: number;
    points: number | string;
  };
  player2?: {
    sets: number;
    games: number;
    points: number | string;
  };
  // Doubles properties
  team1?: {
    sets: number;
    games: number;
    points: number | string;
  };
  team2?: {
    sets: number;
    games: number;
    points: number | string;
  };
  server: PlayerNum | Player;
  winner?: PlayerNum | TeamNum;
}
