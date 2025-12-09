import { TennisMatch, PointOutcome } from "../src";

describe("Augmented Statistics Verification", () => {
  let match: TennisMatch;
  let t1pA: string, t1pB: string, t2pA: string, t2pB: string;

  beforeEach(() => {
    match = new TennisMatch(["Team1A", "Team1B"], ["Team2A", "Team2B"], 3);
    const summary = match.getMatchSummary();
    const t1 = summary.participants[1].info as any;
    const t2 = summary.participants[2].info as any;
    t1pA = t1.players.a.id;
    t1pB = t1.players.b.id;
    t2pA = t2.players.a.id;
    t2pB = t2.players.b.id;
  });

  const getStats = () => {
    const s = match.getMatchSummary();
    return {
      t1: s.participants[1].stats as any,
      t2: s.participants[2].stats as any,
    };
  };

  test("Winner Exclusivity: Only the scoring player gets the winner stat", () => {
    // Team 1 Player A hits a winner
    match.scorePoint(1, PointOutcome.Winner, t1pA);

    const { t1, t2 } = getStats();

    // Verify Team 1 Player A gets the stat
    expect(t1.playerStats[t1pA].rally.winners).toBe(1);

    // Verify NO ONE ELSE gets the stat
    expect(t1.playerStats[t1pB]?.rally?.winners || 0).toBe(0);
    expect(t2.playerStats[t2pA]?.rally?.winners || 0).toBe(0);
    expect(t2.playerStats[t2pB]?.rally?.winners || 0).toBe(0);

    // Verify Team totals
    expect(t1.rally.winners).toBe(1);
    expect(t2.rally.winners).toBe(0);
  });

  test("Unforced Error Attribution: Error attributed to loser, point to winner", () => {
    // Team 1 Player A commits unforced error
    // Team 2 wins the point (winner=2)
    // The scorerId passed should be the error maker (t1pA)
    match.scorePoint(2, PointOutcome.UnforcedError, t1pA);

    const { t1, t2 } = getStats();

    // Verify point awarded to Team 2 (they should have 15 points, Team 1 has 0)
    // pointScores values are typically [team1Score, team2Score]
    const points = match.getMatchSummary().score.points.values;
    expect(points[1]).toBe(15);
    expect(points[0]).toBe(0);

    // Verify Unforced Error stat attributed to Team 1 Player A
    expect(t1.playerStats[t1pA].rally.unforcedErrors).toBe(1);

    // Verify teammate did not get error
    expect(t1.playerStats[t1pB]?.rally?.unforcedErrors || 0).toBe(0);

    // Verify opponents did not get error
    expect(t2.playerStats[t2pA]?.rally?.unforcedErrors || 0).toBe(0);
    expect(t2.playerStats[t2pB]?.rally?.unforcedErrors || 0).toBe(0);

    // Verify Team totals
    expect(t1.rally.unforcedErrors).toBe(1);
    expect(t2.rally.unforcedErrors).toBe(0);
  });

  test("Double Fault Attribution: Attributed to server", () => {
    // Assume T1PA is serving initially (standard start)
    // Server double faults -> Team 2 wins point
    match.scorePoint(2, PointOutcome.DoubleFault, t1pA, false);

    const { t1, t2 } = getStats();

    // Verify Team 1 Player A gets double fault
    expect(t1.playerStats[t1pA].serving.doubleFaults).toBe(1);

    // Verify others don't
    expect(t1.playerStats[t1pB]?.serving?.doubleFaults || 0).toBe(0);
    expect(t2.playerStats[t2pA]?.serving?.doubleFaults || 0).toBe(0);

    // Verify Team totals
    expect(t1.serving.doubleFaults).toBe(1);
    expect(t2.serving.doubleFaults).toBe(0);
  });
});
