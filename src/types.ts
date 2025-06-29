/**
 * Represents a player, identified as 1 or 2.
 */
export type PlayerNum = 1 | 2;

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
 * Interface for the detailed summary of a match's current state.
 */
export interface MatchSummary {
    meta: {
        type: "Game" | "Tiebreak";
        tiebreakActive: boolean;
        server: PlayerNum;
        receiver: PlayerNum;
        player: {
            1: string;
            2: string;
        };
        numSets: number;
    };
    player1: {
        sets: number;
        games: number;
        points: number | string;
        stats: { [key: string]: number };
    };
    player2: {
        sets: number;
        games: number;
        points: number | string;
        stats: { [key: string]: number };
    };
    winner?: PlayerNum;
    matchScore: string;
}

/**
 * Interface for the simplified score object.
 */
export interface SimpleScore {
    player1: {
        sets: number;
        games: number;
        points: number | string;
    };
    player2: {
        sets: number;
        games: number;
        points: number | string;
    };
    server: PlayerNum;
    winner?: PlayerNum;
}
