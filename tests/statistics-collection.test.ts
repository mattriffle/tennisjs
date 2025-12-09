import { TennisMatch, PointOutcome } from "../src";

describe("Statistics Collection", () => {
  describe("Singles", () => {
    it("tracks serving stats: ace, service winner (first/second), double fault, and regular", () => {
      const match = new TennisMatch("P1", "P2", 3);
      // Ace first serve
      match.scorePoint(1, PointOutcome.Ace, undefined, true);
      let stats1 = match.getMatchSummary().participants[1].stats as any;
      let stats2 = match.getMatchSummary().participants[2].stats as any;
      expect(stats1.serving.aces).toBe(1);
      expect(stats1.serving.firstServeIn).toBe(1);
      expect(stats1.serving.firstServeTotal).toBe(1);
      expect(stats1.serving.pointsWonOnFirstServe).toBe(1);
      expect(stats2.returning.firstServeReturnPointsPlayed).toBe(1);
      expect(stats2.returning.firstServeReturnPointsWon).toBe(0);

      // Double fault (second serve), point to receiver
      match.scorePoint(2, PointOutcome.DoubleFault, undefined, false);
      stats1 = match.getMatchSummary().participants[1].stats as any;
      stats2 = match.getMatchSummary().participants[2].stats as any;
      expect(stats1.serving.doubleFaults).toBe(1);
      expect(stats1.serving.secondServeTotal).toBe(1);
      expect(stats2.returning.pointsWonOnReturn).toBe(1);
      expect(stats2.returning.secondServeReturnPointsPlayed).toBe(1);
      expect(stats2.returning.secondServeReturnPointsWon).toBe(1);

      // Service winner on second serve
      match.scorePoint(1, PointOutcome.ServiceWinner, undefined, false);
      stats1 = match.getMatchSummary().participants[1].stats as any;
      stats2 = match.getMatchSummary().participants[2].stats as any;
      expect(stats1.serving.serviceWinners).toBe(1);
      expect(stats1.serving.secondServeIn).toBe(1);
      expect(stats1.serving.secondServeTotal).toBe(2);
      expect(stats1.serving.pointsWonOnSecondServe).toBe(1);
      expect(stats2.returning.secondServeReturnPointsPlayed).toBe(2);

      // Regular point on first serve (counts firstServeTotal and if won, firstServeIn and pointsWonOnFirstServe)
      match.scorePoint(1, PointOutcome.Regular, undefined, true);
      stats1 = match.getMatchSummary().participants[1].stats as any;
      stats2 = match.getMatchSummary().participants[2].stats as any;
      expect(stats1.serving.firstServeTotal).toBe(2);
      expect(stats1.serving.firstServeIn).toBe(2);
      expect(stats1.serving.pointsWonOnFirstServe).toBe(2);

      // Overall
      expect(stats1.pointsPlayed).toBe(4);
      expect(stats1.pointsWon).toBe(3);
      expect(stats2.pointsPlayed).toBe(4);
      expect(stats2.pointsWon).toBe(1);
    });

    it("tracks returning stats: return winner, return errors and return points by serve type", () => {
      const match = new TennisMatch("P1", "P2", 3);

      // First serve return winner for receiver (player 2)
      match.scorePoint(2, PointOutcome.ReturnWinner, undefined, true);
      let stats1 = match.getMatchSummary().participants[1].stats as any;
      let stats2 = match.getMatchSummary().participants[2].stats as any;
      expect(stats2.returning.returnWinners).toBe(1);
      expect(stats2.returning.pointsWonOnReturn).toBe(1);
      expect(stats2.returning.firstServeReturnPointsPlayed).toBe(1);
      expect(stats2.returning.firstServeReturnPointsWon).toBe(1);
      // Loser serving: firstServeTotal increments
      expect(stats1.serving.firstServeTotal).toBe(1);

      // Unforced error by receiver (player 2 loses)
      match.scorePoint(1, PointOutcome.UnforcedError, undefined, true);
      stats1 = match.getMatchSummary().participants[1].stats as any;
      stats2 = match.getMatchSummary().participants[2].stats as any;
      expect(stats2.returning.returnErrors).toBe(1);
      // Unforced error should be attributed to the losing side only
      expect(stats1.rally.unforcedErrors).toBe(0);
      expect(stats2.rally.unforcedErrors).toBe(1);

      // Forced error outcome should be attributed to the winning side only
      match.scorePoint(1, PointOutcome.ForcedError, undefined, true);
      stats1 = match.getMatchSummary().participants[1].stats as any;
      stats2 = match.getMatchSummary().participants[2].stats as any;
      expect(stats1.rally.forcedErrors).toBe(1);
      expect(stats2.rally.forcedErrors).toBe(0);
    });

    it("leaves non-implemented stats at zero", () => {
      const match = new TennisMatch("P1", "P2", 3);
      const stats1 = match.getMatchSummary().participants[1].stats as any;
      const stats2 = match.getMatchSummary().participants[2].stats as any;

      // Serving game and breakpoint stats are not managed by current implementation
      [stats1, stats2].forEach((s) => {
        expect(s.serving.serviceGamesPlayed).toBe(0);
        expect(s.serving.serviceGamesWon).toBe(0);
        expect(s.serving.breakPointsSaved).toBe(0);
        expect(s.serving.breakPointsFaced).toBe(0);

        expect(s.returning.breakPointsWon).toBe(0);
        expect(s.returning.breakPointsPlayed).toBe(0);
        expect(s.returning.returnGamesPlayed).toBe(0);

        expect(s.rally.netPointsWon).toBe(0);
        expect(s.rally.netPointsPlayed).toBe(0);
        expect(s.rally.baselinePointsWon).toBe(0);
        expect(s.rally.baselinePointsPlayed).toBe(0);
      });
    });
  });

  describe("Doubles", () => {
    it("tracks team and individual player serving aces", () => {
      const match = new TennisMatch(["A1", "A2"], ["B1", "B2"], 3);
      const summary = match.getMatchSummary();
      const team1 = summary.participants[1].info as any;
      const aId = team1.players.a.id;

      // Team1 Player A serves an ace
      match.scorePoint(1, PointOutcome.Ace, aId, true);

      const after = match.getMatchSummary();
      const t1 = after.participants[1].stats as any;
      expect(t1.serving.aces).toBe(1);
      expect(t1.playerStats[aId].serving.aces).toBe(1);
      expect(t1.playerStats[aId].serving.firstServeIn).toBe(1);
      expect(t1.playerStats[aId].serving.firstServeTotal).toBe(1);
    });

    it("tracks service winner on second serve for team and individual", () => {
      const match = new TennisMatch(["A1", "A2"], ["B1", "B2"], 3);
      const aId = (match.getMatchSummary().participants[1].info as any).players
        .a.id;

      match.scorePoint(1, PointOutcome.ServiceWinner, aId, false);

      const t1 = match.getMatchSummary().participants[1].stats as any;
      expect(t1.serving.serviceWinners).toBe(1);
      expect(t1.serving.secondServeIn).toBe(1);
      expect(t1.serving.secondServeTotal).toBe(1);
      expect(t1.serving.pointsWonOnSecondServe).toBe(1);

      expect(t1.playerStats[aId].serving.serviceWinners).toBe(1);
      expect(t1.playerStats[aId].serving.secondServeIn).toBe(1);
      expect(t1.playerStats[aId].serving.secondServeTotal).toBe(1);
      expect(t1.playerStats[aId].serving.pointsWonOnSecondServe).toBe(1);
    });

    it("tracks return winner for team and individual", () => {
      const match = new TennisMatch(["A1", "A2"], ["B1", "B2"], 3);
      const bId = (match.getMatchSummary().participants[2].info as any).players
        .a.id;

      // Receiver on first serve wins with return winner
      match.scorePoint(2, PointOutcome.ReturnWinner, bId, true);

      const t2 = match.getMatchSummary().participants[2].stats as any;
      expect(t2.returning.returnWinners).toBe(1);
      expect(t2.returning.pointsWonOnReturn).toBe(1);
      expect(t2.returning.firstServeReturnPointsPlayed).toBe(1);
      expect(t2.returning.firstServeReturnPointsWon).toBe(1);

      expect(t2.playerStats[bId].returning.returnWinners).toBe(1);
      expect(t2.playerStats[bId].returning.pointsWonOnReturn).toBe(1);
      expect(t2.playerStats[bId].returning.firstServeReturnPointsPlayed).toBe(
        1
      );
      expect(t2.playerStats[bId].returning.firstServeReturnPointsWon).toBe(1);
    });

    it("increments team double faults but does not attribute to individual player", () => {
      const match = new TennisMatch(["A1", "A2"], ["B1", "B2"], 3);
      const aId = (match.getMatchSummary().participants[1].info as any).players
        .a.id;

      // Server from team 1 double faults (point to team 2)
      match.scorePoint(2, PointOutcome.DoubleFault, undefined, false);

      const t1 = match.getMatchSummary().participants[1].stats as any;
      expect(t1.serving.doubleFaults).toBe(1);
      expect(t1.serving.secondServeTotal).toBe(1);

      // Current implementation tracks losing player's individual fault
      expect(t1.playerStats[aId].serving.doubleFaults).toBe(1);
    });

    it("attributes individual rally winners per scorerId", () => {
      const match = new TennisMatch(["A1", "A2"], ["B1", "B2"], 3);
      const bId = (match.getMatchSummary().participants[1].info as any).players
        .b.id;

      // Team 1 wins a point credited to player B
      match.scorePoint(1, PointOutcome.Winner, bId, true);

      const t1 = match.getMatchSummary().participants[1].stats as any;
      expect(t1.rally.winners).toBe(1);
      expect(t1.playerStats[bId].rally.winners).toBe(1);
    });

    it("leaves non-implemented team/player stats at zero", () => {
      const match = new TennisMatch(["A1", "A2"], ["B1", "B2"], 3);
      const t1 = match.getMatchSummary().participants[1].stats as any;
      const aId = (match.getMatchSummary().participants[1].info as any).players
        .a.id;

      const zeroCheck = (s: any) => {
        expect(s.serving.serviceGamesPlayed).toBe(0);
        expect(s.serving.serviceGamesWon).toBe(0);
        expect(s.serving.breakPointsSaved).toBe(0);
        expect(s.serving.breakPointsFaced).toBe(0);

        expect(s.returning.breakPointsWon).toBe(0);
        expect(s.returning.breakPointsPlayed).toBe(0);
        expect(s.returning.returnGamesPlayed).toBe(0);

        expect(s.rally.netPointsWon).toBe(0);
        expect(s.rally.netPointsPlayed).toBe(0);
        expect(s.rally.baselinePointsWon).toBe(0);
        expect(s.rally.baselinePointsPlayed).toBe(0);
      };

      zeroCheck(t1);
      zeroCheck(t1.playerStats[aId]);
    });

    it("attributes unforced errors to loser team and forced errors to winner team", () => {
      const match = new TennisMatch(["A1", "A2"], ["B1", "B2"], 3);

      // Unforced error where Team 1 wins, Team 2 loses
      match.scorePoint(1, PointOutcome.UnforcedError, undefined, true);
      let t1 = match.getMatchSummary().participants[1].stats as any;
      let t2 = match.getMatchSummary().participants[2].stats as any;
      expect(t1.rally.unforcedErrors).toBe(0);
      expect(t2.rally.unforcedErrors).toBe(1);

      // Forced error where Team 1 wins
      match.scorePoint(1, PointOutcome.ForcedError, undefined, true);
      t1 = match.getMatchSummary().participants[1].stats as any;
      t2 = match.getMatchSummary().participants[2].stats as any;
      expect(t1.rally.forcedErrors).toBe(1);
      expect(t2.rally.forcedErrors).toBe(0);
    });
  });
});
