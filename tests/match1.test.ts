import { TennisMatch, PointOutcomes } from "../src";

const match = new TennisMatch("Jim", "Andre", 3);

const howCache = {
  player1: {},
};

const testScore = (data: Array<number | string>) => {
  let index = 0;
  const summary = match.matchSummary();
  const players = ["player1", "player2"] as const;
  const units = ["sets", "games", "points"] as const;

  for (const player of players) {
    for (const unit of units) {
      expect(summary[player][unit]).toEqual(data[index]);
      index++;
    }
  }
};

const scoreAndTest = (
  winner: 1 | 2,
  data: Array<number | string>,
  how?: PointOutcomes
) => {
  if (!how) {
    const server = match.matchSummary().meta.server;
    how = winner === server ? PointOutcomes.ACE : PointOutcomes.RETURN_WINNER;
  }
  match.scorePoint(winner, how);
  testScore(data);
};

const undoAndTest = (data: Array<number | string>) => {
  match.removePoint();
  testScore(data);
};

describe("Match 1", () => {
  it("Checking meta", () => {
    let summary = match.matchSummary();
    expect(summary.meta.player[1]).toEqual("Jim");
    expect(summary.meta.player[2]).toEqual("Andre");
    expect(summary.meta.numSets).toEqual(3);
  });

  it("Checking set 1 game 1", () => {
    expect(match.matchSummary().meta.server).toEqual(1);
    scoreAndTest(1, [0, 0, 15, 0, 0, 0]); // 15-0
    scoreAndTest(1, [0, 0, 30, 0, 0, 0]); // 30-0
    scoreAndTest(2, [0, 0, 30, 0, 0, 15]); // 30-15
    scoreAndTest(1, [0, 0, 40, 0, 0, 15]); // 40-15
    scoreAndTest(1, [0, 1, 0, 0, 0, 0]); // P1 Wins
  });

  it("Checking undo on game boundary", () => {
    undoAndTest([0, 0, 40, 0, 0, 15]); // Rewind game boundary
    scoreAndTest(1, [0, 1, 0, 0, 0, 0]); // Nah, P1 Still Wins, up 1-0
  });

  it("Checking set 2 game 2", () => {
    expect(match.matchSummary().meta.server).toEqual(2);
    scoreAndTest(2, [0, 1, 0, 0, 0, 15]); // 0-15
    undoAndTest([0, 1, 0, 0, 0, 0]); // Rewind first point, change winner
    scoreAndTest(1, [0, 1, 15, 0, 0, 0]); // 15-0
    scoreAndTest(1, [0, 1, 30, 0, 0, 0]); // 30-0
    scoreAndTest(2, [0, 1, 30, 0, 0, 15]); // 30-15
    scoreAndTest(2, [0, 1, 30, 0, 0, 30]); // 30-30
    scoreAndTest(1, [0, 1, 40, 0, 0, 30]); // 40-30
    scoreAndTest(2, [0, 1, "DEUCE", 0, 0, "DEUCE"]); // Deuce
    scoreAndTest(1, [0, 1, "AD OUT", 0, 0, "-"]); // Adv P1
    scoreAndTest(2, [0, 1, "DEUCE", 0, 0, "DEUCE"]); // Deuce
    scoreAndTest(2, [0, 1, "-", 0, 0, "AD IN"]); // Adv P2
    scoreAndTest(2, [0, 1, 0, 0, 1, 0]); // P2 Wins, tied 1-1
  });

  it("Checking set 1 game 3", () => {
    expect(match.matchSummary().meta.server).toEqual(1);
    scoreAndTest(1, [0, 1, 15, 0, 1, 0]); // 15-0
    scoreAndTest(2, [0, 1, 15, 0, 1, 15]); // 15-15
    scoreAndTest(1, [0, 1, 30, 0, 1, 15]); // 30-15
    scoreAndTest(2, [0, 1, 30, 0, 1, 30]); // 30-30
    scoreAndTest(2, [0, 1, 30, 0, 1, 40]); // 30-40
    scoreAndTest(1, [0, 1, "DEUCE", 0, 1, "DEUCE"]); // Deuce
    scoreAndTest(1, [0, 1, "AD IN", 0, 1, "-"]); // Adv P1
    scoreAndTest(2, [0, 1, "DEUCE", 0, 1, "DEUCE"]); // Deuce
    scoreAndTest(2, [0, 1, "-", 0, 1, "AD OUT"]); // Adv P2
    scoreAndTest(1, [0, 1, "DEUCE", 0, 1, "DEUCE"]); // Deuce
    undoAndTest([0, 1, "-", 0, 1, "AD OUT"]); // Undo, back to Adv P2
    scoreAndTest(2, [0, 1, 0, 0, 2, 0]); // P2 wins, up 2-1
  });

  it("Checking set 1 game 4", () => {
    expect(match.matchSummary().meta.server).toEqual(2);

    // Player 1 quickly goes up 40-0
    scoreAndTest(1, [0, 1, 15, 0, 2, 0]); // 15-0
    scoreAndTest(1, [0, 1, 30, 0, 2, 0]); // 30-0
    scoreAndTest(1, [0, 1, 40, 0, 2, 0]); // 40-0

    // Undo all three points back to 0-0
    undoAndTest([0, 1, 30, 0, 2, 0]); // 30-0
    undoAndTest([0, 1, 15, 0, 2, 0]); // 15-0
    undoAndTest([0, 1, 0, 0, 2, 0]); // 0-0

    // Now Player 2 mounts a comeback to win 40-15
    scoreAndTest(2, [0, 1, 0, 0, 2, 15]); // 0-15
    scoreAndTest(2, [0, 1, 0, 0, 2, 30]); // 0-30
    scoreAndTest(1, [0, 1, 15, 0, 2, 30]); // 15-30
    scoreAndTest(2, [0, 1, 15, 0, 2, 40]); // 15-40
    scoreAndTest(2, [0, 1, 0, 0, 3, 0]); // Player 2 wins game 4, now leads 3-1
  });

  it("Checking set 1 game 5", () => {
    expect(match.matchSummary().meta.server).toEqual(1); // Player 1 serving

    // Player 1 wins 4 straight points
    scoreAndTest(1, [0, 1, 15, 0, 3, 0]); // 15-0
    scoreAndTest(1, [0, 1, 30, 0, 3, 0]); // 30-0
    scoreAndTest(1, [0, 1, 40, 0, 3, 0]); // 40-0
    scoreAndTest(1, [0, 2, 0, 0, 3, 0]); // Player 1 wins, games now 2-3
  });

  it("Checking set 1 games 6, 7, 8", () => {
    // Game 6 (Player 2 serving)
    expect(match.matchSummary().meta.server).toEqual(2);

    scoreAndTest(2, [0, 2, 0, 0, 3, 15]); // 0-15
    scoreAndTest(2, [0, 2, 0, 0, 3, 30]); // 0-30
    scoreAndTest(1, [0, 2, 15, 0, 3, 30]); // 15-30
    scoreAndTest(2, [0, 2, 15, 0, 3, 40]); // 15-40
    scoreAndTest(2, [0, 2, 0, 0, 4, 0]); // Player 2 wins, leads 4-2

    // Game 7 (Player 1 serving)
    expect(match.matchSummary().meta.server).toEqual(1);

    scoreAndTest(2, [0, 2, 0, 0, 4, 15]); // 0-15
    scoreAndTest(2, [0, 2, 0, 0, 4, 30]); // 0-30
    scoreAndTest(1, [0, 2, 15, 0, 4, 30]); // 15-30
    scoreAndTest(2, [0, 2, 15, 0, 4, 40]); // 15-40
    scoreAndTest(2, [0, 2, 0, 0, 5, 0]); // Player 2 breaks, leads 5-2

    // Game 8 (Player 2 serving, to win set)
    expect(match.matchSummary().meta.server).toEqual(2);

    scoreAndTest(2, [0, 2, 0, 0, 5, 15]); // 0-15
    scoreAndTest(2, [0, 2, 0, 0, 5, 30]); // 0-30
    scoreAndTest(2, [0, 2, 0, 0, 5, 40]); // 0-40
    scoreAndTest(1, [0, 2, 15, 0, 5, 40]); // 15-40
    scoreAndTest(2, [0, 0, 0, 1, 0, 0]); // Player 2 wins the set 6-2
  });

  it("Checking undo on set boundary", () => {
    undoAndTest([0, 2, 15, 0, 5, 40]); // Undo set winner, before redoing
    scoreAndTest(2, [0, 0, 0, 1, 0, 0]); // Player 2 wins the set 6-2
    const summary = match.matchSummary();
    expect(summary.player1.stats.ace).toBe(13);
    expect(summary.player1.stats.return_winner).toBe(7);
    expect(summary.player2.stats.ace).toBe(18);
    expect(summary.player2.stats.return_winner).toBe(11);
  });

  it("Setting up tiebreak in set 2 by alternating games to 6-6", () => {
    // Alternate games until 6-6
    let p1Games = 0;
    let p2Games = 0;

    for (let i = 0; i < 6; i++) {
      // Player 1 serving
      scoreAndTest(1, [0, p1Games, 15, 1, p2Games, 0]);
      scoreAndTest(1, [0, p1Games, 30, 1, p2Games, 0]);
      scoreAndTest(1, [0, p1Games, 40, 1, p2Games, 0]);
      scoreAndTest(1, [0, ++p1Games, 0, 1, p2Games, 0]); // After win

      // Player 2 serving
      scoreAndTest(2, [0, p1Games, 0, 1, p2Games, 15]);
      scoreAndTest(2, [0, p1Games, 0, 1, p2Games, 30]);
      scoreAndTest(2, [0, p1Games, 0, 1, p2Games, 40]);
      scoreAndTest(2, [0, p1Games, 0, 1, ++p2Games, 0]); // After win
    }

    // Should now be 6-6 with a tiebreak initialized
    expect(match.matchSummary().player1.games).toEqual(6);
    expect(match.matchSummary().player2.games).toEqual(6);
    expect(match.matchSummary().meta.type).toEqual("Tiebreak");
  });

  it("Test a tiebreak", () => {
    // Start the tiebreak with Player 1 winning first 2 points
    scoreAndTest(1, [0, 6, 1, 1, 6, 0]); // 1-0
    scoreAndTest(1, [0, 6, 2, 1, 6, 0]); // 2-0

    // Player 2 fights back
    scoreAndTest(2, [0, 6, 2, 1, 6, 1]); // 2-1
    scoreAndTest(2, [0, 6, 2, 1, 6, 2]); // 2-2

    // Player 2 edges ahead
    scoreAndTest(1, [0, 6, 3, 1, 6, 2]); // 3-2
    scoreAndTest(2, [0, 6, 3, 1, 6, 3]); // 3-3
    scoreAndTest(2, [0, 6, 3, 1, 6, 4]); // 3-4

    // Player 1 claws back
    scoreAndTest(1, [0, 6, 4, 1, 6, 4]); // 4-4
    scoreAndTest(1, [0, 6, 5, 1, 6, 4]); // 5-4

    // Player 2 pushes to even again, gets a set point
    scoreAndTest(2, [0, 6, 5, 1, 6, 5]); // 5-5
    scoreAndTest(2, [0, 6, 5, 1, 6, 6]); // 5-6 → Set point for Player 2

    // Player 1 saves it and surges ahead
    scoreAndTest(1, [0, 6, 6, 1, 6, 6]); // 6-6
    scoreAndTest(1, [0, 6, 7, 1, 6, 6]); // 7-6 → Match point for Player 1
    scoreAndTest(1, [1, 0, 0, 1, 0, 0]); // 8-6 → Player 1 wins set
    const summary = match.matchSummary();
    expect(summary.player1.stats.ace).toBe(43);
    expect(summary.player1.stats.return_winner).toBe(9);
    expect(summary.player2.stats.ace).toBe(47);
    expect(summary.player2.stats.return_winner).toBe(12);

    // Confirm set scores now 1-1
    expect(match.matchSummary().player1.points).toEqual(0);
    expect(match.matchSummary().player1.games).toEqual(0);
    expect(match.matchSummary().player1.sets).toEqual(1);
    expect(match.matchSummary().player2.sets).toEqual(1);
  });

  it("Back out of set ending on tiebreak", () => {
    undoAndTest([0, 6, 7, 1, 6, 6]);

    expect(match.matchSummary().player1.sets).toEqual(0);
    expect(match.matchSummary().player2.sets).toEqual(1);

    expect(match.matchSummary().player1.games).toEqual(6);
    expect(match.matchSummary().player2.games).toEqual(6);

    expect(match.matchSummary().player2.points).toEqual(6);
    expect(match.matchSummary().player1.points).toEqual(7);
  });

  it("Nah, it was right the first time", () => {
    scoreAndTest(1, [1, 0, 0, 1, 0, 0]); // P1 Wins
  });
});
